import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import BrowserNavbar from './BrowserNavbar';

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }
  const handleUrlChange = (newUrl: string): void => {
    console.log('URL 改变为:', newUrl);
    // 这里可以触发页面加载或其他操作
  };

  const handleNavigate = (url: string, action?: 'back' | 'forward' | 'refresh' | 'home'): void => {
    console.log(`导航: ${action || 'direct'} -> ${url}`);
    // 处理导航操作
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
        <div className="row" style={{
            gap: 10,
        }}>
          {/* 写三个好看的按钮 点击跳转  */}
          <button onClick={() => window.location.href = 'https://www.baidu.com'}>Button 1</button>
          <button onClick={() => window.location.href = 'https://www.baidu.com'}>Button 2</button>
          <button onClick={() => window.location.href = 'https://www.baidu.com'}>Button 3</button>
        </div>
        <BrowserNavbar
          initialUrl="https://www.google.com"
          onUrlChange={handleUrlChange}
          onNavigate={handleNavigate}
        />
    </main>
  );
}

export default App;
