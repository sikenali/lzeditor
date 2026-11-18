// 测试用 .ts 桥：node/tsx 的 ESM 加载器对 .mjs 与 .ts 导入器的相对路径解析
// 会产生不同的模块实例（单例 registry 会被拆分）。通过一个 .ts 文件中转，
// 让测试与源码共用同一个模块实例，保证跨文件断言（如 demo 注册进 registry）成立。
export { createRegistry } from '../src/plugins/registry'
export { pluginApi, pluginRegistries, runWillSave, runWillExport } from '../src/plugins/api'
export { registerDemoPlugins } from '../src/plugins/demo'
