import type { Options } from 'easymde';

export interface EasyMDELike {
    value(): string;
    codemirror?: {
        getSelection?: () => string;
        replaceSelection?: (text: string) => void;
    };
}

export interface MarkdownEditorToolbarAction {
    name: string;
    action: (editor: EasyMDELike) => void;
    className: string;
    title: string;
}

export type MarkdownEditorToolbarBuiltin =
    | 'bold'
    | 'italic'
    | 'heading'
    | '|'
    | 'quote'
    | 'unordered-list'
    | 'ordered-list'
    | 'link'
    | 'image'
    | 'preview'
    | 'side-by-side'
    | 'fullscreen'
    | 'guide';

export type MarkdownEditorToolbarItem =
    | MarkdownEditorToolbarBuiltin
    | MarkdownEditorToolbarAction;

export interface MarkdownEditorConfig {
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    autofocus?: boolean;
    spellChecker?: boolean;
    autosave?: boolean;
    autosaveUniqueId?: string;
    status?: boolean | string[];
    previewClass?: string | string[];
    toolbar?: MarkdownEditorToolbarItem[];
    renderingConfig?: Options['renderingConfig'];
}
