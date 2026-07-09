import type { Awaitable, Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Random, Schema } from 'koishi'
import enUS from '../locales/en-US.yml'
import zhCN from '../locales/zh-CN.yml'

export const name = 'textutils'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

function plain<A extends any[]>(func: (...args: A) => Awaitable<any>) {
  return async (...args: A) => h.text(await func(...args))
}

export function apply(ctx: Context) {
  ctx.i18n.define('', {
    commands: {
      grep: {
        messages: {
          colored: '<strong>{0}</strong>',
        },
      },
    },
  })
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

  ctx.command('grep <needle:string> <lines...:string>')
    .option('invert', '-v')
    .option('color', '--color')
    .action(async ({ session, options }, needle, ...lines) => {
      if (!session)
        return
      if (!needle)
        return void await session.send(await session.i18n('.no-needle'))
      if (!lines.length)
        return void await session.send(await session.i18n('.no-haystack'))

      if (options?.invert || !options?.color) {
        const regex = new RegExp(needle, 'u')
        lines = lines.filter(line => !options?.invert === !!line.match(regex))
        return h.text(lines.join(' '))
      }

      const regex = new RegExp(needle, 'gu')
      const elements = lines.flatMap((line) => {
        const matches = line.matchAll(regex)
        const elements = []
        let current = 0
        for (const match of matches) {
          if (match.index > current)
            elements.push(h.text(line.substring(current, match.index)))
          elements.push(...session.i18n('.colored', match))
          current = match.index + match[0].length
        }
        if (current < line.length)
          elements.push(h.text(line.substring(current)))
        elements.push(' ')
        return elements
      })
      elements.pop()
      return elements
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
