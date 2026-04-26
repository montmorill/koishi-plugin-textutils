import type { Context } from 'koishi'
import { } from '@koishijs/plugin-help'
import { h, Schema } from 'koishi'

export * from './utils'

export const name = 'montmorill'

export interface Config {
  markdown: boolean
  delimiter: string
}

export const Config: Schema<Config> = Schema.object({
  markdown: Schema.boolean().default(true).description('启用Markdown格式。'),
  delimiter: Schema.string().default(' ').description('默认字段分隔符。'),
})

export function apply(ctx: Context, config: Config) {
  function markdown(message: string) {
    return config.markdown ? h('markdown', message) : message
  }

  ctx.command('echomd <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => markdown(message))
  ctx.command('echotex <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => markdown(`$$${message}$$`))

  ctx.command('count <message:text>', '计算字段数。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('unique', '-u 去重计数。')
    .action(({ options }, message = '') => {
      const delim = options?.delimiter || config.delimiter
      if (options?.unique)
        return String(new Set(message.split(delim)).size)
      return String(message.split(delim).length)
    })

  ctx.command('cut <range:string> <message:text>', '按指定范围裁剪每个字段，支持负索引和反转区间。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .usage(`- cut <index> <message...>\n- cut [start]:[end] <message...>`)
    .example('cut 1 apple cat dog apple')
    .example('cut 5:2 abcdefg')
    .example('cut 2: hello season')
    .example('cut 1:3 hello season')
    .example('cut :-6 montmorillonite')
    .action(({ options }, range = '-', message = '') => {
      const delimiter = options?.delimiter || config.delimiter
      // Fix ranges that starts with '-'
      for (const [key, value] of Object.entries(options || {})) {
        range += key
        message = value + message
      }
      let start: number, end: number
      if (range.includes(':'))
        [start, end] = range.split(':').map(Number)
      else
        start = end = Number(range)
      return message.split(delimiter)
        .map((field: string) => {
          const s = start < 0 ? field.length + start + 1 : start || 1
          const e = end < 0 ? field.length + end + 1 : end || field.length

          if (s <= e)
            return field.slice(s - 1, e)
          const reversed = Array.from(field).reverse().join('')
          return reversed.slice(field.length - s, field.length - e + 1)
        })
        .join(delimiter)
    })

  ctx.command('grep <needle:string> <haystack:text>', '搜索字符串中的子字符串。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('plain', '-p 原始格式。')
    .action(({ options }, needle, haystack) => {
      const delimiter = options?.delimiter || config.delimiter
      const regex = new RegExp(needle, 'g')
      haystack = haystack.split(delimiter)
        .filter(field => field.match(regex))
        .join(delimiter)
      // eslint-disable-next-line style/multiline-ternary
      return options?.plain ? haystack : markdown(haystack
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })
}
