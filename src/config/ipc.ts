export const ipcChannel = {
  'main-to-render': {
    editor_component: 'editor_component',
    home_component: 'home_component',
    sidebar_component: 'sidebar_component',
    filesystem_component: 'filesystem_component'
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

export const ONE_WAY_CHANNEL = 'render-to-main'
export const TWO_WAY_CHANNEL = 'render-to-main-to-render'
