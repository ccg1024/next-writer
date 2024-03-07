declare module '_common_type' {
  export type EditorChannel = {
    type: readonly 'typewriter' | 'readfile' | 'insertImage'
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
}

export default '_common_type'
