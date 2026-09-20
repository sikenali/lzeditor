// 6 套代码高亮配色方案，源自 xedit 的 CODE_THEMES 注册表。
// 支持 Mac 风格窗口装饰（三个圆点：红黄绿）。

export interface CodeTheme {
  id: string
  name: string
  /** highlight.js 样式文件名（无扩展名） */
  file: string
  dark: boolean
  /** Mac 窗口底色（装饰条背景） */
  macBg: string
  /** 缩略图预览色块 */
  swatch: string[]
}

export const CODE_THEMES: CodeTheme[] = [
  {
    id: 'atom-one-dark',
    name: 'Atom One 暗',
    file: 'atom-one-dark',
    dark: true,
    macBg: '#282c34',
    swatch: ['#282c34', '#c678dd', '#98c379', '#61aeee', '#e5c07b', '#e06c75'],
  },
  {
    id: 'atom-one-light',
    name: 'Atom One 亮',
    file: 'atom-one-light',
    dark: false,
    macBg: '#fafafa',
    swatch: ['#fafafa', '#986801', '#50a14f', '#c45a03', '#22863a', '#a61717'],
  },
  {
    id: 'github',
    name: 'GitHub',
    file: 'github',
    dark: false,
    macBg: '#f6f8fa',
    swatch: ['#f6f8fa', '#d73a49', '#005cc5', '#032f62', '#6a737d', '#22863a'],
  },
  {
    id: 'monokai',
    name: 'Monokai',
    file: 'monokai',
    dark: true,
    macBg: '#272822',
    swatch: ['#272822', '#f92672', '#a6e22e', '#e6db74', '#66d9ef', '#fd971f'],
  },
  {
    id: 'vs2015',
    name: 'VS 2015',
    file: 'vs2015',
    dark: true,
    macBg: '#1e1e1e',
    swatch: ['#1e1e1e', '#569cd6', '#4ec9b0', '#d4d4d4', '#ce9178', '#608b4e'],
  },
  {
    id: 'xcode',
    name: 'Xcode',
    file: 'xcode',
    dark: false,
    macBg: '#ffffff',
    swatch: ['#ffffff', '#c1390d', '#007aff', '#4a5562', '#8174d6', '#35a35b'],
  },
]

export function getCodeTheme(id: string): CodeTheme {
  return CODE_THEMES.find(t => t.id === id) ?? CODE_THEMES[0]
}

/** Get a sample code string for the given language and theme */
export function getSampleCode(lang: string): string {
  const samples: Record<string, string> = {
    python: 'def hello():\n    print("Hello, World!")\n\n# 注释\nx: int = 42',
    javascript: 'const greet = (name) => {\n  console.log(`Hello, ${name}!`);\n};\n\ngreet("World");',
    typescript: 'interface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = { name: "Alice", age: 30 };',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}',
    rust: 'fn main() {\n    println!("Hello, World!");\n    let x = vec![1, 2, 3];\n}',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    css: 'body {\n  font-family: system-ui, sans-serif;\n  color: #333;\n  background: #fff;\n}',
    html: '<!DOCTYPE html>\n<html lang="zh">\n<head>\n  <title>Hello</title>\n</head>\n<body>\n  <p>Hello, World!</p>\n</body>\n</html>',
  }
  return samples[lang] ?? samples.javascript
}
