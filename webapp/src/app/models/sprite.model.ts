import type {
    BrowseEntriesDto,
    BrowseFilesDto,
    GenerateGroupResult as GenerateGroupResultDto,
    GenerateSpriteOptionsDto,
    GenerateSpriteResultDto,
    SaveSpriteConfigBodyDto,
    SaveSpriteConfigResponseDto,
    SpriteClassMeta as SpriteClassMetaDto,
    SpriteConfigDto,
    SpriteEntryDto,
    SpriteGroupItemDto,
    SpriteGroupStatus as SpriteGroupStatusDto,
    SpriteMetaFile as SpriteMetaFileDto,
    SpriteSnapshotDto,
    SpritesmithOptionsAlgorithm as SpritesmithOptionsAlgorithmDto,
    SvgIconMeta as SvgIconMetaDto,
    SvgMetaFile as SvgMetaFileDto,
} from "@yinuo-ngm/protocol";

export type SpritesmithOptionsAlgorithm = SpritesmithOptionsAlgorithmDto;
export type SpriteGroupStatus = SpriteGroupStatusDto;
export type SpriteConfig = SpriteConfigDto;
export type SpriteClassMeta = SpriteClassMetaDto;
export type SvgIconMeta = SvgIconMetaDto;
export type SpriteMetaFile = SpriteMetaFileDto;
export type SvgMetaFile = SvgMetaFileDto;
export type GenerateGroupResult = GenerateGroupResultDto;
export type SpriteGroupItem = SpriteGroupItemDto;
export type SpriteSnapshot = SpriteSnapshotDto;
export type GenerateSpriteResult = GenerateSpriteResultDto;
export type SpriteBrowseEntry = SpriteEntryDto;
export type SpriteBrowseResult = BrowseEntriesDto | BrowseFilesDto;
export type GenerateSpriteOptions = GenerateSpriteOptionsDto;
export type SaveSpriteConfigBody = SaveSpriteConfigBodyDto;
export type SaveSpriteConfigResponse = SaveSpriteConfigResponseDto;
