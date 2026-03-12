export const ISSUE_ATTACHMENT_MIME_PREFIX_ALLOWLIST = ["image/", "video/"] as const;

export const ISSUE_ATTACHMENT_EXT_ALLOWLIST = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".m4v",
    ".3gp",
    ".flv",
    ".wmv",
    ".mpeg",
    ".mpg"
] as const;

export function isAllowedIssueAttachmentType(mimeType: string, fileExt: string | null): boolean {
    if (
        mimeType &&
        ISSUE_ATTACHMENT_MIME_PREFIX_ALLOWLIST.some((prefix) => mimeType.startsWith(prefix))
    ) {
        return true;
    }

    if (!fileExt) {
        return false;
    }

    return ISSUE_ATTACHMENT_EXT_ALLOWLIST.includes(fileExt as (typeof ISSUE_ATTACHMENT_EXT_ALLOWLIST)[number]);
}

export function getIssueAttachmentAcceptString(): string {
    return "image/*,video/*";
}
