import { MarkupNode } from '../models/markup-node.model';

export function buildMarkupTree(source: string): MarkupNode[] {
  const parser = new DOMParser();

  const doc = parser.parseFromString(source, 'text/html');

  return Array.from(doc.body.childNodes)
    .map((node, index) => buildNode(node, `root.${index}`))
    .filter(Boolean) as MarkupNode[];
}

function buildNode(node: Node, path: string): MarkupNode | null {
  // element
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    return {
      type: 'element',

      tagName: element.tagName.toLowerCase(),

      path,

      selfClosing: element.children.length === 0 && !element.textContent?.trim(),

      attributes: Array.from(element.attributes).map((attr) => ({
        name: attr.name,
        value: attr.value,
      })),

      children: Array.from(element.childNodes)
        .map((child, index) => buildNode(child, `${path}.${index}`))
        .filter(Boolean) as MarkupNode[],
    };
  }

  // text
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();

    if (!text) {
      return null;
    }

    return {
      type: 'text',
      textContent: text,
      path,
    };
  }

  // comment
  if (node.nodeType === Node.COMMENT_NODE) {
    return {
      type: 'comment',
      textContent: node.textContent ?? '',
      path,
    };
  }

  return null;
}
