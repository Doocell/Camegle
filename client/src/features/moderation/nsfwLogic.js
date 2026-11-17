/**
 * F8: Logika Evaluasi Deteksi NSFW & Pelacak Strike Berturut-turut
 */

export const NSFW_CONFIG = {
  INITIAL_BLUR_MS: 2000,
  BASE_INTERVAL_MS: 2000,
  THRESHOLD: 0.7,
  REQUIRED_STRIKES: 2,
};

const UNSAFE_CATEGORIES = ['Porn', 'Hentai'];

/**
 * Mengevaluasi hasil klasifikasi NSFWJS terhadap ambang batas (default 0.7).
 */
export function evaluateNsfwPredictions(predictions = [], threshold = 0.7) {
  let highestScore = 0;
  let flaggedCategory = null;

  for (const item of predictions) {
    if (UNSAFE_CATEGORIES.includes(item.className)) {
      if (item.probability > highestScore) {
        highestScore = item.probability;
      }
      if (item.probability >= threshold && !flaggedCategory) {
        flaggedCategory = item.className;
      }
    }
  }

  return {
    isFlagged: Boolean(flaggedCategory),
    topCategory: flaggedCategory,
    score: highestScore,
  };
}

/**
 * Melacak jumlah pelanggaran berturut-turut (default wajib 2 kali berturut-turut sebelum auto-skip).
 */
export function createStrikeTracker(requiredConsecutiveStrikes = 2) {
  let strikes = 0;
  return {
    record(isFlagged) {
      if (isFlagged) {
        strikes += 1;
      } else {
        strikes = 0;
      }
      return strikes >= requiredConsecutiveStrikes;
    },
    reset() {
      strikes = 0;
    },
  };
}

/**
 * Menyesuaikan interval pengecekan otomatis jika durasi inferensi terlalu berat (>400ms)
 * agar tidak membuat video patah-patah di HP kelas menengah.
 */
export function calculateAdaptiveInterval(inferenceDurationMs, baseIntervalMs = 2000) {
  if (inferenceDurationMs > 400) {
    return baseIntervalMs * 2;
  }
  return baseIntervalMs;
}
