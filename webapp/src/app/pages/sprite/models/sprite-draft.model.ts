export interface SpriteDraft {
    sourceId?: string; // 可选，关联的Source ID
    name: string;
    iconSvnPath: string;
    otherImagesSvnPath: string;
    localDir: string; // SVN本地资源目录
    spriteExportDir?: string; // 雪碧图导出目录
    lessExportDir?: string; // 可选，LESS导出目录
    cssPrefix?: string; // 可选，默认为sl
    spriteUrl?: string; // 可选，默认为空
    template?: string; // 可选，默认为空
}