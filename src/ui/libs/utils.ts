import { IpcRequestData } from '_common_type'

export function reversePath(path: string, sep?: string) {
  const _sep = sep ? sep : '/'
  return path.split(_sep).reverse().join(_sep)
}

/**
 * The general interface for sending Ipc data.
 *
 * @param channel The ipc communication channel
 * @param data Optional data sent by ipc request
 * @param single Specify whether it is one-way ipc communication
 * */
export async function Post(
  channel: string,
  data: IpcRequestData,
  single = false
) {
  // Make a Post response to main process
  if (single) {
    return window.ipc._render_post(channel, data)
  }
  return window.ipc._invoke_post(channel, data)
}

export function fileAndFolderNameCheck(name: string) {
  if (!name) return false

  // ensure the name just include a-z, 0-9, chiness
  const pattern = /^[A-Za-z0-9\u4e00-\u9fa5]+$/gi
  return pattern.test(name)
}

export function getFileBaseName(filePath: string) {
  if (!filePath) return ''
  const idx = filePath.lastIndexOf('.')
  if (idx != -1) {
    return filePath.substring(0, idx)
  }
  return filePath
}
