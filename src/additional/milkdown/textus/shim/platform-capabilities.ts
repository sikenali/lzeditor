/** Platform capabilities, no-op shim: everything desktop-only or native is
 *  off; the vendored core renders as a plain web app. */
export const isDesktopApp = false;
export const isIOSApp = false;
export const canUseWindows = false;
export const hasAppMenu = false;
export const hasNativeMenuBar = false;
export const canDragTabsBetweenWindows = false;
export const hasNativeWebPages = false;
export const canDetachChat = false;
export const canToggleFullscreen = false;
export const canAutoUpdate = false;
export const canExportPdf = false;
export const canExportWithPandoc = false;
export const canRevealInFileManager = false;
export const canPickImageFile = false;
export const canPickFolder = false;
export const canOpenFolder = false;
export const canInstallCliCommand = false;
export const canTrashFiles = false;
export const canSetDefaultEditor = false;
export const hasTextusAi = false;
