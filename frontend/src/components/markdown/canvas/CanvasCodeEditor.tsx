import { useEffect, useRef } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  type ViewUpdate,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import style from "../markdown.module.scss";

export type CanvasCodeLanguage = "html" | "css" | "javascript";

type Props = {
  language: CanvasCodeLanguage;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function languageExtension(language: CanvasCodeLanguage) {
  if (language === "css") return css();
  if (language === "javascript") return javascript();
  return html();
}

const canvasEditorTheme = EditorView.theme({
  "&": {
    fontSize: "13px",
    backgroundColor: "var(--background-color)",
    color: "var(--accent-1)",
  },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "1.5",
    fontFamily:
      '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  ".cm-content": {
    lineHeight: "1.5",
  },
  ".cm-gutters": {
    backgroundColor: "var(--component-color)",
    color: "var(--accent-3)",
    borderRight: "1px solid var(--border-default-color)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-activeLine": { backgroundColor: "var(--background-hover-color)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent-1)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--background-hover-color)",
  },
});

const CanvasCodeEditor = ({ language, value, onChange, ariaLabel }: Props) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!parentRef.current) return undefined;

    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          indentOnInput(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          langCompartment.current.of(languageExtension(language)),
          canvasEditorTheme,
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 마운트 시 한 번만 생성. language/value는 아래 effect로 동기화.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(languageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value, language]);

  return (
    <div
      ref={parentRef}
      className={style.canvasCodeMirror}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
    />
  );
};

export default CanvasCodeEditor;
