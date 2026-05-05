import type { Context } from 'koishi'
import { } from '@koishijs/plugin-help'
import { h, Random, Schema } from 'koishi'

export * from './utils'

export const name = 'montmorill'

export interface Config {
  markdown: boolean
  delimiter: string
}

export const Config: Schema<Config> = Schema.object({
  markdown: Schema.boolean().default(true).description('启用 Markdown 输出。'),
  delimiter: Schema.string().default(' ').description('默认字段分隔符。'),
})

export function apply(ctx: Context, config: Config) {
  ctx.command('count <message:text>', '计算字段数。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('unique', '-u 去重计数。')
    .action(({ options }, message) => {
      const delimiter = options?.delimiter || config.delimiter
      if (options?.unique)
        return String(new Set(message.split(delimiter)).size)
      return String(message.split(delimiter).length)
    })

  ctx.command('cut <range:string> <message:text>', '按指定范围裁剪每个字段。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .usage(`- cut <index> <message...>\n- cut [start]:[end] <message...>`)
    .example('cut 0 apple card dog apple')
    .example('cut -1 apple card dog apple')
    .example('cut 5:1 abcdefg')
    .example('cut 1: hello season')
    .example('cut :3 hello season')
    .example('cut :-5 montmorillonite')
    .action(({ options }, range = '', message = '') => {
      const delimiter = options?.delimiter || config.delimiter
      delete options?.delimiter
      let fields = message.split(delimiter)
      // Fix ranges that starts with '-'
      const entries = Object.entries(options || {})
      if (entries.length) {
        fields.unshift(range)
        range = '-'
        for (const [key, value] of entries) {
          range += key
          fields.unshift(value)
        }
      }
      fields = fields.map(field => field.trim()).filter(Boolean)
      if (!fields.length)
        return '未提供文本内容！'
      let start: number, end: number
      if (range.includes(':'))
        [start, end] = range.split(':').map(Number)
      else
        end = (start = Number(range)) + 1
      return fields
        .map((field: string) => {
          const s = start < 0 ? field.length + start : start || 0
          const e = end < 0 ? field.length + end : end || field.length
          // eslint-disable-next-line antfu/if-newline
          if (s <= e) return field.slice(s, e)
          const reversed = Array.from(field).reverse().join('')
          return reversed.slice(field.length - s, field.length - e)
        })
        .join(delimiter)
    })

  ctx.command('grep <needle:string> <haystack:text>', '搜索字符串中的子字符串。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('no-markdown', '-M 禁用 Markdown 输出。')
    .option('invert', '-i 反转匹配。')
    .action(({ options }, needle, haystack) => {
      const delimiter = options?.delimiter || config.delimiter
      const regex = new RegExp(needle, 'g')
      haystack = haystack.split(delimiter)
        .filter(field => !!options?.invert !== !!field.match(regex))
        .join(delimiter)
      if (!haystack)
        return '未找到匹配项。'
      if (options?.['no-markdown'] || !config.markdown)
        return haystack
      return h('markdown', haystack
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })

  ctx.command('shuf <message:text>', '随机打乱字段顺序。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('count', '-n <count:number> 显示前n个字段。')
    .action(({ options }, message) => {
      const delimiter = options?.delimiter || config.delimiter
      return Random
        .pick(message.split(delimiter), options?.count || 1)
        .join(delimiter)
    })
}
