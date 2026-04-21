/**
 * 比较两个版本字符串的大小
 * @returns >0 如果 v1 > v2；<0 如果 v1 < v2；0 如果相等
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) {
      return p1 - p2;
    }
  }

  return 0;
}

/**
 * 检查版本是否满足 caret 范围要求
 * @param version 版本字符串（如 "14.17.0"）
 * @param required caret 范围字符串（如 "^14.0.0"）
 * @returns 是否满足要求
 */
function satisfiesCaret(version: string, required: string): boolean {
  const versionParts = version.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  if (versionParts[0] !== requiredParts[0]) {
    return false;
  }

  if (versionParts[0] === 0) {
    return versionParts[1] === requiredParts[1] && versionParts[2] >= requiredParts[2];
  }

  return versionParts[1] > requiredParts[1] || (versionParts[1] === requiredParts[1] && versionParts[2] >= requiredParts[2]);
}

/**
 * 检查版本是否满足 tilde 范围要求
 * @param version 版本字符串（如 "14.17.0"）
 * @param required tilde 范围字符串（如 "~14.17.0"）
 * @returns 是否满足要求
 */
function satisfiesTilde(version: string, required: string): boolean {
  const versionParts = version.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  if (versionParts[0] !== requiredParts[0] || versionParts[1] !== requiredParts[1]) {
    return false;
  }

  return versionParts[2] >= requiredParts[2];
}

/**
 * 检查单个版本范围是否满足
 * @param version 版本字符串（如 "14.17.0"）
 * @param range 范围字符串（如 "^14.0.0"、">=14.0.0" 等）
 * @returns 是否满足范围要求
 */
function satisfiesSingleRange(version: string, range: string): boolean {
  range = range.trim();
  // 当前版本去掉前缀 v
  const cleanVersion = version.replace(/^v/, '');

  if (range.startsWith('>=')) {
    return compareVersions(cleanVersion, range.substring(2)) >= 0;
  } else if (range.startsWith('<=')) {
    return compareVersions(cleanVersion, range.substring(2)) <= 0;
  } else if (range.startsWith('>')) {
    return compareVersions(cleanVersion, range.substring(1)) > 0;
  } else if (range.startsWith('<')) {
    return compareVersions(cleanVersion, range.substring(1)) < 0;
  } else if (range.startsWith('^')) {
    const required = range.substring(1);
    return satisfiesCaret(cleanVersion, required);
  } else if (range.startsWith('~')) {
    const required = range.substring(1);
    return satisfiesTilde(cleanVersion, required);
  } else if (range.startsWith('=')) {
    const required = range.substring(1).trim();
    // 没有 . 则表示匹配主版本
    if (!required.includes('.')) { 
      const result = cleanVersion.startsWith(required + '.') || cleanVersion === required;
      return result;
    }
    return cleanVersion === required;
  } else if (range === '*' || range === 'x' || range === 'X') {
    return true;
  } else {
    return cleanVersion === range;
  }
}

/**
 * 检查版本是否满足要求（支持 || 组合）
 * @param version 版本字符串（如 "14.17.0"）
 * @param requirement 版本要求字符串（如 ">=14.0.0" 或 "^14.0.0 || ^16.0.0"）
 * @returns 是否满足要求
 */
export function satisfiesVersion(version: string, requirement: string): boolean {
  const cleanVersion = version.replace(/^v/, '');

  const rangeParts = requirement.split('||').map(r => r.trim());

  for (const range of rangeParts) {
    if (satisfiesSingleRange(cleanVersion, range)) {
      return true;
    }
  }

  return false;
}

/**
 * 计算版本匹配度得分
 * @param version 版本字符串（如 "14.17.0"）
 * @param requirement 版本要求字符串（如 "^14.0.0"）
 * @returns 匹配度得分
 */
function calculateMatchScore(version: string, requirement: string): number {
  const cleanVersion = version.replace(/^v/, '');
  const versionParts = cleanVersion.split('.').map(Number);

  if (requirement.startsWith('^')) {
    const required = requirement.substring(1).split('.').map(Number);
    let score = 1000;
    if (versionParts[0] === required[0]) score += 100;
    if (versionParts[1] === required[1]) score += 50;
    score += (versionParts[2] - required[2]) * 10;
    return score;
  } else if (requirement.startsWith('~')) {
    const required = requirement.substring(1).split('.').map(Number);
    let score = 1000;
    if (versionParts[0] === required[0] && versionParts[1] === required[1]) score += 100;
    score += (versionParts[2] - required[2]) * 10;
    return score;
  } else if (requirement.startsWith('>=')) {
    const required = requirement.substring(2).split('.').map(Number);
    let score = 1000;
    score -= (versionParts[0] - required[0]) * 100;
    score -= (versionParts[1] - required[1]) * 10;
    score -= versionParts[2] - required[2];
    return Math.max(0, score);
  }

  return 1000;
}

/**
 * 从可用版本中找到最佳匹配版本
 * @param available 可用版本数组（如 ["14.17.0", "14.18.0", "15.0.0"]）
 * @param requirement 版本要求字符串（如 "^14.0.0"）
 * @returns 最佳匹配版本字符串（如 "14.17.0"）或 null（如果未找到匹配）
 */
export function findBestMatchingVersion(available: string[], requirement: string): string | null {
  const matching: Array<{ version: string; score: number }> = [];

  console.log('[DEBUG] findBestMatchingVersion - available:', available, 'requirement:', requirement);

  for (const version of available) {
    if (satisfiesVersion(version, requirement)) {
      const score = calculateMatchScore(version, requirement);
      matching.push({ version, score });
      console.log('[DEBUG] Match found:', version, 'score:', score);
    }
  }

  if (matching.length === 0) {
    console.log('[DEBUG] No matching versions found');
    return null;
  }

  matching.sort((a, b) => b.score - a.score);
  console.log('[DEBUG] Best match:', matching[0].version);
  return matching[0].version;
}
