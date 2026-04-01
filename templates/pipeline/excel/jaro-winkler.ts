/**
 * Compute Jaro similarity between two strings.
 * Returns value between 0 (no match) and 1 (exact match).
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow =
    Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Compute Jaro-Winkler similarity.
 * Gives bonus weight to common prefixes (up to 4 chars).
 * @param p - Winkler scaling factor (default 0.1, max 0.25)
 */
export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  p = 0.1,
): number {
  const jaroScore = jaroSimilarity(s1, s2);

  // Find common prefix length (max 4)
  let prefixLength = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaroScore + prefixLength * p * (1 - jaroScore);
}

/**
 * Compute position similarity between two column positions.
 * Returns value between 0 and 1.
 */
export function positionSimilarity(
  pos1: number,
  pos2: number,
  totalColumns: number,
): number {
  if (totalColumns <= 1) return 1;
  const distance = Math.abs(pos1 - pos2);
  return 1 - distance / (totalColumns - 1);
}

/**
 * Compute data fingerprint similarity.
 * Compares the overlap of sample values between two columns.
 */
export function dataFingerprintSimilarity(
  values1: unknown[],
  values2: unknown[],
): number {
  if (values1.length === 0 || values2.length === 0) return 0;

  const set1 = new Set(values1.map(String));
  const set2 = new Set(values2.map(String));

  let intersection = 0;
  for (const v of set1) {
    if (set2.has(v)) intersection++;
  }

  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union; // Jaccard index
}

/**
 * Combined column matching score using weighted components.
 * Weights from architecture doc: string 50%, position 20%, data fingerprint 30%.
 */
export interface ColumnMatchScore {
  score: number;
  stringScore: number;
  positionScore: number;
  dataScore: number;
  isLikelyRename: boolean; // score > 0.85
  isPossibleRename: boolean; // score > 0.70
}

export function computeColumnMatchScore(
  oldName: string,
  newName: string,
  oldPosition: number,
  newPosition: number,
  totalColumns: number,
  oldValues: unknown[],
  newValues: unknown[],
  weights = { string: 0.5, position: 0.2, data: 0.3 },
): ColumnMatchScore {
  const stringScore = jaroWinklerSimilarity(
    oldName.toLowerCase(),
    newName.toLowerCase(),
  );
  const posScore = positionSimilarity(oldPosition, newPosition, totalColumns);
  const dataScore = dataFingerprintSimilarity(oldValues, newValues);

  const score =
    stringScore * weights.string +
    posScore * weights.position +
    dataScore * weights.data;

  return {
    score,
    stringScore,
    positionScore: posScore,
    dataScore,
    isLikelyRename: score > 0.85,
    isPossibleRename: score > 0.7,
  };
}
