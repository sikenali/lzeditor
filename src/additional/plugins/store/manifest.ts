/**
 * 插件清单 `textus-plugin.json` 的解析与校验。
 * 移植自 Textus `src/plugins/store/manifest.ts`，零外部依赖。
 */

import {
  ManifestError,
  list,
  object,
  parseContributes,
  parseMain,
  text,
} from "./manifest-parse";

export { ManifestError } from "./manifest-parse";

/** 权限：清单里声明的名字。`network:<host>` 命名一个主机
 *  （`*.domain` 表示其子域，`host:port`，或 `*` 表示任意）。 */
export type Permission =
  | "editor.read"
  | "editor.write"
  | "editor.propose"
  | "files.read"
  | "files.write"
  | "clipboard"
  | "editor.input"
  | "project.data"
  | "ai.tools"
  | "notifications"
  | "background"
  | `network:${string}`;

export const PLUGIN_PLATFORMS = ["desktop", "ios"] as const;
export type PluginPlatform = (typeof PLUGIN_PLATFORMS)[number];

const PLAIN_PERMISSIONS = [
  "editor.read",
  "editor.write",
  "editor.propose",
  "files.read",
  "files.write",
  "clipboard",
  "editor.input",
  "project.data",
  "ai.tools",
  "notifications",
  "background",
] as const;

export function isPermission(value: unknown): value is Permission {
  if (typeof value !== "string") return false;
  if ((PLAIN_PERMISSIONS as readonly string[]).includes(value)) return true;
  const host = value.startsWith("network:") && value.slice("network:".length);
  return !!host && /^(\*|(\*\.)?[a-z0-9.-]+(:\d{1,5})?)$/i.test(host);
}

export interface CommandContribution {
  command: string;
  title: string;
  /** 直接运行 Textus 的一条命令，带参数，不经过插件代码。 */
  runs?: { command: string; args: unknown[] };
}

export interface KeybindingContribution {
  command: string;
  /** 设置写法的组合键："mod+shift+k"。 */
  key: string;
}

/** 菜单位置：编辑器右键、斜杠、文件/标签右键、视图标题、浮动视图、插件菜单、托盘。 */
export type MenuId =
  | "editor/context"
  | "editor/slash"
  | "file/context"
  | "tab/context"
  | "view/title"
  | "floating/context"
  | "app/plugins"
  | "app/tray";

export type RequiredSetting = "runInBackground";
export const REQUIRED_SETTINGS: readonly RequiredSetting[] = [
  "runInBackground",
];

export interface Requirement {
  setting: RequiredSetting;
  reason?: string;
}

export interface MenuContribution {
  command: string;
  /** "editorHasSelection", "fileExtension == .pdf"。 */
  when?: string;
  icon?: string;
}

export type ViewType = "list" | "webview";

export interface SidebarTabContribution {
  id: string;
  title: string;
  type: ViewType;
  icon?: string;
}

export interface ViewContribution {
  id: string;
  title: string;
  type: ViewType;
}

export interface CodeBlockContribution {
  language: string;
  title?: string;
  frame?: "none";
}

export interface CustomEditorContribution {
  viewType: string;
  displayName: string;
  filenamePatterns: string[];
  frontMatter: string[];
  priority: "default" | "option";
}

export type SettingType =
  | "boolean"
  | "string"
  | "number"
  | "enum"
  | "color"
  | "list"
  | "button";

export interface SettingContribution {
  key: string;
  type: SettingType;
  default?: boolean | string | number | string[];
  title: string;
  description?: string;
  group?: string;
  when?: string;
  options?: { value: string; label: string }[];
  multiline?: boolean;
  min?: number;
  max?: number;
  command?: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  path: string;
}

export interface AiToolContribution {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface CompletionContribution {
  id: string;
  where: "math" | "text" | "any";
  pattern: string;
  title?: string;
}

export interface LinkContribution {
  pattern: string;
  command: string;
}

export type FloatingPlace = "desktop" | "window" | "either";

export interface FloatingViewContribution {
  id: string;
  title: string;
  width: number;
  height: number;
  place: FloatingPlace;
}

export type SuggestKind = "wikilinks";
export type EmbedKind = "note" | "heading" | "block";

export interface EmbedContribution {
  id: string;
  targets: EmbedKind[];
}

export type HoverContribution = "document" | "link" | "citation";

export interface Contributes {
  commands: CommandContribution[];
  keybindings: KeybindingContribution[];
  menus: Partial<Record<MenuId, MenuContribution[]>>;
  sidebarTabs: SidebarTabContribution[];
  views: ViewContribution[];
  customEditors: CustomEditorContribution[];
  settings: SettingContribution[];
  settingsPage: { title: string } | null;
  themes: ThemeContribution[];
  aiTools: AiToolContribution[];
  completions: CompletionContribution[];
  embeds: EmbedContribution[];
  hovers: HoverContribution[];
  links: LinkContribution[];
  codeBlocks: CodeBlockContribution[];
  floatingViews: FloatingViewContribution[];
  suggestFor: SuggestKind[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  author?: string;
  description: string;
  icon?: string;
  license?: string;
  repository?: string;
  /** 兼容的 Textus 版本："^1.2.0", ">=1.2.0"。 */
  engine: string;
  /** 运行平台；未设时默认全平台，后台除外（仅桌面）。 */
  platforms: readonly PluginPlatform[];
  /** 入口代码，在插件宿主运行；纯主题插件可为空。 */
  main?: string[];
  /** 后台任务代码，与 main 分开、无编辑器/UI；需 background 权限。 */
  background?: string;
  activationEvents: string[];
  permissions: Permission[];
  requires: Requirement[];
  contributes: Contributes;
  /** `%key%` 字符串，按语言。 */
  l10n: Record<string, Record<string, string>>;
}

const ID = /^[a-z0-9][a-z0-9-]{0,63}\.[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** 解析 `raw`（文件文本或已解析 JSON），逐字段校验；
 *  出错抛 ManifestError。 */
export function parseManifest(raw: string | unknown): PluginManifest {
  let json: unknown = raw;
  if (typeof raw === "string") {
    try {
      json = JSON.parse(raw);
    } catch (err) {
      throw new ManifestError(`textus-plugin.json is not JSON: ${String(err)}`);
    }
  }
  const m = object(json, "textus-plugin.json");
  const id = text(m.id, "id");
  if (!ID.test(id))
    throw new ManifestError(`id "${id}" must be publisher.name, lowercase.`);
  const version = text(m.version, "version");
  if (!VERSION.test(version))
    throw new ManifestError(`version "${version}" must be like 1.0.0.`);
  const engines = object(m.engines ?? {}, "engines");
  const permissions = list(m.permissions, "permissions").map((p) => {
    if (!isPermission(p))
      throw new ManifestError(`No permission "${String(p)}".`);
    return p;
  });
  const background = text(m.background, "background", true) || undefined;
  const requires = list(m.requires, "requires").map((r, i) => {
    const need = object(r, `requires[${i}]`);
    const setting = text(need.setting, `requires[${i}].setting`);
    if (!(REQUIRED_SETTINGS as readonly string[]).includes(setting))
      throw new ManifestError(
        `requires[${i}].setting "${setting}" is not one of ${REQUIRED_SETTINGS.join(", ")}.`,
      );
    return {
      setting: setting as RequiredSetting,
      reason: text(need.reason, `requires[${i}].reason`, true) || undefined,
    };
  });
  // 后台代码，或要求后台运行：仅桌面。
  const inBackground =
    !!background || requires.some((r) => r.setting === "runInBackground");
  const platforms: readonly PluginPlatform[] =
    m.platforms === undefined
      ? inBackground
        ? ["desktop"]
        : PLUGIN_PLATFORMS
      : list(m.platforms, "platforms").map((p) => {
          if (!(PLUGIN_PLATFORMS as readonly unknown[]).includes(p))
            throw new ManifestError(
              `No platform "${String(p)}": desktop or ios.`,
            );
          return p as PluginPlatform;
        });
  if (inBackground && platforms.includes("ios"))
    throw new ManifestError(
      "The background is the desktop's only: platforms can't name ios.",
    );
  const l10n: PluginManifest["l10n"] = {};
  if (m.l10n !== undefined)
    for (const [lang, table] of Object.entries(object(m.l10n, "l10n"))) {
      const strings = object(table, `l10n.${lang}`);
      l10n[lang] = Object.fromEntries(
        Object.entries(strings).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
  const contributes = parseContributes(m.contributes, id);
  if (contributes.embeds.length && !permissions.includes("files.read"))
    throw new ManifestError("contributes.embeds needs files.read.");
  return {
    id,
    name: text(m.name, "name"),
    version,
    publisher: text(m.publisher, "publisher"),
    author: text(m.author, "author", true) || undefined,
    description: text(m.description, "description", true),
    icon: text(m.icon, "icon", true) || undefined,
    license: text(m.license, "license", true) || undefined,
    repository: text(m.repository, "repository", true) || undefined,
    engine: text(engines.textus, "engines.textus"),
    platforms,
    main: parseMain(m.main),
    background,
    activationEvents: list(m.activationEvents, "activationEvents").map((e, i) =>
      text(e, `activationEvents[${i}]`),
    ),
    permissions,
    requires,
    contributes,
    l10n,
  };
}

/** `%key%` 按 `lang` 查找（自己的、基础语言的、英文、任何语言），
 *  其它情况原样返回。 */
export function localize(
  manifest: Pick<PluginManifest, "l10n">,
  value: string,
  lang: string,
): string {
  const key = /^%([^%]+)%$/.exec(value)?.[1];
  if (!key) return value;
  return (
    manifest.l10n[lang]?.[key] ??
    manifest.l10n[lang.split("-")[0]]?.[key] ??
    manifest.l10n.en?.[key] ??
    Object.values(manifest.l10n).find((table) => key in table)?.[key] ??
    key
  );
}

function versionParts(version: string): [number, number, number, string] {
  const [core, pre = ""] = version.split("-", 2);
  const [major = 0, minor = 0, patch = 0] = core.split(".").map(Number);
  return [major, minor, patch, pre];
}

/** -1 / 0 / 1，按 semver 顺序：预发布在正式版之前。 */
export function compareVersions(a: string, b: string): number {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < 3; i++)
    if (x[i] !== y[i]) return (x[i] as number) < (y[i] as number) ? -1 : 1;
  if (x[3] === y[3]) return 0;
  if (!x[3]) return 1;
  if (!y[3]) return -1;
  return x[3] < y[3] ? -1 : 1;
}

/** `version` 是否满足 `range`：`^1.3.0`、`>=1.3.0`、`1.3.x` 或精确。 */
export function engineSatisfied(range: string, version: string): boolean {
  const r = range.trim();
  if (r === "*") return true;
  const base = r.replace(/^(>=|\^)/, "").trim();
  const release = base.includes("-") ? version : version.split("-")[0];
  if (r.startsWith(">=")) return compareVersions(release, base) >= 0;
  if (r.startsWith("^")) {
    const [major] = versionParts(base);
    return (
      compareVersions(release, base) >= 0 && versionParts(release)[0] === major
    );
  }
  const wild = /^(\d+)\.(\d+)\.x$/.exec(r);
  if (wild) {
    const [major, minor] = versionParts(release);
    return major === Number(wild[1]) && minor === Number(wild[2]);
  }
  return compareVersions(release, r) === 0;
}

/** `fileName` 是否匹配自定义编辑器的模式：`*` 匹配任意字符序列，大小写不敏感。 */
export function matchesFilename(pattern: string, fileName: string): boolean {
  const re = new RegExp(
    `^${pattern
      .toLowerCase()
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}$`,
  );
  return re.test(fileName.toLowerCase());
}
