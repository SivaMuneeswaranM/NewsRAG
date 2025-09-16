import React from 'react'
import Chat from './components/Chat.jsx'

export default function App() {
  return (
    <div className="app">
      <div className="container">
        <h1>🗞️ RAG News Chatbot</h1>
        <p className="sub">Ask questions about the latest Reuters articles.</p>
        <Chat />
      </div>
    </div>
  )
}
