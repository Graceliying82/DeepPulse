import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatAssistant from './components/ChatAssistant'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSignalType, setActiveSignalType] = useState('Cardiac')

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSignalType={activeSignalType}
        setActiveSignalType={setActiveSignalType}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard signalType={activeSignalType} />
        )}
        {/* We can have overlapping chat or separate page. 
            For the design "Right panel Chat", we might want it always visible or toggleable.
            Let's make it a persistent right panel for the "Research Assistant" feel. 
        */}
      </main>

      <div className="right-panel">
        <ChatAssistant signalType={activeSignalType} />
      </div>
    </div>
  )
}

export default App
