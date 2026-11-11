/**
 * A plugin's own files: where they are and how their resources are read.
 * Pure helpers only; the IPC-backed readers are adapted per host (Electron /
 * browser) and injected. Ported from Textus `src/plugins/store/files.ts`.
 */

/** Where a plugin's files are: installed (from the catalog or a file),
 *  or a developer's folder. None comes with the app. */
export type PluginOrigin = "installed" | "dev";

/** A relative path inside the plugin, or an error: no `..`, no root. */
export function pluginPath(rel: string): string {
  const parts = rel
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .split("/");
  if (
    !rel ||
    parts.some((p) => p === ".." || p === "") ||
    /^[a-z]+:/i.test(rel)
  )
    throw new Error(`"${rel}" is not a file of the plugin.`);
  return parts.join("/");
}

const MIME: Record<string, string> = {
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  wasm: "application/wasm",
  bcmap: "application/octet-stream",
};

export function mimeOf(path: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function dataUrl(path: string, bytes: Uint8Array): string {
  return `data:${mimeOf(path)};base64,${toBase64(bytes)}`;
}
