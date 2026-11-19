// 由 lzc/build.sh 在每次构建时按解析后的 VERSION 重写（与 package.json / git tag 同步）。
// 前端打包时读不到 package.json，故由构建注入；不要手动改这个文件。
export const APP_VERSION = '1.1.0'
