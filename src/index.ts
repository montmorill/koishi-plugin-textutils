import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Random, Schema } from 'koishi'
import enUS from '../locales/en-US.yml'
import zhCN from '../locales/zh-CN.yml'

export const name = 'textutils'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

function plain<A extends any[]>(func: (...args: A) => any) {
  return (...args: A) => h.text(func(...args))
}

export function apply(ctx: Context) {
  ctx.i18n.define('en-US', enUS)
  ctx.i18n.define('zh-CN', zhCN)

  ctx.command('shuf <lines...:string>')
    .option('count', '-n <count:posint>')
    .action(plain(({ options }, ...lines) => {
      return Random.pick(lines, options?.count || 1).join(' ')
    }))

  ctx.command('wc <text:text>')
    .option('bytes', '-c')
    .option('chars', '-m')
    .option('lines', '-l')
    .option('words', '-w')
    .action(plain(({ options }, text) => {
      if (options?.bytes)
        return text.length
      if (options?.chars)
        return text.split('').length
      if (options?.lines)
        return text.split('\n').length
      return text.split(/\s+/g).length
    }))

  ctx.command('uniq <lines...:string>')
    .option('repeated', '-d')
    .option('unique', '-u')
    .option('count', '-c')
    .action(plain(({ options }, lines) => {
      let groups: [number, string][] = []
      let count = 1
      let last = lines[0]
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] !== last) {
          groups.push([count, last])
          last = lines[i]
          count = 0
        }
        count++
      }
      groups.push([count, last])

      if (options?.repeated)
        groups = groups.filter(([count]) => count > 1)
      if (options?.unique)
        groups = groups.filter(([count]) => count === 1)

      return options?.count
        ? groups.map(([count, line]) => `${count} ${line}`).join('\n')
        : groups.map(([_, line]) => line).join('\n')
    }))

  ctx.command('sort <lines...:string>')
    .option('reverse', '-r')
    .action(plain(({ options }, ...lines) => {
      lines.sort((a, b) => a.localeCompare(b))
      if (options?.reverse)
        lines.reverse()
      return lines.join('\n')
    }))

  ctx.command('grep <needle:string> <lines...:string>', '搜索包含模式的字段')
    .option('markdown', '-m 启用 Markdown 输出')
    .option('invert', '-i 反转匹配')
    .action(({ session, options, source }, needle, ...lines) => {
      if (!needle)
        return void session?.send(`${source}: 未提供搜索模式。`)
      if (!lines.length)
        return void session?.send(`${source}: 未提供字段列表。`)

      const regex = new RegExp(needle, 'g')
      lines = lines.filter(field => !!options?.invert !== !!field.match(regex))
      if (options?.markdown) {
        lines = lines.map(field => field
          .replaceAll(regex, match => `**${match}**`))
      }

      if (!lines.length)
        return void session?.send(`${source}: 无匹配结果。`)
      if (!options?.markdown)
        return h.text(lines.join(' '))
      return h('markdown', lines.join(' '))
    })

  ctx.command('sed <regexp:string> <replacement:string> <message:text>', '正则模式替换')
    .option('global', '-g 全局替换')
    .action(plain(({ session, options, source }, regexp, replacement, message) => {
      if (!regexp)
        return void session?.send(`${source}: 未提供搜索模式。`)
      if (!replacement && replacement !== '')
        return void session?.send(`${source}: 未提供替换字符串。`)
      const regex = new RegExp(regexp, options?.global ? 'gu' : 'u')
      const lines = message.split('\n')
      const result = []
      for (const line of lines) {
        result.push(line.replace(regex, (...match) =>
          replacement.replace(/\\(\d)/g, (_, index) => match[index])))
      }
      return result.join('\n')
    }))
}
