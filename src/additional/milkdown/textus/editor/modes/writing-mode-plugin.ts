import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

export interface WritingModeOptions {
  /** Highlight the block the caret is in (编辑设置 → 当前行). */
  currentLine: () => boolean;
  /** Dim every other block (编辑设置 → 专注模式). */
  focusMode: () => boolean;
  /** Keep the caret line centered while typing (编辑设置 → 打字机模式). */
  typewriterMode: () => boolean;
}

/**
 * Writing-mode decorations/scroll for the Milkdown editor. These settings
 * were CM6-only; the WYSIWYG editor now honors them too. Getters are read
 * live so toggling a switch takes effect without remounting the editor.
 */
export function createWritingModePlugin(opts: WritingModeOptions) {
  return $prose(
    () =>
      new Plugin({
        key: new PluginKey("lz-writing-mode"),
        props: {
          decorations(state) {
            if (!opts.currentLine() && !opts.focusMode()) return null;
            const from = state.selection.from;
            const ranges: Array<[number, number]> = [];
            let current: [number, number] | null = null;
            let acc = 0;
            state.doc.forEach((node) => {
              const start = acc;
              const end = acc + node.nodeSize;
              ranges.push([start, end]);
              if (from >= start && from <= end) current = [start, end];
              acc = end;
            });
            if (!current) return null;
            const decos: Decoration[] = [];
            if (opts.currentLine()) {
              decos.push(Decoration.node(current[0], current[1], { class: "md-current-line" }));
            }
            if (opts.focusMode()) {
              for (const [start, end] of ranges) {
                if (start !== current[0]) {
                  decos.push(Decoration.node(start, end, { class: "md-focus-dim" }));
                }
              }
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
        view(view) {
          let last = view.state.selection.from;
          return {
            update(v) {
              if (!opts.typewriterMode()) return;
              if (v.state.selection.from === last) return;
              last = v.state.selection.from;
              const coords = v.coordsAtPos(v.state.selection.head);
              const scroller = v.dom.closest(".milkdown") as HTMLElement | null;
              if (!coords || !scroller) return;
              const rect = scroller.getBoundingClientRect();
              const target =
                coords.top - rect.top + scroller.scrollTop - rect.height / 2;
              scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
            },
          };
        },
      }),
  );
}
