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

export function button(data: {
  label: string
  visited?: string
  style?: 'default' | 'primary'
  permission?: Parameters<typeof button.permission>[0]
  limit?: number
} & Parameters<typeof button.action>[0]) {
  return {
    render_data: {
      label: data.label,
      style: ['default', 'primary'].indexOf(data.style || 'default'),
      ...data.visited ? { visited_label: data.visited } : {},
    },
    action: {
      ...button.action(data),
      permission: button.permission(data.permission || 'all'),
      ...data.limit ? { click_limit: data.limit } : {},
    },
  }
}

export enum ActionType {
  Url = 0,
  Call = 1,
  Reply = 2,
}

button.action = function (data: (Xor<
  | { url: string }
  | { call: string }
  | { input: string, enter?: boolean, at_bot_show_channel_list?: boolean }
  | { enter: string, at_bot_show_channel_list?: boolean }
>)) {
  if (data.url) {
    return { type: ActionType.Url, data: data.url }
  }
  if (data.call) {
    return { type: ActionType.Call, data: data.call }
  }
  if (data.input) {
    return {
      type: ActionType.Reply,
      data: data.input,
      enter: data.enter ?? false,
      at_bot_show_channel_list: data.at_bot_show_channel_list ?? false,
    }
  }
  if (data.enter) {
    return {
      type: ActionType.Reply,
      data: data.enter,
      enter: true,
      at_bot_show_channel_list: data.at_bot_show_channel_list ?? false,
    }
  }
  throw new Error(`Invalid action type: ${data}`)
}

export enum PermissionType {
  Users = 0,
  Admin = 1,
  All = 2,
  Roles = 3,
}

button.permission = function (data: Xor<
  | { users: string[] }
  | 'admin'
  | 'all'
  | { roles: string[] }
>) {
  if (data === 'admin')
    return { type: PermissionType.Admin }
  if (data === 'all')
    return { type: PermissionType.All }
  if (data.users)
    return { type: PermissionType.Users, specify_user_ids: data.users }
  if (data.roles)
    return { type: PermissionType.Roles, specify_role_ids: data.roles }
}

export function withKeyboard(content: string, rows: ReturnType<typeof button>[][]) {
  return {
    content,
    keyboard: {
      rows: rows.map(buttons => ({ buttons })),
    },
  }
}

export type Xor<T, U = T> = T extends any ? T & {
  [K in Exclude<U extends any ? keyof U : never, keyof T>]?: never
} : never
