import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, omit, Random, Schema } from 'koishi'
import { shortcut } from './utils'

export * from './utils'

export const name = 'montmorill'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('chars <message:text>', '全部不重复字符。')
    .action((_, message) => Array.from(new Set(message)).join(' '))

  ctx.command('count <...fields:string>', '计算字段数。')
    .option('unique', '-u 去重计数。')
    .example('count apple card dog apple')
    .example('count -u apple card dog apple')
    .action(({ options }, ...fields) => {
      if (options?.unique)
        return String(new Set(fields).size)
      return String(fields.length)
    })

  ctx.command('shuf <...fields:string>', '打乱字段列表。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .option('count', '-n <count:number> 输出 count 个字段。')
    .action(({ session, options, source }, ...fields) => {
      if (!fields.length)
        return void session?.send(`${source}: 未提供字段列表。`)
      return Random.pick(fields, options?.count || 1).join(' ')
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

  ctx.command('cut <range:string> <...fields:string>', '按范围裁剪字段。')
    .option('field', '-f 按字段而不是字符切割。')
    .option('delimiter', '-d <delim:string> 分隔符。')
    .usage(`- cut [-f] <index> <fields...>\n- cut [-f] [start]:[end] <fields...>`)
    .example('cut 1 apple card dog apple')
    .example('cut -1 apple card dog apple')
    .example('cut -f 2 apple card dog apple')
    .example('cut 5:1 abcdefg')
    .example('cut 1: hello season')
    .example('cut :3 hello season')
    .example('cut :-5 montmorillonite')
    .action(({ session, options, source }, range = '', ...fields) => {
      const delimiter = options?.delimiter || ''
      if (options?.field && options?.delimiter) {
        return void session?.send(`${source}: 不能同时传递 -d 与 -f 选项。`)
      }
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
      if (!range)
        return void session?.send(`${source}: 未提供索引范围。`)
      if (!fields.length)
        return void session?.send(`${source}: 未提供字段列表。`)

      let [start, end] = range.split(':')
      if (!range.includes(':'))
        end = start
      const cutter = cut(Number(start), Number(end))

      const result = options?.field
        ? cutter(fields).join(' ')
        : fields.map(field => cutter(field.split(delimiter),
          ).join(delimiter)).join(' ')
      if (!result) {
        return void session?.send(`${source}: 无内容。`)
      }
      return result
    })

  ctx.command('grep <needle:string> <...fields:string>', '搜索包含模式的字段。')
    .option('markdown', '-m 启用 Markdown 输出。')
    .option('invert', '-i 反转匹配。')
    .action(({ session, options, source }, needle, ...fields) => {
      if (!needle)
        return void session?.send(`${source}: 未提供搜索模式。`)
      if (!fields.length)
        return void session?.send(`${source}: 未提供字段列表。`)

      const regex = new RegExp(needle, 'g')
      const result = fields
        .filter(field => !!options?.invert !== !!field.match(regex))
        .join(' ')

      if (!result)
        return void session?.send(`${source}: 无匹配结果。`)
      if (!options?.markdown)
        return result
      return h('markdown', result
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })

  ctx.command('sed <regexp:string> <replacement:string> <message:text>', '替换。')
    .option('global', '-g 全局替换。')
    .action(({ session, options, source }, regexp, replacement, message) => {
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
    })

  ctx.command('markdown <message:text>', '渲染为 markdown。')
    .action((_, message) => h('markdown', message))

  ctx.command('tex <message:text>', '渲染为 TeX。')
    .action((_, message) => h('markdown', `$$\n${message}\n$$`))

  ctx.command('code <message:text>', '渲染为代码块。')
    .option('lang', '-l <lang:string> 语言标识符。')
    .action(({ options }, message) =>
      h('markdown', `\`\`\`${options?.lang || ''}\n${message}\n\`\`\``))

  ctx.command('table <message:text>', '渲染为表格。')
    .option('no-header', '-H 无表头。')
    .option('transpose', '-t 转置。')
    .action(({ options }, message) => {
      const result = []
      let heading = true
      let rows = message.split('\n')
        .filter(line => line.trim())
        .map(line => line.split(' '))
      if (options?.transpose)
        rows = rows[0].map((_, index) => rows.map(row => row[index]))
      if (options?.['no-header'])
        rows.unshift([])
      const maxCols = Math.max(...rows.map(row => row.length))
      for (const row of rows) {
        result.push(`|${Array.from(
          { length: maxCols },
          (_, idx) => row[idx]?.replaceAll('|', '\\|') ?? '',
        ).join('|')}|`)
        if (heading) {
          result.push(`${'|-'.repeat(maxCols)}|`)
          heading = false
        }
      }
      return h('markdown', result.join('\n'))
    })

  ctx.command('shortcut <text:string> [show:string]', '渲染为快捷指令。')
    .option('reference', '-r 引用。')
    .option('enter', '-e 回车指令。')
    .action(({ session, options }, text, show = text) =>
      h('qq:markdown', session?.isDirect && options?.enter
        ? shortcut.enter(text)
        : shortcut.input(text, show, options?.reference)))
}
