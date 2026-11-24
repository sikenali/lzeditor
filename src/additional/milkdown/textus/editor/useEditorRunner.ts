import { useCallback } from "react";
import { useInstance } from "@milkdown/react";
import type { Ctx } from "@milkdown/kit/ctx";

/** Runs a function against the editor Ctx; undefined while still loading. */
export type EditorRunner = <T>(fn: (ctx: Ctx) => T) => T | undefined;

/**
 * The single way this app touches the editor imperatively: menu items,
 * shortcuts and popovers are plain functions over the Ctx, composed on this
 * runner.
 */
export function useEditorRunner(): EditorRunner {
  const [loading, getEditor] = useInstance();
  return useCallback(
    <T>(fn: (ctx: Ctx) => T): T | undefined => {
      // `useInstance` 的 getEditor() 返回 editor.current（初始 undefined，仅当
      // editor.create() resolve 后才有值）。loading 标志在 .finally() 置 false，
      // 与 editor.current 的赋值存在竞态：切文档/打开 md 重挂时，loading 已为
      // false 但 editor.current 仍为 undefined → 直接 `.action(fn)` 会抛
      // 「Cannot read properties of undefined (reading 'action')」渲染崩溃。
      // 必须同时守卫 editor 实例本身。
      const editor = getEditor();
      return loading || !editor ? undefined : editor.action(fn);
    },
    [loading, getEditor],
  );
}
