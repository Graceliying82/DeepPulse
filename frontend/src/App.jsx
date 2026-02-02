import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatAssistant from './components/ChatAssistant'
import ResizableDivider from './components/ResizableDivider'
import SettingsModal from './components/SettingsModal'
import { useApiKey } from './contexts/ApiKeyContext'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSignalType, setActiveSignalType] = useState('Cardiac')
  const [chatPanelWidth, setChatPanelWidth] = useState(350)
  const [showSettings, setShowSettings] = useState(false)
  const { hasApiKey } = useApiKey()

  // Sync CSS variable with React state (for when drag ends)
  useEffect(() => {
    document.documentElement.style.setProperty('--chat-panel-width', `${chatPanelWidth}px`)
  }, [chatPanelWidth])

  const handleResize = useCallback((newWidth) => {
    setChatPanelWidth(newWidth)
  }, [])

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

      <ResizableDivider
        onResize={handleResize}
        minWidth={280}
        maxWidth={600}
        defaultWidth={350}
      />

      <div className="right-panel">
        <ChatAssistant signalType={activeSignalType} />
      </div>

      {/* Settings button - fixed position */}
      <button
        className={`settings-fab ${!hasApiKey ? 'needs-attention' : ''}`}
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
        ⚙️
        {!hasApiKey && <span className="attention-dot"></span>}
      </button>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

export default App
