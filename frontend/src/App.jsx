import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import RightPanel from './components/RightPanel'
import ResizableDivider from './components/ResizableDivider'
import DatabaseManagerModal from './components/DatabaseManagerModal'
import { ChevronLeft, Info, X } from 'lucide-react'
import SettingsModal from './components/SettingsModal'
import OnboardingModal from './components/OnboardingModal'
import { useSettings } from './contexts/SettingsContext'
import geminiIcon from './assets/gemini.png'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSignalType, setActiveSignalType] = useState('Cardiac')
  const [chatPanelWidth, setChatPanelWidth] = useState(400)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [rightPanelTab, setRightPanelTab] = useState('chat') // 'chat' or 'learn'
  const [showDatabaseManager, setShowDatabaseManager] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('deeppulse_onboarded')
  )

  // Lifted state from Dashboard
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedRecord, setSelectedRecord] = useState('');
  const [signalData, setSignalData] = useState(null);
  const [cachedSignalImage, setCachedSignalImage] = useState(null);

  // Sync CSS variable with React state
  useEffect(() => {
    // If closed, width is effectively 0 for the grid, but we keep the variable for when it opens
    const width = isRightPanelOpen ? chatPanelWidth : 0;
    document.documentElement.style.setProperty('--chat-panel-width', `${width}px`)
  }, [chatPanelWidth, isRightPanelOpen])

  const handleResize = useCallback((newWidth) => {
    setChatPanelWidth(newWidth)
  }, [])

  return (
    <div className="app-root">
      {/* Announcement / Disclaimer Bar */}
      {showDisclaimer && (
        <div className="announcement-bar">
          <div className="announcement-content">
            <Info size={14} />
            <span>For educational and research purposes only. AI analyses use anonymized PhysioNet data and should be verified independently.</span>
          </div>
          <button className="announcement-close" onClick={() => setShowDisclaimer(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSignalType={activeSignalType}
        setActiveSignalType={setActiveSignalType}
        onDatabaseClick={() => setShowDatabaseManager(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            signalType={activeSignalType}
            setSignalType={setActiveSignalType}
            // Pass lifted state
            selectedDatabase={selectedDatabase}
            setSelectedDatabase={setSelectedDatabase}
            selectedRecord={selectedRecord}
            setSelectedRecord={setSelectedRecord}
            signalData={signalData}
            setSignalData={setSignalData}
            setCachedSignalImage={setCachedSignalImage}
          />
        )}

        {/* Toggle Button when panel is closed */}
        {!isRightPanelOpen && (
          <button
            onClick={() => setIsRightPanelOpen(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 100,
              background: 'rgba(22, 27, 34, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e3e3e3',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <ChevronLeft size={16} />
            <span>Open Panel</span>
          </button>
        )}
      </main>

      {isRightPanelOpen && (
        <ResizableDivider
          onResize={handleResize}
          minWidth={300}
          maxWidth={800}
          defaultWidth={400}
        />
      )}

      {/* Always render container but control visibility with CSS/Width */}
      {isRightPanelOpen && (
        <div className="right-panel">
          <RightPanel
            isOpen={isRightPanelOpen}
            onClose={() => setIsRightPanelOpen(false)}
            activeTab={rightPanelTab}
            setActiveTab={setRightPanelTab}
            signalType={activeSignalType}
            signalData={signalData}
            preloadedImage={cachedSignalImage}
          />
        </div>
      )}

      {/* Database Manager Modal */}
      {showDatabaseManager && (
        <DatabaseManagerModal onClose={() => setShowDatabaseManager(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onShowOnboarding={() => {
            setShowSettingsModal(false)
            localStorage.removeItem('deeppulse_onboarded')
            setShowOnboarding(true)
          }}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => {
          localStorage.setItem('deeppulse_onboarded', 'true')
          setShowOnboarding(false)
        }} />
      )}
    </div>

      {/* Footer */}
      <div className="app-footer">
        <img src={geminiIcon} alt="Gemini" className="footer-icon" />
        <span>Powered by Gemini 3 Flash</span>
      </div>
    </div>
  )
}

export default App

