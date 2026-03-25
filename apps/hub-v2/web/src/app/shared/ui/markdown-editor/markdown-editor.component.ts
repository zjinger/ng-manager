import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ControlValueAccessor,
    FormsModule,
    NG_VALUE_ACCESSOR
} from '@angular/forms';
import EasyMDE, { type Options } from 'easymde';
import { Observable, firstValueFrom, isObservable } from 'rxjs';

import type {
    EasyMDELike,
    MarkdownEditorConfig,
    MarkdownEditorToolbarItem
} from './markdown-editor.types';

@Component({
    selector: 'app-markdown-editor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './markdown-editor.component.html',
    styleUrls: ['./markdown-editor.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MarkdownEditorComponent),
            multi: true
        }
    ]
})
export class MarkdownEditorComponent
    implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
    @ViewChild('editorHost', { static: true })
    editorHost!: ElementRef<HTMLTextAreaElement>;

    @Input() config: MarkdownEditorConfig = {};

    @Input() placeholder = '请输入 Markdown 内容';

    @Input() minHeight = '320px';

    @Input() readonly = false;

    @Input() disabled = false;

    @Input() autofocus = false;

    @Input() toolbar?: MarkdownEditorToolbarItem[];

    @Input() imageUploadHandler?: (file: File) => Promise<string> | Observable<string> | string;

    @Output() contentChange = new EventEmitter<string>();

    @Output() ready = new EventEmitter<EasyMDE>();

    @Output() imageUploadFailed = new EventEmitter<string>();

    private editor?: EasyMDE;
    private innerValue = '';
    private initialized = false;
    private suppressChange = false;
    private uploadingImage = false;

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    ngAfterViewInit(): void {
        this.initEditor();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.initialized || !this.editor) {
            return;
        }

        if (changes['readonly'] || changes['disabled']) {
            this.setEditorReadonlyState();
        }

        if (changes['minHeight'] || changes['config']) {
            this.applyMinHeight();
        }
    }

    writeValue(value: string | null): void {
        const nextValue = value ?? '';
        this.innerValue = nextValue;

        if (this.editor && this.editor.value() !== nextValue) {
            this.suppressChange = true;
            this.editor.value(nextValue);
            this.suppressChange = false;
        }
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        this.setEditorReadonlyState();
    }

    ngOnDestroy(): void {
        if (this.editor) {
            this.editor.toTextArea();
            this.editor = undefined;
        }
    }

    getValue(): string {
        return this.editor?.value() ?? this.innerValue;
    }

    setValue(value: string): void {
        this.writeValue(value);
        this.emitValue(value);
    }

    insertText(text: string): void {
        const cm = this.editor?.codemirror;
        if (!cm || typeof cm.replaceSelection !== 'function') {
            return;
        }

        cm.replaceSelection(text);
        const value = this.editor?.value() ?? '';
        this.emitValue(value);
    }

    wrapSelection(before: string, after = before): void {
        const cm = this.editor?.codemirror;
        if (
            !cm ||
            typeof cm.getSelection !== 'function' ||
            typeof cm.replaceSelection !== 'function'
        ) {
            return;
        }

        const selected = cm.getSelection() || '';
        cm.replaceSelection(`${before}${selected}${after}`);

        const value = this.editor?.value() ?? '';
        this.emitValue(value);
    }

    private initEditor(): void {
        const options: Options = {
            element: this.editorHost.nativeElement,
            initialValue: this.innerValue,
            autofocus: this.config.autofocus ?? this.autofocus,
            placeholder: this.config.placeholder ?? this.placeholder,
            spellChecker: this.config.spellChecker ?? false,
            status: this.config.status ?? false,
            minHeight: this.config.minHeight ?? this.minHeight,
            previewClass: this.config.previewClass,
            renderingConfig: this.config.renderingConfig,
            toolbar: this.mapToolbar(
                this.toolbar ?? this.config.toolbar ?? this.getDefaultToolbar()
            ),
            autosave: this.resolveAutosaveConfig()
        };

        this.editor = new EasyMDE(options);
        this.initialized = true;

        this.setEditorReadonlyState();
        this.applyMinHeight();
        this.bindEvents();

        this.ready.emit(this.editor);
    }

    private bindEvents(): void {
        if (!this.editor) {
            return;
        }

        const cm = this.editor.codemirror;

        cm.on('change', () => {
            if (this.suppressChange) {
                return;
            }

            const value = this.editor?.value() ?? '';
            this.innerValue = value;
            this.onChange(value);
            this.contentChange.emit(value);
        });

        cm.on('blur', () => {
            this.onTouched();
        });

        cm.on('paste', (_instance: unknown, event: ClipboardEvent) => {
            if (!this.imageUploadHandler || this.disabled || this.readonly) {
                return;
            }
            const imageFile = this.extractImageFromClipboard(event);
            if (!imageFile) {
                return;
            }
            event.preventDefault();
            void this.uploadImageAndInsert(imageFile);
        });
    }

    private emitValue(value: string): void {
        this.innerValue = value;
        this.onChange(value);
        this.contentChange.emit(value);
    }

    private setEditorReadonlyState(): void {
        if (!this.editor?.codemirror) {
            return;
        }

        const isReadonly = this.disabled || this.readonly;

        this.editor.codemirror.setOption(
            'readOnly',
            isReadonly ? 'nocursor' : false
        );
    }

    private applyMinHeight(): void {
        if (!this.editor?.codemirror) {
            return;
        }

        const wrapper = this.editor.codemirror.getWrapperElement();
        const scroll = wrapper.querySelector('.CodeMirror-scroll') as HTMLElement | null;
        const toolbar = wrapper.parentElement?.querySelector('.editor-toolbar') as HTMLElement | null;

        const minHeight = this.config.minHeight ?? this.minHeight;

        wrapper.style.minHeight = minHeight;

        if (scroll) {
            scroll.style.minHeight = minHeight;
        }

        if (toolbar) {
            toolbar.style.borderRadius = '10px 10px 0 0';
        }
    }

    private resolveAutosaveConfig(): Options['autosave'] | undefined {
        const autosaveEnabled = this.config.autosave ?? false;

        if (!autosaveEnabled) {
            return undefined;
        }

        return {
            enabled: true,
            uniqueId: this.config.autosaveUniqueId ?? 'markdown-editor',
            delay: 1000
        };
    }

    private getDefaultToolbar(): MarkdownEditorToolbarItem[] {
        return [
            'bold',
            'italic',
            'heading',
            '|',
            'quote',
            'unordered-list',
            'ordered-list',
            '|',
            'link',
            'image',
            '|',
            'preview',
            'side-by-side',
            'fullscreen',
            '|',
            'guide'
        ];
    }

    private mapToolbar(
        toolbar: MarkdownEditorToolbarItem[]
    ): NonNullable<Options['toolbar']> {
        return toolbar.map((item) => {
            if (typeof item === 'string') {
                if (item === 'image' && this.imageUploadHandler) {
                    return {
                        name: 'image',
                        action: () => {
                            void this.pickImageAndUpload();
                        },
                        className: 'fa fa-picture-o',
                        title: '上传图片'
                    };
                }
                return item;
            }

            return {
                name: item.name,
                action: (editor: EasyMDE) =>
                    item.action(editor as unknown as EasyMDELike),
                className: item.className,
                title: item.title
            };
        });
    }

    private extractImageFromClipboard(event: ClipboardEvent): File | null {
        const items = event.clipboardData?.items;
        if (!items) {
            return null;
        }
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            if (item.kind !== 'file' || !item.type.startsWith('image/')) {
                continue;
            }
            const file = item.getAsFile();
            if (file) {
                return file;
            }
        }
        return null;
    }

    private async pickImageAndUpload(): Promise<void> {
        if (!this.imageUploadHandler || this.uploadingImage || this.disabled || this.readonly) {
            return;
        }
        const file = await this.pickImageFile();
        if (!file) {
            return;
        }
        await this.uploadImageAndInsert(file);
    }

    private pickImageFile(): Promise<File | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = () => {
                const file = input.files?.[0] ?? null;
                input.remove();
                resolve(file);
            };
            document.body.appendChild(input);
            input.click();
        });
    }

    private async uploadImageAndInsert(file: File): Promise<void> {
        if (!this.imageUploadHandler || this.uploadingImage) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            this.imageUploadFailed.emit('仅支持图片文件');
            return;
        }
        this.uploadingImage = true;
        try {
            const url = await this.resolveImageUrl(this.imageUploadHandler(file));
            this.insertMarkdownImage(url, file.name || 'image');
        } catch (error) {
            const message = error instanceof Error ? error.message : '图片上传失败';
            this.imageUploadFailed.emit(message);
        } finally {
            this.uploadingImage = false;
        }
    }

    private insertMarkdownImage(url: string, altText: string): void {
        const cm = this.editor?.codemirror;
        if (!cm || typeof cm.replaceSelection !== 'function') {
            return;
        }
        const escapedAlt = altText.replace(/]/g, '');
        cm.replaceSelection(`![${escapedAlt}](${url})`);
        const value = this.editor?.value() ?? '';
        this.emitValue(value);
    }

    private async resolveImageUrl(
        value: Promise<string> | Observable<string> | string
    ): Promise<string> {
        if (typeof value === 'string') {
            return value;
        }
        if (isObservable(value)) {
            return firstValueFrom(value);
        }
        return value;
    }
}
