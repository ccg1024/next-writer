export function handleLeavFullScreen() {
  if (!global._next_writer_windowConfig.menuStatus.sideBarVisble) {
    global._next_writer_windowConfig.win.setWindowButtonVisibility(false)
  }
}
