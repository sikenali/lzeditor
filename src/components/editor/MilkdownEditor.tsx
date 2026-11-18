import React, { useEffect } from 'react'
import { Editor } from '@milkdown/kit/core'
import { listenerCtx } from '@milkdown/kit/plugin/listener'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { configureEditorRoot, withEditorCore } from '../../additional/milkdown/textus/editor/editor-extensions'
import { useSettings } from '../../additional/milkdown/textus/shim/settings-context'
import { useLatest } from '../../additional/milkdown/textus/utils/hooks/useLatest'
import { useEditorRunner, type EditorRunner } from '../../additional/milkdown/textus/editor/useEditorRunner'
import '../../additional/milkdown/milkdown.css'
import '@milkdown/kit/prose/view/style/prosemirror.css'
import '../../additional/milkdown/textus/theme/content-base.css'
import '../../additional/milkdown/textus/theme/content-themes.css'
import '../../additional/milkdown/textus/editor/milkdown-theme.css'
import '../../additional/milkdown/textus/editor/completion/completion-panel.css'
import '../../additional/milkdown/textus/editor/diagram-zoom.css'
import '../../additional/milkdown/textus/editor/hover/hover-card.css'

/* ═══════════════════════════════════════════════════════════
   Milkdown 可编辑编辑器（WYSIWYG）。
   vendored Textus 装配（withEditorCore）+ 受控 markdown 初值 +
   markdownUpdated 回调把保真 markdown 带出。docPath 恒 null（无磁盘），
   走 noDiskImages 分支（同 TextusPreview）。CSS 由 .textus-editor-shell 作用域。
   ═══════════════════════════════════════════════════════════ */

interface MilkdownEditorProps {
  /** 受控 markdown 初值（切换文档时用）。 */
  md: string
  /** 每次编辑后带出保真 markdown。 */
  onChange: (md: string) => void
  /** 挂载就绪后提供命令入口（供 facade 用）。 */
  onReady?: (runner: EditorRunner) => void
}

function EditableEditor({ md, onChange, onReady }: MilkdownEditorProps) {
  const { settings, t } = useSettings()
  const settingsRef = useLatest(settings)
  const docPathRef = useLatest<string | null>(null)
  const labelRef = useLatest(t.splitPreview)
  const onChangeRef = useLatest(onChange)
  const runner = useEditorRunner()

  // 命令入口就绪后交给 facade（runner 稳定，仅挂载后触发一次）
  useEffect(() => {
    onReady?.(runner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner])

  useEditor((root) =>
    withEditorCore(
      Editor.make().config((ctx) => {
        configureEditorRoot(ctx, root, md, () => labelRef.current)
        // 每次编辑把保真 markdown 带出（markdownUpdated 已序列化）
        ctx.get(listenerCtx).markdownUpdated((_c, next) => onChangeRef.current(next))
      }),
      {
        settings: settingsRef,
        docPath: docPathRef,
        // 无磁盘后端：noDiskImages 为 no-op 插件，关闭 disk 图片/链接管线
        noDiskImages: () => () => {},
      },
    ),
  )

  return <Milkdown />
}

export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  return (
    <div className="textus-editor-shell" data-content-theme="slate">
      <MilkdownProvider>
        <EditableEditor {...props} />
      </MilkdownProvider>
    </div>
  )
}

