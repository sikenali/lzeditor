# B08 HTML 代码

在 Markdown 中插入原生 HTML，突破 Markdown 语法限制。

---

## 为什么需要 HTML？

Markdown 语法简洁，但有以下局限：

- 无法直接设置元素颜色、大小
- 无法插入 iframe、视频
- 无法使用自定义属性（如 \`data-\`）
- 无法控制布局（flex/grid）

此时可在 Markdown 中直接嵌入 HTML 标签。

---

## 基本用法

HTML 标签可直接写在 Markdown 内容中：

```html
<span style="color: red; font-size: 18px;">红色大字</span>
```

渲染效果：<span style="color: red; font-size: 18px;">红色大字</span>

---

## 常用场景

### 文字颜色

```html
<span style="color: #e74c3c;">红色文字</span>
<span style="color: #27ae60;">绿色文字</span>
<span style="color: #3498db;">蓝色文字</span>
```

### 背景高亮

```html
<span style="background: #fff3cd; padding: 2px 6px; border-radius: 4px;">黄色高亮</span>
```

### 徽章标签

```html
<span style="display:inline-block; padding:2px 8px; border-radius:4px; 
     background:#e8f5e9; color:#2e7d32; font-size:12px;">NEW</span>
```

### 分隔区块

```html
<div style="border-left:4px solid #6366f1; padding-left:16px; margin:16px 0;
     color:#555; font-style:italic;">
  这是侧边标注区块，适合放置补充说明。
</div>
```

---

## 表格（HTML）

当 Markdown 表格不支持合并单元格时，使用 HTML 表格：

```html
<table border="1" cellpadding="8" cellspacing="0">
  <tr>
    <th colspan="2">合并标题</th>
  </tr>
  <tr>
    <td>A1</td>
    <td>B1</td>
  </tr>
</table>
```

---

## iframe 嵌入

```html
<iframe src="https://example.com" width="100%" height="400" 
        style="border:1px solid #ddd; border-radius:8px;"></iframe>
```

> ⚠️ 嵌入外部网站可能受对方 CSP 策略限制而无法显示。

---

## 注意事项

- **转义** — HTML 标签在代码块中不会被解析，需用 `< >` 转义
- **安全** — 部分 HTML 标签（如 `<script>`）在导出时被过滤
- **兼容性** — 不同导出格式对 HTML 支持程度不同
- **回退** — 若渲染异常，检查标签是否正确闭合

---

## 支持/不支持的标签

- `<span>` `<div>` `<p>` — ✅ 支持
- `<style>` — ❌ 导出时过滤
- `<script>` — ❌ 安全过滤
- `<iframe>` — ⚠️ 部分导出支持
- `<img>` — ✅ 支持
- `<a>` — ✅ 支持
