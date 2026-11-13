import { useEffect, useRef } from "react";
import { SplitPreview } from "./textus/editor/modes/SplitPreview";
import "./milkdown.css";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import "./textus/theme/content-base.css";
import "./textus/theme/content-themes.css";
import "./textus/editor/milkdown-theme.css";
import "./textus/editor/completion/completion-panel.css";
import "./textus/editor/diagram-zoom.css";
import "./textus/editor/hover/hover-card.css";

/** 只读预览外壳：`.textus-editor-shell` 是 vendored Textus CSS 的作用域，
 *  `data-content-theme` 激活 `--doc-*` token，`data-theme` 镜像应用亮/暗。 */
export function TextusPreview({ markdown }: { markdown: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const root = document.documentElement;
    const apply = () => {
      const theme = root.getAttribute("data-theme");
      if (theme === "dark" || theme === "light") shell.setAttribute("data-theme", theme);
      else shell.removeAttribute("data-theme");
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={shellRef} className="textus-editor-shell" data-content-theme="slate">
      <SplitPreview markdown={markdown} filePath={null} />
    </div>
  );
}
