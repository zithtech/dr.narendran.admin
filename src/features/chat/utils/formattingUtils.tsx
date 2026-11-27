import React from 'react';

/**
 * Strips HTML formatting tags and markdown tokens to return clean plain text
 * for conversation list snippets and notification previews.
 */
export function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove markdown tokens
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Serializes the contentEditable innerHTML into a clean, normalized string
 * preserving only allowed formatting tags (<b>, <strong>, <i>, <em>, <s>, <strike>, <del>, <br>)
 * and converting block elements/linebreaks.
 */
export function serializeHtmlToMessage(html: string): string {
  if (!html) return '';

  // In non-browser / server environments:
  if (typeof document === 'undefined') {
    return html.trim();
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Child contents
      let childContent = '';
      node.childNodes.forEach((child) => {
        childContent += processNode(child);
      });

      switch (tagName) {
        case 'b':
        case 'strong':
          return childContent.trim() ? `<strong>${childContent}</strong>` : childContent;
        case 'i':
        case 'em':
          return childContent.trim() ? `<em>${childContent}</em>` : childContent;
        case 's':
        case 'strike':
        case 'del':
          return childContent.trim() ? `<del>${childContent}</del>` : childContent;
        case 'br':
          return '\n';
        case 'div':
        case 'p':
          // Paragraphs / divs add a newline if not empty
          return childContent ? `\n${childContent}` : '\n';
        default:
          return childContent;
      }
    }

    return '';
  }

  let result = '';
  temp.childNodes.forEach((node) => {
    result += processNode(node);
  });

  // Clean up excessive leading/trailing newlines
  result = result.replace(/^\n+/, '').replace(/\n+$/, '');
  return result;
}

/**
 * Internal helper to parse Markdown tokens in a plain text string into React nodes.
 */
function parseMarkdownSpans(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. Bold+Italic: ***text*** or **_text_** or _**text**_
  // 2. Bold: **text** or __text__
  // 3. Italic: *text* or _text_
  // 4. Strikethrough: ~~text~~ or ~text~
  const tokenRegex =
    /(\*\*\*([^*]+)\*\*\*|\*\*_(.+?)_\*\*|_\*\*(.+?)\*\*_|\*\*([^*]+)\*\*|__([^_]+)__|(?<!\w)\*([^*\s][^*]*?)\*(?!\w)|(?<!\w)_([^_\s][^_]*?)_(?!\w)|~~([^~]+)~~|~([^~\s][^~]*?)~)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;

    // Plain text before match
    if (matchStart > lastIndex) {
      elements.push(text.slice(lastIndex, matchStart));
    }

    const fullMatch = match[0];
    const key = `${keyPrefix}-md-${idx++}`;

    if (fullMatch.startsWith('***') && fullMatch.endsWith('***')) {
      const inner = match[2] || fullMatch.slice(3, -3);
      elements.push(
        <strong key={key} className="font-bold">
          <em className="italic">{parseMarkdownSpans(inner, `${key}-bi`)}</em>
        </strong>,
      );
    } else if (
      (fullMatch.startsWith('**_') && fullMatch.endsWith('_**')) ||
      (fullMatch.startsWith('_**') && fullMatch.endsWith('**_'))
    ) {
      const inner = match[3] || match[4] || fullMatch.slice(3, -3);
      elements.push(
        <strong key={key} className="font-bold">
          <em className="italic">{parseMarkdownSpans(inner, `${key}-bi`)}</em>
        </strong>,
      );
    } else if (
      (fullMatch.startsWith('**') && fullMatch.endsWith('**')) ||
      (fullMatch.startsWith('__') && fullMatch.endsWith('__'))
    ) {
      const inner = match[5] || match[6] || fullMatch.slice(2, -2);
      elements.push(
        <strong key={key} className="font-bold">
          {parseMarkdownSpans(inner, `${key}-b`)}
        </strong>,
      );
    } else if (
      (fullMatch.startsWith('*') && fullMatch.endsWith('*')) ||
      (fullMatch.startsWith('_') && fullMatch.endsWith('_'))
    ) {
      const inner = match[7] || match[8] || fullMatch.slice(1, -1);
      elements.push(
        <em key={key} className="italic">
          {parseMarkdownSpans(inner, `${key}-i`)}
        </em>,
      );
    } else if (
      (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) ||
      (fullMatch.startsWith('~') && fullMatch.endsWith('~'))
    ) {
      const inner = fullMatch.startsWith('~~')
        ? match[9] || fullMatch.slice(2, -2)
        : match[10] || fullMatch.slice(1, -1);
      elements.push(
        <del key={key} className="line-through opacity-85">
          {parseMarkdownSpans(inner, `${key}-s`)}
        </del>,
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = matchEnd;
  }

  // Remainder plain text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

/**
 * Parses formatted message content (supporting both safe HTML tags and Markdown syntax)
 * into a tree of safe React elements.
 * Unrecognized or dangerous HTML tags (like <script>, <style>, <img>) are rendered
 * as safe plain text string without executing code.
 */
export function parseFormattedContent(content: string): React.ReactNode {
  if (!content) return null;

  // If environment has no DOMParser (e.g. basic Node), fallback to markdown parser
  if (typeof DOMParser === 'undefined') {
    return parseMarkdownSpans(content, 'root');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    let nodeCounter = 0;

    function renderNode(node: Node, parentKey: string): React.ReactNode {
      const key = `${parentKey}-${nodeCounter++}`;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        // If text contains markdown syntax, parse it
        return parseMarkdownSpans(text, key);
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // Recursively render children
        const children: React.ReactNode[] = [];
        node.childNodes.forEach((child) => {
          children.push(renderNode(child, key));
        });

        switch (tagName) {
          case 'b':
          case 'strong':
            return (
              <strong key={key} className="font-bold">
                {children}
              </strong>
            );
          case 'i':
          case 'em':
            return (
              <em key={key} className="italic">
                {children}
              </em>
            );
          case 's':
          case 'strike':
          case 'del':
            return (
              <del key={key} className="line-through opacity-85">
                {children}
              </del>
            );
          case 'br':
            return <br key={key} />;
          case 'p':
          case 'div':
            // Render block container or span
            return (
              <span key={key} className="block">
                {children}
              </span>
            );
          case 'span':
            return <span key={key}>{children}</span>;
          default:
            // For disallowed / unknown tags (e.g. script, iframe), safely output text content
            return <span key={key}>{el.textContent || ''}</span>;
        }
      }

      return null;
    }

    const nodes: React.ReactNode[] = [];
    doc.body.childNodes.forEach((child) => {
      nodes.push(renderNode(child, 'body'));
    });

    return nodes.length === 1 ? nodes[0] : nodes;
  } catch {
    // In case of parsing exception, fallback safely to markdown parse
    return parseMarkdownSpans(content, 'fallback');
  }
}
