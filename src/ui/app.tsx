import { createRoot } from 'react-dom/client'
import Home from './components/home'

// initial global var
window._next_writer_rendererConfig = {
  rendererPlugin: {
    typewriter: false
  },
  workPath: '', // The path to which the editor edits the file
  modified: false
}

const root = createRoot(document.getElementById('root'))
root.render(<Home />)
