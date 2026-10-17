declare module 'better-sqlite3' {
  interface Database {
    exec(sql: string): Database
    prepare(sql: string): PreparedStatement
  }
  interface PreparedStatement {
    get(...args: any[]): any
    run(...args: any[]): { changes: number; lastInsertRowid: number }
  }
  class Database {
    constructor(path: string)
    exec(sql: string): Database
    prepare(sql: string): PreparedStatement
  }
  export default Database
}

declare module 'bcryptjs' {
  function hashSync(value: string, salt: number): string
  function compareSync(value: string, hash: string): boolean
  export default { hashSync, compareSync }
}

declare module '@anthropic-ai/sdk' {
  import Stream from 'stream'
  class Anthropic {
    constructor(config: { apiKey: string })
    messages: {
      create(params: any): Promise<any> | AsyncIterable<any>
    }
  }
  export default Anthropic
}

declare module 'openai' {
  import Stream from 'stream'
  class OpenAI {
    constructor(config: { apiKey: string; baseURL?: string })
    chat: {
      completions: {
        create(params: any): Promise<any> | AsyncIterable<any>
      }
    }
  }
  export default OpenAI
}
