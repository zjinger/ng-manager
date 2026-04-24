/**
 * Sprite 错误码 (7XXXX)
 * 注意: 实际码定义在 core.error-codes.ts (7XXXX)
 * 此文件提供独立导入路径
 */
export const SpriteErrorCodes = {
  SPRITE_CONFIG_NOT_FOUND: 70001,
  SPRITE_GROUP_NOT_FOUND: 70002,
  SPRITE_ICONS_ROOT_NOT_FOUND: 70003,
} as const;

export type SpriteErrorCode = typeof SpriteErrorCodes[keyof typeof SpriteErrorCodes];
