/* eslint-disable style/max-statements-per-line,antfu/if-newline */
import { h } from 'koishi'

export async function stream(
  gen: AsyncGenerator<string>,
  send: (element: h) => Promise<[string]>,
) {
  let id; let index = 0; let res = await gen.next()
  for (; !res.done; res = await gen.next(), index++) {
    try { [id] = await send(h('qq:markdown', { stream: { state: 1, id, index } }, res.value)) }
    catch { [id] = await send(h('qq:markdown', { stream: { state: 1, index } }, res.value)) }
  }
  try { await send(h('qq:markdown', { stream: { state: 10, id, index } }, res.value)) }
  catch { await send(res.value) }
}

export function shortcut(canEnter: boolean | undefined, text: string, show?: string) {
  // eslint-disable-next-line style/multiline-ternary
  return show && show !== text ? shortcut.input(text, show)
    : canEnter ? shortcut.enter(text) : shortcut.input(text)
}

shortcut.enter = (text: string) => `<qqbot-cmd-enter text=${JSON.stringify(encodeURIComponent(text))} />`

shortcut.input = (text: string, show?: string, reference?: boolean) => {
  let sb = `<qqbot-cmd-input text=${JSON.stringify(encodeURIComponent(text))}`
  if (show) sb += ` show=${JSON.stringify(decodeURIComponent(show))}`
  if (reference) sb += ` reference="${reference}"`
  sb += ` />`
  return sb
}
