import { ProjectType } from '../managers/manager.types';

export interface DetectedFramework {
  type: ProjectType;
  majorVersion: number | null;
}

export function detectFramework(pkg: Record<string, unknown>): DetectedFramework {
  const angularMajor = detectAngularMajor(pkg);
  if (angularMajor !== null) {
    return { type: ProjectType.Angular, majorVersion: angularMajor };
  }

  const vueMajor = detectVueMajor(pkg);
  if (vueMajor !== null) {
    return { type: ProjectType.Vue, majorVersion: vueMajor };
  }

  return { type: ProjectType.Unknown, majorVersion: null };
}

function detectAngularMajor(pkg: Record<string, unknown>): number | null {
  const deps = { ...((pkg['dependencies'] as Record<string, string>) ?? {}) };
  const devDeps = { ...((pkg['devDependencies'] as Record<string, string>) ?? {}) };
  const all = { ...deps, ...devDeps };

  for (const [dep, version] of Object.entries(all)) {
    if (dep === '@angular/core' && typeof version === 'string') {
      const match = version.match(/^[\^~]?(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

function detectVueMajor(pkg: Record<string, unknown>): number | null {
  const deps = { ...((pkg['dependencies'] as Record<string, string>) ?? {}) };
  const devDeps = { ...((pkg['devDependencies'] as Record<string, string>) ?? {}) };
  const all = { ...deps, ...devDeps };

  for (const [dep, version] of Object.entries(all)) {
    if ((dep === 'vue' || dep === '@vue/runtime-core') && typeof version === 'string') {
      const match = version.match(/^[\^~]?(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}
