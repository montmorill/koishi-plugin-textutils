import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, omit, Random, Schema } from 'koishi'
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

  ctx.command('cut <range:string> <lines...:string>', '按范围裁剪字段')
    .option('field', '-f 按字段而不是字符切割')
    .option('delimiter', '-d <delim:string> 分隔符')
    .usage(`- cut [-f] <index> <lines...>\n- cut [-f] [start]:[end] <lines...>`)
    .example('cut 1 apple card dog apple')
    .example('cut -1 apple card dog apple')
    .example('cut -f 2 apple card dog apple')
    .example('cut 5:1 abcdefg')
    .example('cut 1: hello season')
    .example('cut :3 hello season')
    .example('cut :-5 montmorillonite')
    .action(plain(({ session, options, source }, range = '', ...lines) => {
      const delimiter = options?.delimiter || ''
      if (options?.field && options?.delimiter) {
        return void session?.send(`${source}: 不能同时传递 -d 与 -f 选项。`)
      }
      // Fix ranges that starts with '-'
      const entries = Object.entries(omit(options || {}, ['delimiter', 'field']))
      if (entries.length) {
        lines.unshift(range)
        range = '-'
        for (const [key, value] of entries) {
          range += key
          lines.unshift(value as string)
        }
      }
      if (!range)
        return void session?.send(`${source}: 未提供索引范围。`)
      if (!lines.length)
        return void session?.send(`${source}: 未提供字段列表。`)

      let [start, end] = range.split(':')
      if (!range.includes(':'))
        end = start
      const cutter = cut(Number(start), Number(end))

      const result = options?.field
        ? cutter(lines).join(' ')
        : lines.map(field => cutter(field.split(delimiter)).join(delimiter)).join(' ')
      if (!result) {
        return void session?.send(`${source}: 无内容。`)
      }
      return result
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
          .replaceAll(regex, match => `**${match}**`)
          .replaceAll('****', ''))
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
      if (!replacement)
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

  ctx.command('markdown <message:text>', '渲染为 markdown')
    .action((_, message) => h('markdown', message))

  ctx.command('tex <message:text>', '渲染为 TeX')
    .action((_, message) => h('markdown', `$$\n${message}\n$$`))

  ctx.command('code <message:text>', '渲染为代码块')
    .option('lang', '-l <lang:string> 语言标识符')
    .action(({ options }, message) =>
      h('markdown', `\`\`\`${options?.lang || ''}\n${message}\n\`\`\``))

  ctx.command('table <message:text>', '渲染为表格')
    .option('void', '-v 虚拟表头')
    .option('transpose', '-T 转置')
    .action(({ options }, message) => {
      let cells = message.split('\n').map(line => line.split(' '))
      const maxLength = Math.max(...cells.map(row => row.length))
      const columnCount = options?.transpose ? cells.length : maxLength
      if (options?.transpose) {
        cells = Array.from({ length: maxLength }, (_, index) =>
          cells.map(row => row[index]))
      }

      if (options?.void)
        cells.unshift([])

      const lines = cells.map(row =>
        `|${Array.from({ length: columnCount }, (_, index) =>
          row[index]?.replaceAll('|', '\\|') ?? '').join('|')}|`)
      lines.splice(1, 0, `${'|-'.repeat(columnCount)}|`)

      return h('markdown', lines.join('\n'))
    })
}
