import type { DiagramEngine } from "../prefs/settings-values";

/** A diagram drawn to SVG, minimal shape. */
export interface DrawnDiagram {
  svg: string;
  engine: DiagramEngine | "chart";
}

/** The fenced-block languages drawn as pictures. */
export const DIAGRAM_LANGUAGES: readonly string[] = ["mermaid"];

/** Whether the UI is dark; no-op shim: false. */
export function appearanceIsDark(): boolean {
  return false;
}

/** The Mermaid theme name; no-op shim: "neutral". */
export function mermaidTheme(_dark?: boolean): string {
  return "neutral";
}

/** A drawing function for one render pass; no-op shim: an empty SVG. */
export function diagramRenderer(
  _engine: DiagramEngine,
  _layout: { width: number; fontFamily?: string; dark?: boolean },
  _configure?: (mermaid: unknown) => void,
): (code: string, id: string, language?: string) => Promise<DrawnDiagram> {
  return async (_code, _id, _language = "mermaid") => ({
    svg: "",
    engine: "mermaid",
  });
}
