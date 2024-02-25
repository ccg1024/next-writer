import { createRoot } from 'react-dom/client'
import Home from './components/home'

// initial global var
window._next_writer_rendererConfig = {
  rendererPlugin: {
    typewriter: false
  }
}

const root = createRoot(document.getElementById('root'))
root.render(<Home />)
