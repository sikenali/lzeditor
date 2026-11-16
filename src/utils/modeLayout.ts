/**
 * 布局模式纯逻辑。从 App.tsx 抽出来以便行为化测试。
 *
 * 背景：两个渲染 bug 的根因都是「模式状态派生」不严谨——
 *   1) WYSIWYG 与预览冲突：WYSIWYG 本身就是整篇渲染视图，右侧预览面板再显示同一篇
 *      文档就是双份渲染（截图可见中心 Textus + 右侧 SidebarPreview 各渲染一遍）。
 *   2) 样式界面不显示：showRightPanel 只在 LeftNav 进入样式/历史时置 true，其它入口
 *      （模式菜单/工具栏/页脚）只改 appMode 不动它，退出样式后残留 true，渲染一个
 *      0 子元素的空面板（样式内容没了、编辑器被压窄）。
 */

/** 是否显示右侧预览面板（SidebarPreview）。wysiwyg 开启时强制隐藏。 */
export function shouldShowRightPreview(opts: {
  showPreview: boolean
  appMode: string
  wysiwyg: boolean
}): boolean {
  const { showPreview, appMode, wysiwyg } = opts
  return showPreview
    && appMode !== 'code'
    && appMode !== 'history'
    && appMode !== 'style'
    && appMode !== 'read'
    && !wysiwyg
}

/**
 * 左导航布局是否渲染右侧面板容器（.app-right-panel）。
 *
 * 不再读取残留的 showRightPanel：样式面板由 `appMode === 'style'` 决定（历史/阅读模式
 * 已整体排除），showRightPanel 是冗余且会残留的状态，一旦参与条件就会在退出样式后
 * 渲染空面板。
 */
export function shouldShowRightPanel(opts: {
  appMode: string
  showRightPreview: boolean
  showLibrary: boolean
}): boolean {
  const { appMode, showRightPreview, showLibrary } = opts
  return (appMode !== 'read' && appMode !== 'history')
    && (showRightPreview || showLibrary || appMode === 'style')
}
