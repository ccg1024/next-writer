import SideBar from './sidebar'
import Editor from './editor'

import '../css/home.css'

const Home = () => {
  return (
    <div id="home">
      <SideBar />
      <div className="home-container">
        <Editor />
      </div>
    </div>
  )
}

export default Home
