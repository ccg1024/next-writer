declare module '_common_type' {
  export type EditorChannel = {
    type: readonly 'typewriter'
    value?: unknown
  }

  export type TypeWriterIpcValue = {
    checked?: boolean
  }
}

export default '_common_type'
