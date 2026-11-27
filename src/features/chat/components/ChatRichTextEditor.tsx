import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { serializeHtmlToMessage } from '../utils/formattingUtils';

export interface FormattingState {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
}

export interface ChatRichTextEditorProps {
  placeholder?: string;
  disabled?: boolean;
  onChange?: (formattedText: string, plainText: string) => void;
  onSend: () => void;
  onActiveStylesChange?: (styles: FormattingState) => void;
  className?: string;
}

export interface ChatRichTextEditorRef {
  focus: () => void;
  clear: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleStrikethrough: () => void;
  insertEmoji: (emoji: string) => void;
  getFormattedMessage: () => string;
  getPlainText: () => string;
  isEmpty: () => boolean;
}

export const ChatRichTextEditor = forwardRef<
  ChatRichTextEditorRef,
  ChatRichTextEditorProps
>(
  (
    {
      placeholder = 'Type a message...',
      disabled = false,
      onChange,
      onSend,
      onActiveStylesChange,
      className = '',
    },
    ref,
  ) => {
    const editorDivRef = useRef<HTMLDivElement | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const stylesRef = useRef<FormattingState>({
      bold: false,
      italic: false,
      strikethrough: false,
    });
    const [styles, setStyles] = useState<FormattingState>({
      bold: false,
      italic: false,
      strikethrough: false,
    });

    // Helper to query active commands in document
    const queryActiveStyles = useCallback((): FormattingState => {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorDivRef.current?.contains(sel.anchorNode)) {
          let node: Node | null = sel.anchorNode;
          if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          let hasBold = false;
          let hasItalic = false;
          let hasStrike = false;

          while (node && node !== editorDivRef.current) {
            const tag = (node as HTMLElement).tagName?.toLowerCase();
            if (tag === 'strong' || tag === 'b') hasBold = true;
            if (tag === 'em' || tag === 'i') hasItalic = true;
            if (tag === 'del' || tag === 's' || tag === 'strike') hasStrike = true;
            node = node.parentNode;
          }

          const nativeBold = Boolean(document.queryCommandState?.('bold'));
          const nativeItalic = Boolean(document.queryCommandState?.('italic'));
          const nativeStrike = Boolean(document.queryCommandState?.('strikeThrough'));

          return {
            bold: hasBold || nativeBold,
            italic: hasItalic || nativeItalic,
            strikethrough: hasStrike || nativeStrike,
          };
        }
      } catch {
        // ignore
      }
      return stylesRef.current;
    }, []);

    const updateActiveStyles = useCallback(() => {
      const current = queryActiveStyles();
      stylesRef.current = current;
      setStyles(current);
      onActiveStylesChange?.(current);
    }, [queryActiveStyles, onActiveStylesChange]);

    const handleEditorChange = useCallback(() => {
      if (!editorDivRef.current) return;
      const html = editorDivRef.current.innerHTML;
      const plain = (editorDivRef.current.innerText || editorDivRef.current.textContent || '')
        .replace(/\u200B/g, '') // remove zero-width spaces
        .trim();

      const empty = plain.length === 0 && !html.includes('<img');
      setIsEmpty(empty);

      const formatted = serializeHtmlToMessage(html);
      if (onChange) {
        onChange(formatted, plain);
      }
    }, [onChange]);

    // Apply or toggle format command
    const executeFormat = useCallback(
      (command: 'bold' | 'italic' | 'strikeThrough') => {
        if (!editorDivRef.current || disabled) return;
        editorDivRef.current.focus();

        let executed = false;
        try {
          executed = document.execCommand(command, false);
        } catch {
          executed = false;
        }

        const tagKey = command === 'strikeThrough' ? 'strikethrough' : command;
        const sel = window.getSelection();
        const hasSelection = Boolean(
          sel &&
            sel.rangeCount > 0 &&
            !sel.isCollapsed &&
            editorDivRef.current.contains(sel.getRangeAt(0).commonAncestorContainer),
        );

        // Fallback for environments where execCommand doesn't manipulate DOM (e.g., JSDOM / test runners)
        if (!executed && hasSelection && sel) {
          const range = sel.getRangeAt(0);
          const tagMap: Record<string, string> = {
            bold: 'strong',
            italic: 'em',
            strikeThrough: 'del',
          };
          const targetTag = tagMap[command]!;

          // Check if already wrapped
          let parent: Node | null = range.commonAncestorContainer;
          if (parent && parent.nodeType === Node.TEXT_NODE) parent = parent.parentNode;
          let existingTag: HTMLElement | null = null;

          while (parent && parent !== editorDivRef.current) {
            const tag = (parent as HTMLElement).tagName?.toLowerCase();
            if (
              tag === targetTag ||
              (command === 'bold' && tag === 'b') ||
              (command === 'italic' && tag === 'i') ||
              (command === 'strikeThrough' && (tag === 's' || tag === 'strike'))
            ) {
              existingTag = parent as HTMLElement;
              break;
            }
            parent = parent.parentNode;
          }

          if (existingTag) {
            // Toggle off: unwrap contents
            const frag = document.createDocumentFragment();
            while (existingTag.firstChild) {
              frag.appendChild(existingTag.firstChild);
            }
            existingTag.parentNode?.replaceChild(frag, existingTag);
          } else {
            // Toggle on: wrap selection
            const el = document.createElement(targetTag);
            el.appendChild(range.extractContents());
            range.insertNode(el);
            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(el);
            sel.addRange(newRange);
          }
        }

        const currentActive = queryActiveStyles();
        const nextActive = !hasSelection
          ? { ...currentActive, [tagKey]: !stylesRef.current[tagKey] }
          : currentActive;

        stylesRef.current = nextActive;
        setStyles(nextActive);
        onActiveStylesChange?.(nextActive);
        handleEditorChange();
      },
      [disabled, handleEditorChange, onActiveStylesChange, queryActiveStyles],
    );

    // Insert emoji at cursor position
    const insertEmoji = useCallback(
      (emoji: string) => {
        if (!editorDivRef.current || disabled) return;
        editorDivRef.current.focus();

        let inserted = false;
        try {
          inserted = document.execCommand('insertText', false, emoji);
        } catch {
          inserted = false;
        }

        if (!inserted) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(emoji);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            editorDivRef.current.appendChild(document.createTextNode(emoji));
          }
        }

        handleEditorChange();
      },
      [disabled, handleEditorChange],
    );

    // Keyboard handling: Enter sends, Shift+Enter inserts newline, formatting shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Enter without Shift -> Send
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
        return;
      }

      // Formatting shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'b' && !e.shiftKey) {
          e.preventDefault();
          executeFormat('bold');
        } else if (key === 'i' && !e.shiftKey) {
          e.preventDefault();
          executeFormat('italic');
        } else if (key === 'x' && e.shiftKey) {
          e.preventDefault();
          executeFormat('strikeThrough');
        }
      }
    };

    // Paste handling: strip unwanted external layout formatting, preserve plain text
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      let inserted = false;
      try {
        inserted = document.execCommand('insertText', false, text);
      } catch {
        inserted = false;
      }
      if (!inserted && editorDivRef.current) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editorDivRef.current.appendChild(document.createTextNode(text));
        }
      }
      handleEditorChange();
    };

    // Expose imperative handle methods
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (!editorDivRef.current) return;
          editorDivRef.current.focus();
          // Place cursor at end
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(editorDivRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        },
        clear: () => {
          if (editorDivRef.current) {
            editorDivRef.current.innerHTML = '';
          }
          setIsEmpty(true);
          const clearedStyles = { bold: false, italic: false, strikethrough: false };
          stylesRef.current = clearedStyles;
          setStyles(clearedStyles);
          onActiveStylesChange?.(clearedStyles);
        },
        toggleBold: () => executeFormat('bold'),
        toggleItalic: () => executeFormat('italic'),
        toggleStrikethrough: () => executeFormat('strikeThrough'),
        insertEmoji: (emoji: string) => insertEmoji(emoji),
        getFormattedMessage: () => {
          if (!editorDivRef.current) return '';
          return serializeHtmlToMessage(editorDivRef.current.innerHTML);
        },
        getPlainText: () => {
          if (!editorDivRef.current) return '';
          return (editorDivRef.current.innerText || editorDivRef.current.textContent || '')
            .replace(/\u200B/g, '')
            .trim();
        },
        isEmpty: () => {
          if (!editorDivRef.current) return true;
          const plain = (editorDivRef.current.innerText || editorDivRef.current.textContent || '')
            .replace(/\u200B/g, '')
            .trim();
          return plain.length === 0;
        },
      }),
      [executeFormat, insertEmoji, onActiveStylesChange],
    );

    // Track selection changes across document while editor has focus
    useEffect(() => {
      const handleSelectionChange = () => {
        if (!editorDivRef.current) return;
        const sel = window.getSelection();
        if (sel && sel.anchorNode && editorDivRef.current.contains(sel.anchorNode)) {
          updateActiveStyles();
        }
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }, [updateActiveStyles]);

    return (
      <div className={`relative flex-1 flex items-center min-w-0 ${className}`}>
        <div
          ref={editorDivRef}
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          data-testid="chat-rich-text-editor"
          onInput={handleEditorChange}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveStyles}
          onMouseUp={updateActiveStyles}
          onFocus={updateActiveStyles}
          onPaste={handlePaste}
          className={`flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[42px] max-h-32 overflow-y-auto whitespace-pre-wrap break-words select-text ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            fontWeight: styles.bold ? 'bold' : 'normal',
            fontStyle: styles.italic ? 'italic' : 'normal',
            textDecoration: styles.strikethrough ? 'line-through' : 'none',
          }}
        />

        {isEmpty && (
          <div
            onClick={() => editorDivRef.current?.focus()}
            className="absolute left-4 top-2.5 text-sm text-slate-400 pointer-events-none select-none truncate pr-4"
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  },
);

ChatRichTextEditor.displayName = 'ChatRichTextEditor';
