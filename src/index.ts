import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
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

  ctx.command('cut <range:string> <message:text>')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .action(({ options }, range, message) => {
      const delim = options?.delimiter || config.delimiter
      const [start, end] = range.split(':').map(Number)
      return message.split(delim)
        .map(text => text.slice((start || 1) - 1, end || text.length))
        .join(delim)
    })

  ctx.command('grep <needle:string> <haystack:text>')
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
