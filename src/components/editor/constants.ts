import welcomeRaw from '../../content/welcome.md?raw'
import readmeRaw from '../../content/readme.md?raw'

export const DEFAULT_CONTENT = welcomeRaw.trim() + '\n'
export const README_CONTENT = readmeRaw.trim() + '\n'

export const NEW_DOC_TEMPLATE = `# 新建文档

开始写作吧…
`

export const DEFAULT_DOC_TITLE = 'Welcome to LZEditor'