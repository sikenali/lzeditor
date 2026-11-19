# 设计文档 — lzeditor 界面 UI 全面切换 Nebula（DESIGN-1 v2 电光青）

> 状态：**待批准**（批准前不写产品代码）
> 日期：2026-11-19
> 参考：`/home/jingle/opc/DESIGN-1.md`（bid-platform 统一设计规范 v2 科技紧凑版）、`/home/jingle/opc/lzc2vsdx/frontend/src/styles/{tokens.css,base.css}`（Nebula 参考实现）

---

## 1. 需求与决策

**用户请求**：「结合 lzc2vsdx 项目的样式 以及 DESIGN-1.md 的设计规范 重新对界面ui 进行优化」

**brainstorming 澄清后的决策：**
| 维度 | 决策 |
|---|---|
| 风格方向 | **全面切换 Nebula 电光青**（主强调 `#00D4AA`，浅色冷科技 `#F4F7FA`，深色深空 `#0A0F18`） |
| 覆盖范围 | **整站 UI**（主编辑器 + 设置弹窗 + 侧栏面板 + 欢迎页 + AI 聊天抽屉 + 全部对话框） |
| 主题模型 | 保留 **浅色/深色双主题**，两者都切到 Nebula 值（不删深色模式） |
| 强调色模型 | 保留 lzeditor 现有 **JS 内联强调色机制**（`applyTheme` 写 `--color-primary` + `--accent-*`），仅把 `ACCENT_PRESETS` 换成 **Nebula 五色**、默认青 |

**不做的（明确排除）：**
- 不重写布局结构（topbar/sidebar 模式、Tab Bar、页脚 58px 等 DESIGN-1 §2 布局模板）——lzeditor 是编辑器不是 bid 工具套件，其 Toolbar/LeftNav/statusbar 布局保留，只做**视觉与 token 对齐**。
- 不改 Milkdown/CM6 编辑器内核行为，不改 AI 面板功能逻辑。
- 不新增依赖（Space Grotesk 已自托管，无需下载）。

---

## 2. 现状分析（lzeditor 基线）

**主题机制（关键约束）：**
- 运行时**唯一真源**是 `src/styles/themes.ts` 的 `themeTokens.parchment/dark` 对象，由 `hooks/useTheme.ts` 的 `applyTheme()` 内联写到 `<html>`（`--color-*` + `--t-*` + `--accent-*`）。
- `src/styles/tokens.css` 的 `:root` 只有**回退默认值**（被运行时覆盖），是**唯一**含硬编码暖色 hex 的文件（8 处：`#C0392B`/`#FBE9E7`/`#FAF7F2`/`#F7F3EA`/`#FCFBF8`/`#E5DFD3`/`#EDE9E0`/`#D9D2C2`）。
- 其余所有 CSS（`globals.css`/`layout.css`/`panels.css`/`settings-dialog.css`/`read-mode.css`/`ai-chat.css` 等）**全部经 `var(--color-*)` / `var(--accent-*)` token 取值**，无散落硬编码暖色。
- 已具备 DESIGN-1 v2 部分基础：`--color-system-blue #007AFF`、`--color-glow #00D4AA`、主题感知 modal/popover 阴影、`data-theme`/`data-palette`/`data-accent` 属性。

**现状 vs Nebula 差异：**
| 维度 | 现状 | Nebula 目标 |
|---|---|---|
| 主强调 | 朱红 `#C0392B`（dark `#E05050`） | 电光青 `#00D4AA`（dark `#00F5C8`），on-primary `#0A1628` |
| 浅色基底 | 羊皮纸 `#FAF7F2`/`#F7F3EA`/`#FCFBF8` | 冷科技 `#F4F7FA`/`#EEF2F7`/`#FFFFFF` |
| 浅色文字 | `#1F1D1A`/`#3A3A3A`/`#6E6A60` | `#0D1B2A`/`#1A2A3A`/`#4A5568` |
| 浅色边框 | `#E5DFD3`/`#EDE9E0`/`#D9D2C2` | `#D4DEEB`/`#E8EDF4`/`#B8C5D6` |
| 深色基底 | `#17171A`/`#1C1C1F`/`#232324` | 深空 `#0A0F18`/`#0F1623`/`#151D2C` |
| 深色文字 | `#F2F3F5`/`#DDE0E6`/`#C9CDD4` | `#E8EEF5`/`#C8D3E0`/`#94A3B8` |
| 深色边框 | `#2A2B2E`/`#3A3B3F` | `#1E2A3A`/`#162030`/`#2A3A50` |
| 强调色板 | 朱红/鎏金/玉绿/云蓝/黛墨 | Nebula 青/金/绿/蓝/珊瑚 |
| glow 光效 | 仅 `--color-glow` + `--accent-glow`(0 0 12px) | **`--glow-xs/sm/md/lg`** 体系 + `--btn-shadow` |
| 动效 | fast150/base200/slow300 | **snap80/fast120/base180/slow280**，spring `cubic-bezier(0.34,1.56,0.64,1)` |
| 显示字体 | 无 `--font-display`（Space Grotesk 仅作正文主题选项） | **`--font-display: 'Space Grotesk'`** 接标题/品牌 |

---

## 3. 设计规范（Nebula 目标值）

### 3.1 强调色（Accent）— Nebula 五色
| id | 名称 | Light | Light-soft | Light-deep | Dark | Dark-soft |
|---|---|---|---|---|---|---|
| **cyan**（默认） | 电光青 | `#00D4AA` | `#E8FFF8` | `#0A6B5A` | `#00F5C8` | `#0A2A25` |
| gold | 赛博金 | `#FFB347` | `#FFF8E6` | `#C67A10` | `#FFCC66` | `#1E1508` |
| green | 星云绿 | `#00A878` | `#E6FFF4` | `#008A62` | `#00D4AA` | `#0A2A22` |
| blue | 琉璃蓝 | `#4A9EFF` | `#EBF4FF` | `#2D7FD9` | `#6BB3FF` | `#0C1A2E` |
| coral | 霓虹珊瑚 | `#FF4D6D` | `#FFF0F3` | `#D13A56` | `#FF6B85` | `#1E0C12` |

- `--color-on-primary` 恒为 `#0A1628`（深墨字压在亮青上，Nebula 特征）。
- 深色下主强调自动提亮（`#00D4AA`→`#00F5C8`），`ensureDarkAccent` 亮度地板逻辑保留但需核对：青本身够亮，不会被误提。

### 3.2 浅色·Light（Nebula 冷科技）
```
--color-bg-main #F4F7FA  --color-bg-secondary #EEF2F7  --color-bg-card #FFFFFF
--color-text-primary #0D1B2A  --text-body #1A2A3A  --secondary #4A5568  --muted #718096  --faint #A0AEC0
--color-border #D4DEEB  --border-soft #E8EDF4  --border-hover #B8C5D6
--color-success #00A878  --success-soft #E6FFF4
--color-info #4A9EFF  --info-soft #EBF4FF
--color-warning #E8960C  --warning-soft #FFF8E6
--color-error #FF4D6D  --error-soft #FFF0F3
```

### 3.3 深色·Dark（Nebula 深空科技）
```
--color-bg-main #0A0F18  --color-bg-secondary #0F1623  --color-bg-card #151D2C
--color-text-primary #E8EEF5  --text-body #C8D3E0  --secondary #94A3B8  --muted #64748B  --faint #475569
--color-border #1E2A3A  --border-soft #162030  --border-hover #2A3A50
--color-success #00D4AA  --success-soft #0A2A22
--color-info #6BB3FF  --info-soft #0C1A2E
--color-warning #FFB347  --warning-soft #1E1508
--color-error #FF6B85  --error-soft #1E0C12
```

### 3.4 阴影 / glow / 圆角 / 动效 / 字体
```
/* 常规阴影（主题感知） */
light:  --shadow-xs 0 1px 3px rgba(0,0,0,0.04)  --shadow-sm 0 1px 3px rgba(0,0,0,0.04)
        --shadow-md 0 4px 16px rgba(0,0,0,0.06)  --shadow-lg 0 8px 32px rgba(0,0,0,0.08)  --shadow-xl 0 12px 40px rgba(0,0,0,0.12)
dark:   --shadow-xs 0 1px 3px rgba(0,0,0,0.50)  ... --shadow-xl 0 12px 40px rgba(0,0,0,0.80)
/* glow（电光青，随强调色 rgb 变量） */
--glow-xs 0 2px 8px  rgba(var(--tech-cyan-rgb),0.08)
--glow-sm 0 4px 20px rgba(var(--tech-cyan-rgb),0.12)
--glow-md 0 8px 32px rgba(var(--tech-cyan-rgb),0.18)
--glow-lg 0 12px 48px rgba(var(--tech-cyan-rgb),0.25)
--btn-shadow rgba(0,212,170,0.28)
/* 圆角：xs4/sm8/md12/lg16/xl20/full（现状已一致，不改） */
/* 动效：snap80/fast120/base180/slow280，ease cubic-bezier(0.4,0,0.2,1)，spring cubic-bezier(0.34,1.56,0.64,1) */
/* 字体：--font-display 'Space Grotesk'（标题/品牌/数字），--font-mono JetBrains Mono，--font-family Inter+思源黑体 */
```

### 3.5 玻璃态 / 焦点环
- 焦点环：`0 0 0 3px rgba(var(--tech-cyan-rgb),0.4)`（Nebula 电光青虚化外环，替代现有 `--accent-a40` 焦点环；保留 `--color-system-blue` 作为设置导航激活的次强调）。
- 玻璃态：保留现有 `--glass-*` 机制，但深色玻璃底改深空色（`rgba(13,15,20,0.72)` 或 Nebula `rgba(15,22,35,*)`）。

---

## 4. 实施范围（整站 UI 面）

| # | 表面 | 主要改动 |
|---|---|---|
| 1 | **Token 层** | `themes.ts` parchment/dark 全量换 Nebula 值；`ACCENT_PRESETS`→Nebula 五色；`tokens.css :root` 换 Nebula 回退值；加 `--tech-cyan(-rgb)`/`--glow-*`/`--font-display`；收紧 `--t-*` |
| 2 | **useTheme** | 默认 accent `cyan`；`resolveAccentId` 默认 cyan；`getAccentColor` 回退 cyan；核对 `ensureDarkAccent` 地板 |
| 3 | **settingsStore** | 默认 `accentColor: 'cyan'` |
| 4 | **主编辑器 chrome** | Toolbar / LeftNav / Footer / statusbar / DocumentMetaBar：激活态、hover、图标、标签色经 `--color-primary`/`--accent-*` 已自动跟随，主要核对玻璃态与边框 |
| 5 | **设置弹窗** | SettingsDialog + settings 标签页：强调色选择器用 Nebula 五色（`ACCENT_PRESETS` 自动更新）；mockup 色块（引用 `ACCENT_PRESETS[i].color` 自动跟随）；检查硬编码深空晕 |
| 6 | **侧栏/面板** | SidebarOutline / SidebarPreview / LibraryPanel / SearchPanel / StyleMainPanel / HistoryPanel |
| 7 | **对话框** | Chart/Code/Emoji/Export/Formula/Image/Link/TableDropdown |
| 8 | **编辑器** | Milkdown / CodeEditor / ReadMode / CodeDialog 的代码主题与选区、滚动条、选区高亮（`--selection-bg` 用 accent） |
| 9 | **AI 聊天抽屉** | ai-chat.css：发送钮 glow、头像/徽章 accent、消息气泡 |
| 10 | **欢迎页** | WelcomeScreen：欢迎卡片、kbd、tile（用 `--t-wl-*`，主题对已存在） |
| 11 | **滚动条** | `base.css` 风格：6px 细滚动条，`scrollbar-thumb rgba(0,0,0,0.15)`，深色 `rgba(255,255,255,0.12)` |

> 因绝大部分视觉已 token 化，第 4–11 项主要是**核对 + 少量硬编码修正**，主力在第 1–3 项（token 换血）。

---

## 5. 已知取舍 / 风险

1. **深色边框对比度**：Nebula 深色边框 `#1E2A3A`/`#162030` 比 DESIGN-1 §7 墨夜版规定的 `≥ #2A2B2E` 更暗更细腻。这是 **lzc2vsdx 实际发货值**（视觉参考优先），边框更含蓄、深空感更强。§7 的对比度地板视为**建议性**——如你希望严格合规，可单独提亮深色边框，但会偏离 lzc2vsdx 观感。**默认跟随 lzc2vsdx。**
2. **深色次要文字**：`--color-text-muted #64748B` 在深空底上对比度约 4.4:1（§7 要求 ≥4.5:1），临界。跟随 lzc2vsdx 原值，不做提升。
3. **强调色迁移**：现有用户 localStorage 里可能存了旧的朱红/鎏金等 accent hex；`resolveAccent` 对 `#` 开头的值直接采用，旧 hex 会保留生效（不崩）。若存的是旧 preset id（如 `vermilion`），映射到新色板时找不到会回退默认青。可接受，无需迁移脚本。
4. **`--t-*` 组件级主题对**：`themes.ts` 里大量 `--t-*`（veil/fg/shadow/surface 等）是 parchment/dark 手写对。切换 Nebula 后，这些**暖色基底派生值需核对**（尤其 `--t-hui-bg #FDF9F0`、`--t-bg-18 rgba(244,244,244,1)` 等浅色硬值要改冷调），否则浅色下会有零星暖色残留。
5. **Milkdown/CM6 内容主题**：正文排版主题（typography-themes / acks-themes / code-themes）不强行换——它们是「正文阅读」域，与 app chrome 分离。仅确认默认主题在 Nebula 底色上可读。

---

## 6. 验证计划

1. `npm run typecheck` 0 错误。
2. `npm test` 全量通过（含既有 boundary 断言：`mode-boundary`、`cm6-core-boundary`、`history-panel-single-render` 等）。若测试断言硬编码朱红/羊皮纸值，需同步更新为 Nebula。
3. 浏览器手测：浅色/深色各一遍，遍历 整站 UI 面（§4 表），重点核对：强调色青、on-primary 深字、glow 光效、玻璃态、滚动条、AI 抽屉、设置强调色选择器切换 5 色即时生效。
4. 读屏器/键盘焦点环：焦点环为电光青外环（`rgba(var(--tech-cyan-rgb),0.4)`），在深浅底上均可见。
5. 打包验证：`LPK_VERSION=<next> bash lzc/package.sh` → 安装 → 盒上核对。

---

## 7. 验收标准（Definition of Done）

- [ ] `themes.ts` 浅/深 token 全量 = Nebula 值（§3.2/3.3），`ACCENT_PRESETS` = Nebula 五色，默认青。
- [ ] `tokens.css :root` 回退值 = Nebula 值，无残留暖色硬编码 hex（§5.4 的 `--t-*` 冷调核对完毕）。
- [ ] 整站 UI（§4 全部表面）在浅/深两主题下无「羊皮纸暖色/朱红」残留观感。
- [ ] `--font-display` 接入，标题/品牌/数字用 Space Grotesk。
- [ ] `--glow-*` 体系接入关键 CTA / 激活态 / 焦点。
- [ ] typecheck + 全量测试通过。
