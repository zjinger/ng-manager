export type MarkupNodeType = 'element' | 'text' | 'comment';

export interface MarkupAttribute {
  name: string;
  value: string;
}

export interface MarkupNode {
  type: MarkupNodeType;

  tagName?: string;

  textContent?: string;

  attributes?: MarkupAttribute[];

  children?: MarkupNode[];

  selfClosing?: boolean;

  path: string;
}
