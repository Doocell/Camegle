import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';
import {
  NSFW_CONFIG,
  evaluateNsfwPredictions,
  createStrikeTracker,
  calculateAdaptiveInterval,
} from './nsfwLogic.js';

let cachedModelPromise = null;

/**
 * Lazy-loads TensorFlow.js + NSFWJS in the browser without blocking initial bundle load.
 * If external scripts cannot be loaded (e.g. offline/adblock), falls back to a safe no-op classifier
 * that still exposes a manual test trigger on window.__CAMELGLE_SIMULATE_NSFW__.
 */
function loadNsfwModelLazy() {
  if (cachedModelPromise) return cachedModelPromise;

  cachedModelPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    if (window.nsfwjs && typeof window.nsfwjs.load === 'function') {
      window.nsfwjs
        .load()
        .then((model) => resolve(model))
        .catch(() => resolve(null));
      return;
    }

    const loadScript = (src) =>
      new Promise((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          res();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => res();
        script.onerror = (err) => rej(err);
        document.head.appendChild(script);
      });

    loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js'))
      .then(() => {
        if (window.nsfwjs && typeof window.nsfwjs.load === 'function') {
          return window.nsfwjs.load();
        }
        return null;
      })
      .then((model) => resolve(model))
      .catch(() => resolve(null));
  });

  return cachedModelPromise;
}

/**
 * F8 — Nudity Detection & Initial 2s Blur Hook
 * Reads <video> via remoteVideoRef without touching `call` module internals.
 *
 * @param {React.RefObject<HTMLVideoElement>} remoteVideoRef
 * @param {object} options
 * @param {string|null} options.roomId
 * @param {boolean} options.isActive
 * @param {(violation: { category: string, score: number }) => void} [options.onViolation]
 */
export function useNsfwGuard(remoteVideoRef, { roomId, isActive, onViolation } = {}) {
  const [isInitialBlur, setIsInitialBlur] = useState(false);
  const [isViolationBlur, setIsViolationBlur] = useState(false);
  const [moderationNotice, setModerationNotice] = useState(null);
  const [modelReady, setModelReady] = useState(false);

  const modelRef = useRef(null);
  const simulatedPredictionRef = useRef(null);

  // Lazy-load NSFWJS model after mount so initial page load is never blocked
  useEffect(() => {
    let mounted = true;
    const idleCallback =
      typeof window !== 'undefined' && window.requestIdleCallback
        ? window.requestIdleCallback
        : (cb) => setTimeout(cb, 800);

    const handle = idleCallback(async () => {
      const model = await loadNsfwModelLazy();
      if (mounted) {
        modelRef.current = model;
        setModelReady(Boolean(model));
      }
    });

    // Expose dev/test helper in browser console to verify 2-strike auto-skip easily
    if (typeof window !== 'undefined') {
      window.__CAMELGLE_SIMULATE_NSFW__ = (className = 'Porn', probability = 0.92) => {
        simulatedPredictionRef.current = [{ className, probability }];
      };
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined' && window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  // 2-second initial safety blur on every new room connection
  useEffect(() => {
    if (!roomId || !isActive) {
      setIsInitialBlur(false);
      setIsViolationBlur(false);
      return;
    }

    setIsInitialBlur(true);
    setIsViolationBlur(false);

    const timer = setTimeout(() => {
      setIsInitialBlur(false);
    }, NSFW_CONFIG.INITIAL_BLUR_MS);

    return () => clearTimeout(timer);
  }, [roomId, isActive]);

  const dismissNotice = useCallback(() => {
    setModerationNotice(null);
  }, []);

  // Periodic classification loop every 2s (adapts to 4s if inference takes > 400ms)
  useEffect(() => {
    if (!roomId || !isActive) return;

    let cancelled = false;
    let timeoutId = null;
    const tracker = createStrikeTracker(NSFW_CONFIG.REQUIRED_STRIKES);

    const runCheck = async () => {
      if (cancelled) return;

      let nextIntervalMs = NSFW_CONFIG.BASE_INTERVAL_MS;
      const videoEl = remoteVideoRef?.current;

      if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        const startMs = performance.now();
        try {
          let predictions = null;

          if (simulatedPredictionRef.current) {
            predictions = simulatedPredictionRef.current;
          } else if (modelRef.current && typeof modelRef.current.classify === 'function') {
            predictions = await modelRef.current.classify(videoEl);
          }

          const durationMs = performance.now() - startMs;
          nextIntervalMs = calculateAdaptiveInterval(durationMs);

          if (predictions && !cancelled) {
            const evaluation = evaluateNsfwPredictions(predictions, NSFW_CONFIG.THRESHOLD);
            const shouldTriggerAction = tracker.record(evaluation.isFlagged);

            if (shouldTriggerAction) {
              const category = evaluation.topCategory || 'NSFW';
              simulatedPredictionRef.current = null;
              setIsViolationBlur(true);
              setModerationNotice({
                category,
                score: evaluation.score,
                message:
                  'Pelindung AI Camelgle mendeteksi konten tidak pantas dari lawan bicara dan otomatis melewati sesi ini.',
              });

              socket.emit(EVENTS.MODERATION_FLAG, {
                roomId,
                type: `AI_${category.toUpperCase()}`,
                score: evaluation.score,
              });

              if (typeof onViolation === 'function') {
                onViolation({
                  category,
                  score: evaluation.score,
                });
              }
              return;
            }
          }
        } catch {
          // Ignore transient frame classification errors
        }
      }

      if (!cancelled) {
        timeoutId = setTimeout(runCheck, nextIntervalMs);
      }
    };

    timeoutId = setTimeout(runCheck, NSFW_CONFIG.BASE_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [roomId, isActive, remoteVideoRef, onViolation]);

  return {
    isBlurred: isInitialBlur || isViolationBlur,
    isInitialBlur,
    isViolationBlur,
    moderationNotice,
    dismissNotice,
    modelReady,
  };
}
