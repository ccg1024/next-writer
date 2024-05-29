import { EditorState } from '@codemirror/state'
import { FileState, IpcRequest, RootWorkstationFolderInfo } from '_types'

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
export async function Post(channel: string, data: IpcRequest, single = false) {
  // Make a Post response to main process
  if (single) {
    window.ipc._render_post(channel, data)
    return null
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

export const emojiList = [
  '\ud83d\udca5',
  '\ud83c\udf35',
  '\ud83c\udf82',
  '\ud83c\udf70',
  '\ud83d\udc29',
  '\ud83d\udd25',
  '\ud83c\udf2b',
  '\ud83c\udf0a',
  '\ud83c\udf4f',
  '\ud83c\udf4e',
  '\ud83c\udf4b',
  '\ud83c\udf4c',
  '\ud83c\udf47',
  '\ud83c\udf51',
  '\ud83c\udf45',
  '\ud83c\udf46',
  '\ud83e\uddc0',
  '\ud83c\udf55',
  '\ud83c\udf6c',
  '\ud83c\udf6d',
  '\ud83c\udf69',
  '\ud83c\udf7a',
  '\ud83c\udf7b',
  '\ud83c\udf78',
  '\ud83c\udf7e',
  '\u2615\ufe0f',
  '\ud83d\udca9',
  '\ud83d\udc7b',
  '\ud83e\udd16',
  '\ud83d\udca4',
  '\ud83d\udc40',
  '\ud83d\udc83',
  '\ud83d\udc54',
  '\ud83d\udc57',
  '\ud83d\udc59',
  '\ud83d\udc58',
  '\ud83d\udc60',
  '\ud83d\udc52',
  '\ud83c\udfa9',
  '\ud83d\udc31',
  '\ud83d\udc3b',
  '\ud83d\udc31',
  '\ud83d\udc36',
  '\ud83d\udc3c',
  '\ud83d\udc2f',
  '\ud83e\udd81',
  '\ud83d\udc2e',
  '\ud83d\udc37',
  '\ud83d\udc19',
  '\ud83d\udc35',
  '\ud83d\udc12',
  '\ud83d\udc14',
  '\ud83d\udc26',
  '\ud83d\udc34',
  '\ud83e\udd84',
  '\ud83d\udc1d',
  '\ud83d\udc22',
  '\ud83d\udc20',
  '\ud83d\udc10',
  '\ud83d\udd4a',
  '\ud83d\udc15',
  '\ud83d\udc08',
  '\ud83d\udc09',
  '\ud83d\udc32',
  '\ud83c\udf84',
  '\ud83c\udf40',
  '\ud83c\udf3b',
  '\ud83c\udf39',
  '\ud83d\udc90',
  '\ud83c\udf44',
  '\u2600\ufe0f',
  '\ud83c\udf27',
  '\u26bd\ufe0f',
  '\ud83c\udfc0',
  '\ud83c\udfc8',
  '\u26be\ufe0f',
  '\ud83c\udfbe',
  '\ud83c\udfd2',
  '\u26f7',
  '\ud83c\udfc4',
  '\ud83c\udfca',
  '\ud83d\udeb4',
  '\ud83c\udfad',
  '\ud83c\udfa8',
  '\ud83c\udfb7',
  '\ud83c\udfba',
  '\ud83c\udfb8',
  '\ud83c\udfbb',
  '\ud83c\udfb0',
  '\ud83c\udfb3',
  '\ud83d\ude97',
  '\ud83d\ude95',
  '\ud83d\ude8c',
  '\ud83d\ude8e',
  '\ud83d\ude91',
  '\ud83d\ude92',
  '\ud83d\ude9c',
  '\ud83d\ude82',
  '\ud83d\ude82',
  '\u2708\ufe0f',
  '\u26f5\ufe0f',
  '\ud83d\udef0',
  '\ud83c\udf01',
  '\ud83c\udf0b',
  '\ud83c\udfde',
  '\ud83c\udf05',
  '\ud83c\udf86',
  '\ud83c\udf08',
  '\ud83c\udfe0',
  '\ud83c\udfe5',
  '\ud83c\udfeb',
  '\u231a\ufe0f',
  '\ud83d\udcf1',
  '\ud83d\udda5',
  '\ud83d\udcbe',
  '\ud83d\udcfc',
  '\ud83c\udfa5',
  '\u260e\ufe0f',
  '\ud83d\udcfa',
  '\ud83d\udcfb',
  '\ud83d\udce1',
  '\ud83d\udd6f',
  '\ud83d\udcb0',
  '\ud83d\udc8e',
  '\ud83d\udeac',
  '\u26b0',
  '\ud83d\udd2e',
  '\ud83d\udc88',
  '\ud83d\udebd',
  '\ud83d\udd11',
  '\ud83d\udecf',
  '\ud83c\udf89',
  '\ud83c\udf8a',
  '\u2764\ufe0f',
  '\ud83e\udd21',
  '\ud83d\ude00',
  '\ud83d\ude2c',
  '\ud83d\ude01',
  '\ud83d\ude02',
  '\ud83d\ude03',
  '\ud83d\ude04',
  '\ud83d\ude05',
  '\ud83d\ude06',
  '\ud83d\ude07',
  '\ud83d\ude09',
  '\ud83d\ude0a',
  '\ud83d\ude42',
  '\ud83d\ude43',
  '\u263a\ufe0f',
  '\ud83d\ude0b',
  '\ud83d\ude0c',
  '\ud83d\ude0d',
  '\ud83d\ude18',
  '\ud83d\ude17',
  '\ud83d\ude19',
  '\ud83d\ude1a',
  '\ud83d\ude1c',
  '\ud83d\ude1d',
  '\ud83d\ude1b',
  '\ud83e\udd11',
  '\ud83e\udd13',
  '\ud83d\ude0e',
  '\ud83e\udd17',
  '\ud83d\ude0f',
  '\ud83d\ude36',
  '\ud83d\ude10',
  '\ud83d\ude11',
  '\ud83d\ude12',
  '\ud83d\ude44',
  '\ud83e\udd14',
  '\ud83d\ude33',
  '\ud83d\ude1f',
  '\ud83d\ude20',
  '\ud83d\ude14',
  '\ud83d\ude15',
  '\ud83d\ude41',
  '\u2639\ufe0f',
  '\ud83d\ude23',
  '\ud83d\ude2b',
  '\ud83d\ude29',
  '\ud83d\ude31',
  '\ud83d\ude28',
  '\ud83d\ude30',
  '\ud83d\ude2f',
  '\ud83d\ude26',
  '\ud83d\ude22',
  '\ud83d\ude2a',
  '\ud83d\ude13',
  '\ud83d\ude2d',
  '\ud83d\ude35',
  '\ud83d\ude32',
  '\ud83e\udd10',
  '\ud83d\ude37',
  '\ud83e\udd12',
  '\ud83e\udd15',
  '\ud83d\ude34',
  '\ud83d\udc80',
  '\u2620\ufe0f',
  '\ud83d\udc7d',
  '\ud83d\ude3a',
  '\ud83d\ude38',
  '\ud83d\ude39',
  '\ud83d\ude3b',
  '\ud83d\ude3c',
  '\ud83d\ude3d',
  '\ud83d\ude40',
  '\ud83d\ude3f',
  '\ud83d\ude3e',
  '\ud83d\udc44',
  '\ud83d\udc8b',
  '\ud83d\udc45',
  '\ud83d\udde3',
  '\ud83d\udc64',
  '\ud83d\udc65',
  '\ud83d\udc56',
  '\ud83d\udc63',
  '\ud83d\udc61',
  '\ud83d\udc62',
  '\ud83d\udc5e',
  '\ud83d\udc5f',
  '\ud83c\udf93',
  '\ud83d\udc51',
  '\ud83d\udc5c',
  '\ud83d\udc5b',
  '\ud83d\udcbc',
  '\ud83d\udc53',
  '\ud83d\udd76',
  '\ud83d\udc8d',
  '\ud83c\udf02',
  '\u2744\ufe0f',
  '\ud83c\udf2a',
  '\u26a1\ufe0f',
  '\ud83e\udd51',
  '\ud83e\udd8b',
  '\ud83d\ude48',
  '\ud83d\ude49',
  '\ud83d\ude4a',
  '\ud83d\udc27',
  '\ud83d\udd77',
  '\ud83e\udd82',
  '\ud83e\udd80',
  '\ud83d\udc0d',
  '\ud83d\udc1b',
  '\ud83d\udc0c',
  '\ud83d\udc1e',
  '\ud83d\udc1c',
  '\ud83d\udc1f',
  '\ud83d\udc21',
  '\ud83d\udc2c',
  '\ud83d\udc33',
  '\ud83d\udc0b',
  '\ud83d\udc0a',
  '\ud83d\udc06',
  '\ud83c\udf32',
  '\ud83c\udf33',
  '\ud83c\udf34',
  '\ud83c\udf31',
  '\ud83c\udf3f',
  '\ud83c\udf43',
  '\ud83c\udf42',
  '\ud83c\udf41',
  '\ud83c\udf3a',
  '\ud83c\udf3c',
  '\ud83c\udf38',
  '\ud83c\udf30',
  '\ud83c\udf83',
  '\ud83d\udc1a',
  '\ud83d\udd78',
  '\ud83c\udf0e',
  '\ud83c\udf0d',
  '\ud83c\udf0f',
  '\ud83c\udf15',
  '\ud83c\udf16',
  '\ud83c\udf17',
  '\ud83c\udf18',
  '\ud83c\udf11',
  '\ud83c\udf12',
  '\ud83c\udf13',
  '\ud83c\udf14',
  '\ud83c\udf1a',
  '\ud83c\udf1d',
  '\ud83c\udf1b',
  '\ud83c\udf1c',
  '\ud83c\udf1e',
  '\ud83c\udf19',
  '\u2b50\ufe0f',
  '\ud83c\udf1f',
  '\ud83d\udcab',
  '\u2728',
  '\u2604\ufe0f',
  '\ud83c\udf54',
  '\ud83c\udf73',
  '\ud83c\udf5f',
  '\ud83c\udf2d',
  '\ud83c\udf5d',
  '\ud83c\udf2e',
  '\ud83c\udf2f',
  '\ud83c\udf63',
  '\ud83c\udf68',
  '\ud83c\udf66',
  '\ud83c\udf77',
  '\ud83c\udf79',
  '\ud83c\udfc6',
  '\ud83c\udfaa',
  '\ud83c\udfb9',
  '\ud83d\ude80',
  '\u26f2\ufe0f',
  '\ud83c\udfa2',
  '\u26f0',
  '\ud83c\udfd4',
  '\ud83d\uddfb',
  '\ud83d\udcaf',
  '\ud83c\udfb5',
  '\ud83c\udfb6',
  '\ud83d\udcac',
  '\ud83d\udcad',
  '\ud83d\uddef',
  '\ud83c\udccf',
  '\ud83e\udd53',
  '\ud83e\udd43',
  '\ud83c\udfa4',
  '\ud83d\udea8',
  '\ud83c\udfcd',
  '\ud83c\udfd5',
  '\u26fa\ufe0f',
  '\ud83c\udfdc',
  '\ud83c\udfd6',
  '\ud83c\udfdd',
  '\ud83c\udf07',
  '\ud83c\udf06',
  '\ud83c\udfd9',
  '\ud83c\udf03',
  '\ud83c\udfd8',
  '\ud83c\udfe1',
  '\ud83c\udfe2',
  '\ud83d\udd28',
  '\u2699',
  '\ud83d\udd2b',
  '\ud83d\udca3',
  '\ud83d\udd2a',
  '\ud83d\udc8a',
  '\ud83d\udd73',
  '\ud83d\udc89',
  '\ud83d\udec1',
  '\u26f1',
  '\ud83c\udf81',
  '\ud83c\udf88',
  '\ud83c\udf80',
  '\ud83d\udcc5',
  '\ud83d\uddf3',
  '\ud83d\udcda',
  '\u270f\ufe0f',
  '\u26aa\ufe0f',
  '\u26ab\ufe0f',
  '\u2b1b\ufe0f',
  '\u2b1c\ufe0f',
  '\ud83d\uddbc',
  '\ud83c\udfda',
  '\ud83c\udfed',
  '\ud83d\udd32',
  '\ud83d\udd33',
  '\ud83c\udfb1',
  '\ud83d\udd3a',
  '\ud83d\udd3b',
  '\ud83d\udca6',
  '\u26f3\ufe0f',
  '\ud83c\udfdf',
  '\ud83d\udca1',
  '\ud83d\udd2d',
  '\ud83d\udd2c',
  '\ud83d\udd70',
  '\ud83d\udc2a',
  '\ud83d\udc2b',
  '\ud83d\udc18',
  '\ud83d\udc38',
  '\ud83d\udc30',
  '\ud83d\udc2d',
  '\ud83d\udeaa',
  '\ud83d\udecd',
  '\ud83d\udc41',
  '\ud83c\udf53',
  '\ud83c\udf52',
  '\ud83c\udf36',
  '\ud83c\udf3d',
  '\ud83c\udf60',
  '\ud83c\udf6f',
  '\ud83c\udf5e',
  '\ud83c\udf6b',
  '\ud83c\udf7f',
  '\ud83c\udf6a',
  '\ud83c\udf4a',
  '\ud83c\udff9',
  '\ud83d\udc6f'
]

export const noSelection = (state: EditorState) => {
  return state.selection.main.anchor === state.selection.main.head
}

export const debounce = function (
  fn: (...args: unknown[]) => void,
  delay = 1000
) {
  let timer: NodeJS.Timeout = null
  return function (...args: unknown[]) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      // 确保调用返回函数的 this
      // 与执行函数 fn 的 this
      // 指向相同
      fn.call(this, ...args)
    }, delay)
  }
}

export const throttle = function <T extends unknown[]>(
  fn: (...args: T) => void,
  delay = 1000
) {
  let timer: NodeJS.Timeout = null
  return function (...args: T) {
    if (timer) return

    timer = setTimeout(() => {
      fn.call(this, ...args)
      timer = null
    }, delay)
  }
}

export function resolve2path(path1: string, path2: string) {
  const p1 = path1.endsWith('/') ? path1 : `${path1}/`
  const p2 = path2.startsWith('./')
    ? path2.slice(2)
    : path2.startsWith('/')
      ? path2.slice(1)
      : path2

  return `${p1}${p2}`
}

function getFormatTime(time: Date) {
  return `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`
}
export function formatTime(): string
export function formatTime(date: string): string
export function formatTime(date?: string | number) {
  if (!date) {
    const time = new Date()
    return getFormatTime(time)
  }

  return getFormatTime(new Date(date))
}

/**
 * Gets the time distance from the last update.
 *
 * @param date timestamp for `new Date()`
 * @returns time distance description.
 */
export function timeDistance(date: string): string
export function timeDistance(date: number): string
export function timeDistance(date: number | string): string {
  const oldDate = typeof date === 'string' ? new Date(date).valueOf() : date
  const current = new Date()
  const diff = (current.valueOf() - oldDate) / 1000

  if (diff < 60) return 'Seconds ago'

  if (diff < 120) return 'A minute ago'

  if (diff < 1800) return 'A few minute ago'

  if (diff < 3600) return 'Half an hour ago'

  if (diff < 7200) return 'An hour ago'

  if (diff < 86400) return 'A few hours ago'

  return 'A day ago'
}

export function getCurrentNote(notes: FileState[], relativeName: string) {
  if (!notes) return null

  const tokens = relativeName.split('/')
  const currentName = tokens[tokens.length - 1]
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].name === currentName) return notes[i]
  }

  return null
}

export function findFolderIndex(
  folders: RootWorkstationFolderInfo[],
  target: string
) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].name === target) return i
  }

  return -1
}
export function findFileIndex(files: FileState[], target: string) {
  for (let i = 0; i < files.length; i++) {
    if (files[i].name === target) return i
  }
  return -1
}

export function isValidFileName(fileName: string) {
  if (!fileName || fileName.startsWith('.') || fileName.indexOf(' ') !== -1)
    return false

  const regex = /^[^\\/:*?"<>|]{1,255}$/

  return regex.test(fileName)
}
