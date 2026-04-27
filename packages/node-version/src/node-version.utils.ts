export function compareVersions(v1: string, v2: string): number {
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

// ^x.y.z 语义：主版本相同，允许次版本和补丁升级
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

// ~x.y.z 语义：主次版本相同，允许补丁升级
function satisfiesTilde(version: string, required: string): boolean {
  const versionParts = version.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  if (versionParts[0] !== requiredParts[0] || versionParts[1] !== requiredParts[1]) {
    return false;
  }

  return versionParts[2] >= requiredParts[2];
}

// 单个版本范围（不含 ||）是否满足
function satisfiesSingleRange(version: string, range: string): boolean {
  range = range.trim();
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
    return satisfiesCaret(cleanVersion, range.substring(1));
  } else if (range.startsWith('~')) {
    return satisfiesTilde(cleanVersion, range.substring(1));
  } else if (range.startsWith('=')) {
    const required = range.substring(1).trim();
    if (!required.includes('.')) {
      const result = cleanVersion.startsWith(required + '.') || cleanVersion === required;
      return result;
    }
    return cleanVersion === required;
  } else if (range === '*' || range === 'x' || range === 'X') {  // 通配符
    return true;
  } else {
    return cleanVersion === range;
  }
}

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

// 计算版本对需求的匹配得分，用于 findBestMatchingVersion 排序
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

export function findBestMatchingVersion(available: string[], requirement: string): string | null {
  const matching: Array<{ version: string; score: number }> = [];

  for (const version of available) {
    if (satisfiesVersion(version, requirement)) {
      const score = calculateMatchScore(version, requirement);
      matching.push({ version, score });
    }
  }

  if (matching.length === 0) {
    return null;
  }

  matching.sort((a, b) => b.score - a.score);
  return matching[0].version;
}
