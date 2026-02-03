import os from "node:os";
import path from "node:path";

export function getNgmHomeDir() {
    return path.join(os.homedir(), ".ng-manager");
}

export function getNgmSpriteRoot() {
    return path.join(getNgmHomeDir(), "sprites");
}

export function getNgmSpriteCssRoot() {
    return path.join(getNgmHomeDir(), "sprite-css");
}

export function resolveProjectSpriteDir(projectId: string) {
    return path.join(getNgmSpriteRoot(), projectId);
}

export function resolveProjectGroupOutDir(projectId: string, group: string) {
    // 可以不分 group 子目录，直接扁平放到 projectId 下
    // projectId 下面直接 group.png/meta/less
    return resolveProjectSpriteDir(projectId);
}

export function resolveProjectSpriteFileName(group: string) {
    return `${group}.png`;
}

export function resolveProjectSpriteUrl(projectId: string, group: string) {
    // server 静态映射后即可用这个 URL
    return `/sprites/${projectId}/${group}.png`;
}
