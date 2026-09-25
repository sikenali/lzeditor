# B09 LaTeX 数学公式

在文档中插入行内公式和独立公式，支持 KaTeX 渲染。

---

## 行内公式

用单个美元符号 \`$\` 包裹：

```markdown
质能方程 $E = mc^2$ 是物理学中最著名的公式。
```

渲染效果：质能方程 $E = mc^2$ 是物理学中最著名的公式。

---

## 独立公式

用两个美元符号 \`$$\` 包裹，独占一行：

```markdown
$$
\int_{-\infty}^{+\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

渲染效果：

$$
\int_{-\infty}^{+\infty} e^{-x^2} dx = \sqrt{\pi}
$$

---

## 常用符号

| 符号 | 写法 | 说明 |
|------|------|------|
| $\alpha$ — \`\\alpha\` | 希腊字母 α |
| $\beta$ — \`\\beta\` | 希腊字母 β |
| $\sum$ — \`\\sum\` | 求和符号 |
| $\prod$ — \`\\prod\` | 连乘符号 |
| $\infty$ — \`\\infty\` | 无穷大 |
| $\partial$ — \`\\partial\` | 偏导数 |
| $\nabla$ — \`\\nabla\` | Nabla 算子 |
| $\forall$ — \`\\forall\` | 任意 |
| $\exists$ — \`\\exists\` | 存在 |

---

## 分数与根式

```markdown
分数：$\frac{a}{b}$  或  $\dfrac{a}{b}$（更大）

根式：$\sqrt{x}$  或  $\sqrt[n]{x}$
```

---

## 矩阵

```markdown
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$
```

---

## 对齐的多行公式

```markdown
$$
\begin{aligned}
  f(x) &= x^2 + 2x + 1 \\
       &= (x+1)^2
\end{aligned}
$$
```

---

## 条件表达式

```markdown
$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$
```

---

## 设置路径

「设置 → 编辑器 → 数学公式」：

- [x] 启用 KaTeX 渲染
- 公式字体大小（默认 1.0em）
- 独立公式居中显示

---

## 导出支持

| 格式 | 支持情况 |
|------|---------|
| **HTML** — ✅ KaTeX CDN 自动加载 |
| **PDF** — ✅ 内嵌公式图片 |
| **DOCX** — ⚠️ 部分公式转为图片 |
| **Markdown** — ✅ 保留源码 |
