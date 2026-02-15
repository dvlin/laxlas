/**
 * Character-level LCS diff for spelling comparison.
 * Returns array of { char, status } where status is 'correct', 'missing', or 'extra'.
 * - 'correct': character matches
 * - 'missing': character is in the correct word but missing from the attempt
 * - 'extra': character is in the attempt but not in the correct word
 */
export function compare(attempt, correct) {
  const a = attempt.trim().toLowerCase().normalize('NFC');
  const c = correct.trim().toLowerCase().normalize('NFC');

  if (a === c) {
    return c.split('').map((ch) => ({ char: ch, status: 'correct' }));
  }

  const m = a.length;
  const n = c.length;

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === c[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === c[j - 1]) {
      result.unshift({ char: c[j - 1], status: 'correct' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ char: c[j - 1], status: 'missing' });
      j--;
    } else {
      result.unshift({ char: a[i - 1], status: 'extra' });
      i--;
    }
  }

  return result;
}

export function isCorrect(attempt, correct) {
  return (
    attempt.trim().toLowerCase().normalize('NFC') ===
    correct.trim().toLowerCase().normalize('NFC')
  );
}
