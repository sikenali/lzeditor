import welcomeRaw from '../../content/welcome.md?raw'
// README 直接取项目根目录的 README.md：文档库里的 readme 就是当前仓库的说明，
// 不再维护一份容易过期的 src/content/readme.md 副本。
import readmeRaw from '../../../README.md?raw'

export const DEFAULT_CONTENT = welcomeRaw.trim() + '\n'
export const README_CONTENT = readmeRaw.trim() + '\n'

export const DEFAULT_DOC_TITLE = 'Welcome to LZEditor'