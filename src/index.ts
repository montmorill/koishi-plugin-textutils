import type { Context, Session } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Schema } from 'koishi'

export const name = 'montmorill'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('echomd <message:text>', { hidden: true })
    .action((_, message) => h('markdown', message))
  ctx.command('echotex <message:text>', { hidden: true })
    .action((_, message) => h('markdown', `$$${message}$$`))
}

export async function stream(session: Session, gen: AsyncGenerator<string>) {
  // eslint-disable-next-line style/max-statements-per-line
  let id; let index = 0; let res = await gen.next()
  for (; !res.done; res = await gen.next(), index++)
    [id] = await session.send(h('qq:markdown', { stream: { state: 1, id, index } }, res.value))
  await session.send(h('qq:markdown', { stream: { state: 10, id, index } }, res.value))
}

export function shortcut(canEnter: boolean, text: string, show?: string) {
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
