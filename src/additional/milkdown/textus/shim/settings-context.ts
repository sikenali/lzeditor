import type { Settings } from "../prefs/settings-types";
import type {
  ColorSwatchMode,
  DiagramEngine,
  ImageNamingMode,
} from "../prefs/settings-values";

export type { Settings, ColorSwatchMode, DiagramEngine, ImageNamingMode };

/** The settings React context, no-op shim. A real provider replaces this when
 *  the editor core is wired in.
 *
 *  `t` is the translation object (not a function): vendored code reads
 *  `t.hoverCard`, `t.missingImageRemote.replace(...)`, and the read-only
 *  preview's `SplitPreview` reads `t.splitPreview`. `settings` carries the
 *  editor defaults the preview needs to draw everything (`enableMath` /
 *  `enableMermaid` true), matching the settings the removed editable editor
 *  used. */
const editorSettings = {
  language: "en",
  autoCloseBrackets: false,
  autoCloseMarks: false,
  codeLineNumbers: false,
  colorSwatches: "off",
  diagramEngine: "mermaid",
  enableMath: true,
  enableMermaid: true,
} as Settings;

const t = {
  splitPreview: "Preview",
  hoverCard: "Hover",
  hoverPin: "Pin",
  hoverOpen: "Open",
  hoverClose: "Close",
  missingImageNotFound: "Image not found",
  missingImageUnsupported: "Unsupported image",
  missingImageRemote: "Remote image",
  missingImageUnsaved: "Unsaved image",
};

export function useSettings() {
  return { t, settings: editorSettings };
}
