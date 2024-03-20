declare module '_common_type' {
  type NormalObj = {
    [key: string]: string | boolean | number | null | undefined | object
  }
  export type EditorChannel = {
    type: readonly 'typewriter' | 'readfile' | 'insertImage' | 'writefile'
    value?: unknown
  }

  export type HomeChannel = {
    type: readonly 'hideSidebar'
    value?: unknown
  }

  export type CheckBoxValue = {
    checked: boolean
  }

  export type TypeWriterIpcValue = {
    checked?: boolean
  }

  export type ReadFileIpcValue = {
    content: string
    fileDescriptor: FileDescriptor
  }
  export type FileDescriptor = {
    isChange: boolean
    path: string
    name: string
  }
  export type FileDescriptorContainer = {
    [key: string]: FileDescriptor
  }

  export type InvokeInfoType = readonly 'workstation'

  export type IpcRequestData = {
    type: string
    data?: NormalObj
  }

  export type IpcResponseData = {
    data?: unknown
    error?: string
  }

  export type AddFileBody = {
    path: string
    option: readonly 'file' | 'folder'
  }

  export type RootWorkstationInfo = {
    folders: Array<RootWorkstationFolderInfo>
    files: Array<string>
  }
  export type RootWorkstationFolderInfo = {
    name: string
    subfolders: RootWorkstationInfo
  }

  export type IpcServerSend = {
    type: string
    data?: unknown
  }
}

export default '_common_type'
