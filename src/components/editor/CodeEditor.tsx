import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createCM6EditorFacade } from "./facade/cm6/CM6EditorFacade";
import { buildCM6Extensions } from "./facade/cm6/cm6-extensions";
import { installAssist } from "./facade/cm6/cm6-assist";
import { getEditorFacade, registerEditorFacade } from "./facade/registry";
import type { EditorFacade } from "./facade/EditorFacade";
import { useEditorStore } from "../../store/editorStore";
import { useSettingsStore } from "../../store/settingsStore";
import { fontStackFor } from "../../hooks/useTypographyOverrides";
import "../../styles/code-editor.css";

/**
 * lzeditor's source editor: a CodeMirror 6 canvas (left-write / right-read,
 * as in Backtickle) exposed through the typed {@link EditorFacade}.
 *
 * The facade owns the {@link EditorView} and routes every edit through CM6
 * transactions; `md` that flows out of `onChange` is byte-faithful to what the
 * user sees. External source changes (document switch, import, programmatic
 * write) push into the facade only when the content actually differs, so an
 * edit that already came out of `onChange` never resets the caret.
 */
export interface CodeEditorHandle {
  focus(): void;
  insertText(text: string): void;
  replaceRange(from: number, to: number, text: string): void;
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  getText(): string;
  setText(markdown: string): void;
}

interface CodeEditorProps {
  /** The canonical markdown source to display (fidelity: no re-serialization). */
  md: string;
  /** Emitted with fidelity markdown after every committed edit. */
  onChange: (markdown: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor({ md, onChange }, ref) {
    const shellRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<{ facade: EditorFacade; destroy: () => void } | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const mdRef = useRef(md);
    mdRef.current = md;

    // 输入辅助设置（typewriter/focus-mode）每次渲染刷新到 ref，installAssist
    // 在事件时读它，这样设置切换即时生效、无需重挂编辑器。
    const typewriterMode = useSettingsStore((s) => s.typewriterMode) ?? false;
    const focusMode = useSettingsStore((s) => s.focusMode) ?? false;
    const assistSettingsRef = useRef({ typewriterMode, focusMode });
    assistSettingsRef.current = { typewriterMode, focusMode };

    // Mount: create the CM6 view + facade over the shell, seed the source,
    // subscribe, register, and expose the scroll container for scroll-sync.
    useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const { facade, view, destroy } = createCM6EditorFacade(shell, {
        extensions: buildCM6Extensions(),
      });
      handleRef.current = { facade, destroy };
      facade.setText(mdRef.current);
      const unsubscribe = facade.onChange((markdown) => onChangeRef.current(markdown));
      const uninstallAssist = installAssist(
        view,
        facade,
        () => assistSettingsRef.current,
      );
      registerEditorFacade(facade);
      useEditorStore.getState().setEditorContentRef(view.scrollDOM as HTMLDivElement);

      return () => {
        unsubscribe();
        uninstallAssist();
        if (getEditorFacade() === facade) registerEditorFacade(null);
        useEditorStore.getState().setEditorContentRef(null);
        handleRef.current = null;
        destroy();
      };
    }, []);

    // External source changes (document switch, import, programmatic write).
    // An edit that already flowed out of onChange comes back equal, so this is
    // a no-op and never resets the caret.
    useEffect(() => {
      const handle = handleRef.current;
      if (handle && handle.facade.getText() !== md) handle.facade.setText(md);
    }, [md]);

    // 排版设置接线到 CM6 画布：内容宽度 / 字体 / 字号 / 行高 / 缩进 / 两端对齐。
    const contentWidth = useSettingsStore((s) => s.contentWidth);
    const editorFont = useSettingsStore((s) => s.editorFont);
    const defaultFontSize = useSettingsStore((s) => s.defaultFontSize);
    const lineHeight = useSettingsStore((s) => s.lineHeight);
    const textIndent = useSettingsStore((s) => s.textIndent);
    const textJustify = useSettingsStore((s) => s.textJustify);
    useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const style = shell.style;
      style.setProperty("--document-width", `${contentWidth}px`);
      style.setProperty("--cm-font-family", fontStackFor(editorFont));
      style.setProperty("--cm-font-size", `${defaultFontSize}px`);
      style.setProperty("--cm-line-height", lineHeight ?? "1.7");
      style.setProperty("--cm-text-indent", textIndent ? "2em" : "0");
      style.setProperty("--cm-text-justify", textJustify ? "justify" : "start");
    }, [contentWidth, editorFont, defaultFontSize, lineHeight, textIndent, textJustify]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => handleRef.current?.facade.focus(),
        insertText: (text) => handleRef.current?.facade.insertText(text),
        replaceRange: (from, to, text) =>
          handleRef.current?.facade.replaceRange(from, to, text),
        execCommand: (name, args) => handleRef.current?.facade.execCommand(name, args),
        getText: () => handleRef.current?.facade.getText() ?? "",
        setText: (markdown) => handleRef.current?.facade.setText(markdown),
      }),
      [],
    );

    return <div className="code-editor-shell" ref={shellRef} />;
  },
);
