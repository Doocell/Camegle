import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateNsfwPredictions,
  createStrikeTracker,
  calculateAdaptiveInterval,
} from './nsfwLogic.js';

test('F8 Moderation - evaluateNsfwPredictions flags when Porn or Hentai score exceeds 0.7 threshold', () => {
  const safePreds = [
    { className: 'Neutral', probability: 0.88 },
    { className: 'Porn', probability: 0.08 },
    { className: 'Hentai', probability: 0.04 },
  ];
  assert.deepEqual(evaluateNsfwPredictions(safePreds, 0.7), {
    isFlagged: false,
    topCategory: null,
    score: 0.08,
  });

  const unsafePreds = [
    { className: 'Porn', probability: 0.82 },
    { className: 'Neutral', probability: 0.18 },
  ];
  assert.deepEqual(evaluateNsfwPredictions(unsafePreds, 0.7), {
    isFlagged: true,
    topCategory: 'Porn',
    score: 0.82,
  });
});

test('F8 Moderation - strike tracker requires 2 consecutive violations before triggering auto-skip', () => {
  const tracker = createStrikeTracker(2);

  // 1st violation -> strike 1, not triggered yet
  assert.equal(tracker.record(true), false);
  // Safe frame resets consecutive strikes back to 0
  assert.equal(tracker.record(false), false);
  // 1st violation again -> strike 1, not triggered yet
  assert.equal(tracker.record(true), false);
  // 2nd consecutive violation -> triggers action!
  assert.equal(tracker.record(true), true);
});

test('F8 Moderation - adaptive interval slows down check frequency when inference latency is high on mid-range mobile', () => {
  assert.equal(calculateAdaptiveInterval(120, 2000), 2000);
  assert.equal(calculateAdaptiveInterval(450, 2000), 4000);
});
