// Component communication middle layer
import PubSub from 'pubsub-js'
import { FileState, HeadNav, RootWorkstationFolderInfo } from '_types'

// Define main-channel and sub-channel of every component
const channels = {
  'nw-editor-pubsub': [
    'readfile',
    'writefile',
    'head-jump',
    'insert-emoji',
    'mount-plugin-scheduler',
    'mount-preview',
    'toolbar-event'
  ] as const,
  'nw-float-emoji-pubsub': ['open', 'close'] as const,
  'nw-filesystem-pubsub': ['nw-filesystem-add', 'nw-sync-filesystem'] as const,
  'nw-user-pubsub': ['nw-user-pubsub-reply'] as const,
  'nw-input-pubsub': [''] as const,
  'nw-hover-image-pubsub': ['show-hover-image'] as const,
  'nw-show-message': [''] as const,
  'nw-head-nav-pubsub': ['heads-list', 'top-head-line'] as const,
  'nw-sidebar-pubsub': [
    'nw-sidebar-file-change',
    'nw-sidebar-add-recent-file'
  ] as const,
  'nw-preview-pubsub': ['sync-scroll', 'sync-doc'] as const,
  'nw-home-pubsub': ['toggle-global-loading'] as const,
  'nw-sidebar-menu-pubsub': ['show-menu', 'close-menu'] as const
}
type Channels = typeof channels
type ChannelName = keyof Channels
type ChannelAction<T extends ChannelName> = Channels[T][number]
export type RenderNewFileType = {
  pathType: 'file' | 'folder'
  replyType?: ChannelAction<ChannelName>
  replyChannel?: ChannelName
  pathPrefix: string
}

type DataUnit = {
  // nw-editor-pubsub
  jumpPos: number
  emoji: string
  eventName: string

  // nw-float-emoji-pubsub
  top: number
  left: number

  // nw-filesystem-pubsub
  parent: string
  pathType: 'file' | 'folder'
  pathName: string
  replyChannel: ChannelName
  replyType: ChannelAction<ChannelName>
  pathPrefix: string
  files: Array<FileState>
  folders: Array<RootWorkstationFolderInfo>

  // nw-hover-image-pubsub
  src: string

  // nw-show-message
  message: string

  // nw-head-nav-pubsub
  heads: HeadNav[]
  line: number

  // nw-sidebar-pubsub
  status: 'modified' | 'normal'
  isChange: boolean
  path: string
  name: string

  // nw-preview-pubsub
  percent: number
  doc: string
  timestamp: number

  // nw-home-pubsub
  loading: boolean

  // nw-sidebar-menu-pubsub
  coordsX: number
  coordsY: number
  filepath: string
}

type ChannelData<T extends ChannelName> = {
  type: ChannelAction<T>
  data?: Partial<DataUnit>
}
interface SubscribeCallback<T extends ChannelName> {
  (channel: T, payload?: ChannelData<T>): void
}

export function pub<T extends ChannelName>(
  channel: T,
  payload?: ChannelData<T>
) {
  return PubSub.publish(channel, payload)
}
export function sub<T extends ChannelName>(
  channel: T,
  callback: SubscribeCallback<T>
) {
  return PubSub.subscribe(channel, callback)
}
export function unsub(token: string) {
  return PubSub.unsubscribe(token)
}
