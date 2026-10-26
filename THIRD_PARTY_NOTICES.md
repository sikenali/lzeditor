# Third-party notices

lzeditor 以 LPK 包分发，前端产物把第三方依赖打包进 minified bundle。
本文件说明用到的每个第三方包及其许可证。

本文件由 `node scripts/generate-third-party-notices.mjs` 生成，请勿手改。
只统计运行时依赖：lock 文件里标记 dev 的（vite / typescript / electron-builder /
@babel 等）不进 LPK，不列。

## 许可证合规说明

- **Apache-2.0** 要求保留版权与许可证声明（§4），THIRD_PARTY_LICENSES.txt 已附全文。
- **BSD-3-Clause** 要求版权声明出现在随分发的文档中，已满足。
- **双许可的包必须选定一个选项**，否则整份分发会被主张为更严的那个：
  - `jszip 3.10.2` — MIT 或 GPL-3.0，本项目**按 MIT 使用**。不声明这一点，
    GPL-3.0 的传染性会波及整个 LPK。
  - `dompurify 3.4.15` — MPL-2.0 或 Apache-2.0，本项目**按 Apache-2.0 使用**。
- `khroma` 等包在 package.json 里省略了 license 字段，脚本按包自带的 LICENSE 文件内容推断。
- 所有包均未经修改使用，源码可从公共 registry（npmjs.com）获取。

## MIT（156 个包）

| 包 | 版本 |
|---|---|
| `@antfu/install-pkg` | 2.1.0 |
| `@braintree/sanitize-url` | 7.1.2 |
| `@codemirror/autocomplete` | 6.20.4 |
| `@codemirror/commands` | 6.11.1 |
| `@codemirror/lang-angular` | 0.1.4 |
| `@codemirror/lang-cpp` | 6.0.3 |
| `@codemirror/lang-css` | 6.3.1 |
| `@codemirror/lang-go` | 6.0.1 |
| `@codemirror/lang-html` | 6.4.12 |
| `@codemirror/lang-java` | 6.0.2 |
| `@codemirror/lang-javascript` | 6.2.5 |
| `@codemirror/lang-jinja` | 6.0.1 |
| `@codemirror/lang-json` | 6.0.2 |
| `@codemirror/lang-less` | 6.0.2 |
| `@codemirror/lang-liquid` | 6.3.3 |
| `@codemirror/lang-markdown` | 6.5.2 |
| `@codemirror/lang-php` | 6.0.2 |
| `@codemirror/lang-python` | 6.2.1 |
| `@codemirror/lang-rust` | 6.0.2 |
| `@codemirror/lang-sass` | 6.0.2 |
| `@codemirror/lang-sql` | 6.10.0 |
| `@codemirror/lang-vue` | 0.1.3 |
| `@codemirror/lang-wast` | 6.0.2 |
| `@codemirror/lang-xml` | 6.1.0 |
| `@codemirror/lang-yaml` | 6.1.3 |
| `@codemirror/language` | 6.13.1 |
| `@codemirror/language-data` | 6.5.2 |
| `@codemirror/legacy-modes` | 6.5.5 |
| `@codemirror/lint` | 6.9.7 |
| `@codemirror/search` | 6.7.2 |
| `@codemirror/state` | 6.7.6 |
| `@codemirror/streamparser` | 6.0.0 |
| `@codemirror/view` | 6.43.15 |
| `@iconify/types` | 2.0.0 |
| `@iconify/utils` | 3.1.7 |
| `@lezer/common` | 1.5.4 |
| `@lezer/cpp` | 1.1.6 |
| `@lezer/css` | 1.3.9 |
| `@lezer/go` | 1.0.1 |
| `@lezer/highlight` | 1.2.5 |
| `@lezer/html` | 1.3.13 |
| `@lezer/java` | 1.1.5 |
| `@lezer/javascript` | 1.5.6 |
| `@lezer/json` | 1.0.3 |
| `@lezer/lr` | 1.4.11 |
| `@lezer/markdown` | 1.8.1 |
| `@lezer/php` | 1.0.6 |
| `@lezer/python` | 1.1.19 |
| `@lezer/rust` | 1.0.3 |
| `@lezer/sass` | 1.1.0 |
| `@lezer/xml` | 1.0.6 |
| `@lezer/yaml` | 1.0.4 |
| `@marijn/find-cluster-break` | 1.0.4 |
| `@mermaid-js/parser` | 1.2.1 |
| `@types/d3` | 7.4.3 |
| `@types/d3-array` | 3.2.2 |
| `@types/d3-axis` | 3.0.6 |
| `@types/d3-brush` | 3.0.6 |
| `@types/d3-chord` | 3.0.6 |
| `@types/d3-color` | 3.1.3 |
| `@types/d3-contour` | 3.0.6 |
| `@types/d3-delaunay` | 6.0.4 |
| `@types/d3-dispatch` | 3.0.7 |
| `@types/d3-drag` | 3.0.7 |
| `@types/d3-dsv` | 3.0.7 |
| `@types/d3-ease` | 3.0.2 |
| `@types/d3-fetch` | 3.0.7 |
| `@types/d3-force` | 3.0.10 |
| `@types/d3-format` | 3.0.4 |
| `@types/d3-geo` | 3.1.1 |
| `@types/d3-hierarchy` | 3.1.7 |
| `@types/d3-interpolate` | 3.0.4 |
| `@types/d3-path` | 3.1.1 |
| `@types/d3-polygon` | 3.0.2 |
| `@types/d3-quadtree` | 3.0.6 |
| `@types/d3-random` | 3.0.4 |
| `@types/d3-scale` | 4.0.9 |
| `@types/d3-scale-chromatic` | 3.1.0 |
| `@types/d3-selection` | 3.0.12 |
| `@types/d3-shape` | 3.2.0 |
| `@types/d3-time` | 3.0.4 |
| `@types/d3-time-format` | 4.0.3 |
| `@types/d3-timer` | 3.0.2 |
| `@types/d3-transition` | 3.0.9 |
| `@types/d3-zoom` | 3.0.9 |
| `@types/geojson` | 7946.0.16 |
| `@types/prop-types` | 15.7.15 |
| `@types/react` | 18.3.31 |
| `@upsetjs/venn.js` | 2.0.0 |
| `commander` | 15.0.0 |
| `commander` | 7.2.0 |
| `commander` | 8.3.0 |
| `core-util-is` | 1.0.2 |
| `cose-base` | 1.0.3 |
| `cose-base` | 2.2.0 |
| `crelt` | 1.0.7 |
| `csstype` | 3.2.3 |
| `cytoscape` | 3.34.4 |
| `cytoscape-cose-bilkent` | 4.1.0 |
| `cytoscape-fcose` | 2.2.0 |
| `dagre-d3-es` | 7.0.14 |
| `dayjs` | 1.11.23 |
| `echarts-for-react` | 3.0.6 |
| `emoji-picker-react` | 4.22.2 |
| `es-toolkit` | 1.53.0 |
| `fast-deep-equal` | 3.1.3 |
| `fastdom` | 1.0.12 |
| `hachure-fill` | 0.5.2 |
| `html-to-image` | 1.11.13 |
| `iconv-lite` | 0.6.3 |
| `immediate` | 3.0.6 |
| `import-meta-resolve` | 4.2.0 |
| `isarray` | 1.0.0 |
| `js-tokens` | 4.0.0 |
| `katex` | 0.16.47 |
| `katex` | 0.18.7 |
| `khroma` | 2.1.0 |
| `layout-base` | 1.0.2 |
| `layout-base` | 2.0.1 |
| `lie` | 3.3.0 |
| `linkify-it` | 6.1.0 |
| `lodash-es` | 4.18.1 |
| `loose-envify` | 1.4.0 |
| `markdown-it` | 15.0.2 |
| `markdown-it-footnote` | 4.0.0 |
| `marked` | 16.4.2 |
| `mdurl` | 2.1.0 |
| `mermaid` | 11.17.2 |
| `package-manager-detector` | 1.9.0 |
| `path-data-parser` | 0.1.0 |
| `points-on-curve` | 0.2.0 |
| `points-on-path` | 0.2.1 |
| `prettier` | 3.9.8 |
| `process-nextick-args` | 2.0.1 |
| `punycode.js` | 2.3.1 |
| `react` | 18.3.1 |
| `react-dom` | 18.3.1 |
| `readable-stream` | 2.3.8 |
| `roughjs` | 4.6.6 |
| `safe-buffer` | 5.1.2 |
| `safer-buffer` | 2.1.2 |
| `scheduler` | 0.23.2 |
| `setimmediate` | 1.0.5 |
| `shipstyles` | 1.0.0 |
| `strictdom` | 1.0.1 |
| `string_decoder` | 1.1.1 |
| `style-mod` | 4.1.4 |
| `stylis` | 4.4.0 |
| `tinyexec` | 1.3.1 |
| `ts-dedent` | 2.3.0 |
| `uc.micro` | 3.0.0 |
| `use-sync-external-store` | 1.7.0 |
| `util-deprecate` | 1.0.2 |
| `uuid` | 14.0.3 |
| `w3c-keyname` | 2.2.8 |
| `zustand` | 4.5.7 |

## ISC（35 个包）

| 包 | 版本 |
|---|---|
| `d3` | 7.9.0 |
| `d3-array` | 3.2.4 |
| `d3-axis` | 3.0.0 |
| `d3-brush` | 3.0.0 |
| `d3-chord` | 3.0.1 |
| `d3-color` | 3.1.0 |
| `d3-contour` | 4.0.2 |
| `d3-delaunay` | 6.0.4 |
| `d3-dispatch` | 3.0.1 |
| `d3-drag` | 3.0.0 |
| `d3-dsv` | 3.0.1 |
| `d3-fetch` | 3.0.1 |
| `d3-force` | 3.0.0 |
| `d3-format` | 3.1.2 |
| `d3-geo` | 3.1.1 |
| `d3-hierarchy` | 3.1.2 |
| `d3-interpolate` | 3.0.1 |
| `d3-path` | 3.1.0 |
| `d3-polygon` | 3.0.1 |
| `d3-quadtree` | 3.0.1 |
| `d3-random` | 3.0.1 |
| `d3-scale` | 4.0.2 |
| `d3-scale-chromatic` | 3.1.0 |
| `d3-selection` | 3.0.0 |
| `d3-shape` | 3.2.0 |
| `d3-time` | 3.1.0 |
| `d3-time-format` | 4.1.0 |
| `d3-timer` | 3.0.1 |
| `d3-transition` | 3.0.1 |
| `d3-zoom` | 3.0.0 |
| `delaunator` | 5.1.0 |
| `inherits` | 2.0.4 |
| `internmap` | 1.0.1 |
| `internmap` | 2.0.3 |
| `size-sensor` | 1.0.3 |

## Apache-2.0（12 个包）

| 包 | 版本 |
|---|---|
| `@chevrotain/types` | 11.1.2 |
| `adler-32` | 1.3.1 |
| `cfb` | 1.2.2 |
| `codepage` | 1.15.0 |
| `crc-32` | 1.2.2 |
| `echarts` | 6.1.0 |
| `frac` | 1.1.2 |
| `remixicon` | 3.5.0 |
| `ssf` | 0.11.2 |
| `wmf` | 1.0.2 |
| `word` | 0.3.0 |
| `xlsx` | 0.18.5 |

## BSD-3-Clause（8 个包）

| 包 | 版本 |
|---|---|
| `d3-array` | 2.12.1 |
| `d3-ease` | 3.0.1 |
| `d3-path` | 1.0.9 |
| `d3-sankey` | 0.12.3 |
| `d3-shape` | 1.3.7 |
| `highlight.js` | 11.12.0 |
| `rw` | 1.3.3 |
| `zrender` | 6.1.0 |

## 0BSD（1 个包）

| 包 | 版本 |
|---|---|
| `tslib` | 2.3.0 |

## (MPL-2.0 OR Apache-2.0)（1 个包）

| 包 | 版本 |
|---|---|
| `dompurify` | 3.4.15 |

## BSD-2-Clause（1 个包）

| 包 | 版本 |
|---|---|
| `entities` | 8.1.0 |

## (MIT OR GPL-3.0-or-later)（1 个包）

| 包 | 版本 |
|---|---|
| `jszip` | 3.10.2 |

## PSF-2.0（1 个包）

| 包 | 版本 |
|---|---|
| `argparse` | 3.0.4 |

## (MIT AND Zlib)（1 个包）

| 包 | 版本 |
|---|---|
| `pako` | 1.0.11 |

## Unlicense（1 个包）

| 包 | 版本 |
|---|---|
| `robust-predicates` | 3.0.3 |
