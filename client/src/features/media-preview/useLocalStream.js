import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook F2: useLocalStream()
 * Satu-satunya tempat yang boleh memanggil navigator.mediaDevices.getUserMedia (PRD F2).
 * Mengembalikan { stream, error, errorType, isLoading, retry } untuk dipakai fitur lain (F4, F5).
 */
export function useLocalStream() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'denied' | 'not-found' | 'in-use' | 'unknown'
  const [isLoading, setIsLoading] = useState(true);
  const streamRef = useRef(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const requestMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser Anda tidak mendukung akses kamera/mikrofon (WebRTC). Pastikan menggunakan HTTPS atau localhost.');
      setErrorType('unknown');
      setIsLoading(false);
      return;
    }

    stopTracks();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      setErrorType(null);
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorType('denied');
        setError('Izin akses kamera dan mikrofon ditolak. Silakan izinkan akses pada pengaturan gembok URL browser Anda.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorType('not-found');
        setError('Perangkat kamera atau mikrofon tidak ditemukan pada perangkat Anda.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorType('in-use');
        setError('Kamera atau mikrofon sedang dipakai oleh aplikasi lain (misal Zoom/OBS/tab lain). Tutup aplikasi tersebut lalu coba lagi.');
      } else {
        setErrorType('unknown');
        setError(`Gagal mengakses kamera/mikrofon: ${err?.message || 'Kesalahan tidak diketahui'}`);
      }
      setStream(null);
    } finally {
      setIsLoading(false);
    }
  }, [stopTracks]);

  useEffect(() => {
    requestMedia();
    return () => {
      stopTracks();
    };
  }, [requestMedia, stopTracks]);

  return {
    stream,
    error,
    errorType,
    isLoading,
    retry: requestMedia,
  };
}

export default useLocalStream;
