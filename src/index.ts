/* eslint-disable style/max-statements-per-line */
import type { Context, Session } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Schema } from 'koishi'

export const name = 'montmorill'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('echomd <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => h('markdown', message))
  ctx.command('echotex <message:text>', { hidden: true, authority: 4 })
    .action((_, message) => h('markdown', `$$${message}$$`))
  ctx.command('repeat <message:text>', '重复指定次数。')
    .option('count', '-n <count:number> 重复次数。')
    .action(({ options }, message) => message.repeat(Number(options?.count || 1)))
  ctx.command('head <message:text>', '从前往后取指定数量的字符。')
    .option('count', '-n <count:number> 字符数量。')
    .action(({ options }, message) => message.slice(0, Number(options?.count || 1)))
  ctx.command('tail <message:text>', '从后往前取指定数量的字符。')
    .option('count', '-n <count:number> 字符数量。')
    .action(({ options }, message) => message.slice(-Number(options?.count || 1)))
}

export async function stream(session: Session, gen: AsyncGenerator<string>) {
  let id; let index = 0; let res = await gen.next()
  for (; !res.done; res = await gen.next(), index++) {
    try { [id] = await session.send(h('qq:markdown', { stream: { state: 1, id, index } }, res.value)) }
    catch { [id] = await session.send(h('qq:markdown', { stream: { state: 1, index } }, res.value)) }
  }
  try { await session.send(h('qq:markdown', { stream: { state: 10, id, index } }, res.value)) }
  catch { await session.send(res.value) }
}

export function shortcut(canEnter: boolean | undefined, text: string, show?: string) {
  // eslint-disable-next-line style/multiline-ternary
  return show && show !== text ? shortcut.input(text, show)
    : canEnter ? shortcut.enter(text) : shortcut.input(text)
}

shortcut.enter = (text: string) => `<qqbot-cmd-enter text=${JSON.stringify(text)} />`

/* eslint-disable antfu/if-newline */
shortcut.input = (text: string, show?: string, reference?: boolean) => {
  let sb = `<qqbot-cmd-input text=${JSON.stringify(text)}`
  if (show) sb += ` show=${JSON.stringify(show)}`
  if (reference) sb += ` reference="${reference}"`
  sb += ` />`
  return sb
}
