export const ipcChannel = {
  'main-to-render': {
    editor_component: 'editor_component',
    home_component: 'home_component',
    sidebar_component: 'sidebar_component'
  },
  'render-to-main': {
    _render_open_file: '_render_open_file',
    _render_update_cache: '_render_update_cache',
    _render_save_file: '_render_save_file'
  },
  'invoke-channel': {
    _invoke_get_info: '_invoke_get_info'
  }
}
