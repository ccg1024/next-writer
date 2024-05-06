import { createRoot } from 'react-dom/client'
import Home from './components/home'

// initial global var
window._next_writer_rendererConfig = {
  workpath: '', // The path to which the editor edits the file
  modified: false,
  plugin: {}
}

const root = createRoot(document.getElementById('root'))
root.render(<Home />)
