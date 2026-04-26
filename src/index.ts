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
  markdown: Schema.boolean().default(true),
  delimiter: Schema.string().default(' '),
})

export function apply(ctx: Context, config: Config) {
  function markdown(message: string) {
    return config.markdown ? h('markdown', message) : message
  }

  ctx.command('echomd <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => markdown(message))
  ctx.command('echotex <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => markdown(`$$${message}$$`))

  ctx.command('cut <range:string> <message:text>', '按指定范围裁剪每个字段，支持负索引和反转区间。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .usage(`- cut <index> <message...>\n- cut [start]:[end] <message...>`)
    .example('cut 1 apple cat dog apple')
    .example('cut 5:2 abcdefg')
    .example('cut 2: hello season')
    .example('cut 1:3 hello season')
    .example('cut :-6 montmorillonite')
    .action(({ options }, range = '-', message = '') => {
      const delim = options?.delimiter || config.delimiter
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
      return message.split(delim)
        .map((text: string) => {
          const s = start < 0 ? text.length + start + 1 : start || 1
          const e = end < 0 ? text.length + end + 1 : end || text.length

          if (s <= e)
            return text.slice(s - 1, e)
          const reversed = Array.from(text).reverse().join('')
          return reversed.slice(text.length - s, text.length - e + 1)
        })
        .join(delim)
    })

  ctx.command('count <message:text>', '计算字段数。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('unique', '-u 去重计数。')
    .action(({ options }, message = '') => {
      const delim = options?.delimiter || config.delimiter
      if (options?.unique)
        return String(new Set(message.split(delim)).size)
      return String(message.split(delim).length)
    })

  ctx.command('grep <needle:string> <haystack:text>', '搜索字符串中的子字符串。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .action(({ options }, needle, haystack) => {
      const sep = options?.delimiter || config.delimiter
      const regex = new RegExp(needle, 'g')
      return markdown(haystack.split(sep)
        .filter(item => item.match(regex)).join(sep)
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })
}
