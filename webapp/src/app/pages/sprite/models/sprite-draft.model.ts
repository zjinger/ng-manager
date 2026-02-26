export interface SpriteDraft {
    name: string;
    iconSvnPath: string;
    otherImagesSvnPath: string;
    cssPrefix?: string; // 可选，默认为sl
    spriteUrl?: string; // 可选，默认为空
    template?: string; // 可选，默认为空
}