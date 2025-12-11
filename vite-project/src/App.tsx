import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>

        <iframe
            src="studio/index.html"
            width="800"
            height="800"
            style={{ border: '1px solid #ccc', borderRadius: '8px' }}
            title="studio-app"
        />
        {/* 内嵌iframe /dist/index.html 路径是相对于资源目录的 */}
        {/* <iframe src="../../studio/dist/index.html" width="100%" height="100%" /> */}
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="qwe" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
