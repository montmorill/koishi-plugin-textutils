import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, omit, Random, Schema } from 'koishi'

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

  function cut(start: number, end: number) {
    if (start === end) {
      return <T>(sequence: T[]) => [sequence[
        start < 0 ? sequence.length + start : start - 1
      ]]
    }
    end -= 1
    return <T>(sequence: T[]) => {
      const s = start < 0 ? sequence.length + start + 1 : start
      const e = end < 0 ? sequence.length + end : end
      if (s <= e)
        return sequence.slice(s, e + 1)
      return sequence.reverse()
        .slice(sequence.length - s, sequence.length - e + 1)
    }
  }

  ctx.command('cut <range:string> <message:text>', '按指定范围裁剪每个字段。')
    .option('field', '-f 按字段而不是字符切割。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .usage(`- cut <index> <message...>\n- cut [start]:[end] <message...>`)
    .example('cut 1 apple card dog apple')
    .example('cut -1 apple card dog apple')
    .example('cut -f 2 apple card dog apple')
    .example('cut 5:1 abcdefg')
    .example('cut 1: hello season')
    .example('cut :3 hello season')
    .example('cut :-5 montmorillonite')
    .action(({ options }, range = '', message = '') => {
      const delimiter = options?.delimiter || config.delimiter
      let fields = message.split(delimiter)
      // Fix ranges that starts with '-'
      const entries = Object.entries(omit(options || {}, ['delimiter', 'field']))
      if (entries.length) {
        fields.unshift(range)
        range = '-'
        for (const [key, value] of entries) {
          range += key
          fields.unshift(value as string)
        }
      }
      fields = fields.map(field => field.trim()).filter(Boolean)
      if (!fields.length)
        return '未提供文本内容！'
      let [start, end] = range.split(':')
      if (!range.includes(':'))
        end = start
      const cutter = cut(Number(start), Number(end))
      if (options?.field)
        return cutter(fields).join(delimiter)
      return fields.map(field =>
        cutter(Array.from(field)).join('')).join(delimiter)
    })

  ctx.command('grep <needle:string> <haystack:text>', '搜索字符串中的子字符串。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('markdown', '-m 启用 Markdown 输出。')
    .option('invert', '-i 反转匹配。')
    .action(({ options }, needle, haystack) => {
      const delimiter = options?.delimiter || config.delimiter
      const regex = new RegExp(needle, 'g')
      haystack = haystack.split(delimiter)
        .filter(field => !!options?.invert !== !!field.match(regex))
        .join(delimiter)
      if (!haystack)
        return '未找到匹配项。'
      if (!options?.markdown || !config.markdown)
        return haystack
      return h('markdown', haystack
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })

  ctx.command('shuf <message:text>', '随机打乱字段顺序。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('count', '-n <count:number> 显示 n 个字段。')
    .action(({ options }, message) => {
      const delimiter = options?.delimiter || config.delimiter
      return Random
        .pick(message.split(delimiter), options?.count || 1)
        .join(delimiter)
    })
}
