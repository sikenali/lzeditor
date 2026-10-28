import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { EditCanvas } from "../../vendor/yeli/ui/edit-canvas.tsx";
import { useDocumentStore } from "../../vendor/yeli/ui/use-document-store.ts";
import { registerRenderExtension } from "../../vendor/yeli/render/markdown.ts";
import { createYeliFacade, type YeliEditorFacade } from "./facade/YeliEditorFacade";
import { YELI_LABELS_ZH } from "./yeli-labels";
import { installAutopair } from "./assist/autopair";
import { installSmartPaste } from "./assist/smart-paste";
import { installTypewriter } from "./assist/typewriter";
import { installFocusMode } from "./assist/focus-mode";
import {
  installRenderExt,
  observeLazyRenderers,
} from "./render-ext";
import { useEditorStore } from "../../store/editorStore";
import { useSettingsStore } from "../../store/settingsStore";
import { resolveTheme } from "../../hooks/useTheme";
import "../../styles/yeli-canvas.css";

// 渲染边界扩展注册一次：vendor 渲染器（read/preview 用）挂 mermaid/echarts/
// KaTeX/代码高亮规则。特效（mermaid/echarts/katex）均走惰性容器，水合由
// observeLazyRenderers 触发，无 postProcess 回填。
let renderExtRegistered = false;
function ensureRenderExtRegistered(): void {
  if (renderExtRegistered) return;
  renderExtRegistered = true;
  registerRenderExtension({
    install: installRenderExt,
  });
}
ensureRenderExtRegistered();

/**
 * The imperative surface exposed via ref, standing in for the old
 * `getCM6Editor()` entry point. All methods are typed facade operations;
 * no caller touches the yeli store directly.
 */
export interface YeliEditorHandle {
  focus(): void;
  insertText(text: string): void;
  replaceRange(from: number, to: number, text: string): void;
  execCommand(name: string, args?: Record<string, unknown>): unknown;
  getText(): string;
  setText(markdown: string): void;
}

interface YeliEditorProps {
  /** The canonical markdown source to display (fidelity: no re-serialization). */
  md: string;
  /** Emitted with fidelity markdown after every committed edit. */
  onChange: (markdown: string) => void;
}

/**
 * lzeditor's new editor entry: renders the yeli source-mapped WYSIWYG canvas
 * and routes every edit through the {@link YeliEditorFacade}.
 *
 * The facade owns the one live {@link DocumentStore}; `EditCanvas` renders off
 * that same store (via `getDocumentStore()`), so keystrokes, undo/redo and
 * programmatic writes all share a single revision stream and the md that flows
 * out of `onChange` is byte-faithful to what the user sees.
 *
 * 输入辅助（autopair/smart-paste/typewriter/focus-mode）与区块内特效渲染
 * （render-ext 惰性容器）都在本层装配：assist 只转发事件到 facade typed
 * 事务，render-ext 只做渲染边界扩展 + 惰性水合，均不绕过数据层。
 */
export const YeliEditor = forwardRef<YeliEditorHandle, YeliEditorProps>(
  function YeliEditor({ md, onChange }, ref) {
    const facadeRef = useRef<YeliEditorFacade | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const mdRef = useRef(md);
    mdRef.current = md;

    // Build the facade once and load the initial markdown synchronously, so the
    // store exists before the first render (useDocumentStore needs it).
    if (!facadeRef.current) {
      facadeRef.current = createYeliFacade({
        labels: YELI_LABELS_ZH,
        locale: "zh-CN",
      });
      facadeRef.current.setText(mdRef.current);
    }
    const facade = facadeRef.current;

    // Every committed store change re-emits fidelity markdown to the caller.
    useEffect(
      () => facade.onChange((markdown) => onChangeRef.current(markdown)),
      [facade],
    );

    // External source changes (document switch, import, programmatic write)
    // push into the facade. An edit that already flowed out of onChange comes
    // back equal, so this is a no-op and never resets the caret.
    useEffect(() => {
      if (facade.getText() !== md) facade.setText(md);
    }, [md, facade]);

    const store = facade.getDocumentStore();
    const snapshot = useDocumentStore(store);

    // editorContentRef is the scroll container consumed by scroll-sync
    // (SidebarPreview). The yeli canvas scrolls inside .edit-surface.
    const shellRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const surface = shellRef.current?.querySelector<HTMLElement>(".edit-surface");
      // editorContentRef is only consumed for scroll events / line bridging, so
      // the <main> edit surface satisfies it; the store type is HTMLDivElement.
      useEditorStore.getState().setEditorContentRef((surface as HTMLDivElement | null) ?? null);
    }, []);

    // 输入辅助装配：autopair / smart-paste 走 facade typed 事务；
    // typewriter / focus-mode 纯视角（selection 同步 + class 切换）。
    useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const disposers = [
        installAutopair(shell, facade),
        installSmartPaste(shell, facade),
        installTypewriter(shell, facade),
        installFocusMode(shell, facade),
      ];
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, [facade]);

    // 区块内特效惰性水合：进入视口/聚焦才实例化 mermaid/echarts。
    const appTheme = useSettingsStore((state) => state.theme);
    const dark = resolveTheme(appTheme) === "dark";
    useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;
      return observeLazyRenderers(shell, { dark });
    }, [dark]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => facade.focus(),
        insertText: (text) => facade.insertText(text),
        replaceRange: (from, to, text) => facade.replaceRange(from, to, text),
        execCommand: (name, args) => facade.execCommand(name, args),
        getText: () => facade.getText(),
        setText: (markdown) => facade.setText(markdown),
      }),
      [facade],
    );

    return (
      <div className="yeli-canvas-shell" ref={shellRef}>
        <EditCanvas
          assets={[]}
          displayTitle=""
          handoffTarget={null}
          labels={YELI_LABELS_ZH}
          locale="zh-CN"
          onHandoffResolved={() => {}}
          onOpenDocumentInspector={() => {}}
          onOpenImage={() => {}}
          onSelectBlock={() => {}}
          selectedBlockId={undefined}
          snapshot={snapshot}
          store={store}
        />
      </div>
    );
  },
);
