import type { Context, Session } from 'koishi'
import { h, Schema } from 'koishi'

export const name = 'montmorill'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('echomd <message:text>').action((_, message) => {
    return h('markdown', message)
  })

  ctx.command('pbhh', '屏被轰坏！')
    .alias('屏被轰坏', '㵗㶔𤃫𣸎')
    .action(({ session }) => {
      session?.send(`${h('img', { src: 'https://pbhh.net/㵗㶔𤃫𣸎.png' })}你的屏幕已被我轰坏！`)
      return h('qq:ark24', {
        desc: '㵗㶔𤃫𣸎，溃濩泧漷。潏湟淴泱，㶖㴸㶒瀹。漩澴荥瀯，渨㵽濆瀑。',
        prompt: '我是海狶，你的屏幕已被我轰坏！',
        title: '平渹网',
        metaDesc: '你的屏幕已被我轰坏！',
        img: 'https://pbhh.net/icons/icon-512.png',
        // link: 'mqqapi://openhalfscreenweb/?height=1920&url=https%3A%2F%2Fpbhh.net',
        link: 'https://pbhh.net',
        // subTitle: 'adapter-qq-crack',
      })
    })
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
