// Compares what the learner said (speech recognition transcript) with the
// target phrase, word by word. Works in the browser and in Node tests.

export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Longest-common-subsequence alignment between target and spoken words.
 * @returns {{score: number, words: {word: string, ok: boolean}[]}}
 */
export function scorePronunciation(target, spoken) {
  const t = normalize(target);
  const s = normalize(spoken);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = s.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === s[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Set();
  let i = 0;
  let j = 0;
  while (i < t.length && j < s.length) {
    if (t[i] === s[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  // Extra words the learner added lower the score a little.
  const extra = Math.max(0, s.length - matched.size);
  const denom = t.length + extra * 0.5;
  const score = denom === 0 ? 0 : Math.round((matched.size / denom) * 100);

  const display = target.split(/\s+/).filter(Boolean);
  return {
    score,
    words: display.map((word, k) => ({ word, ok: matched.has(k) })),
  };
}
