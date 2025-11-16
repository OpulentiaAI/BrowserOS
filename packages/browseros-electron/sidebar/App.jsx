import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import BrowserControls from './components/BrowserControls';
import ResizeHandle from './components/ResizeHandle';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  useEffect(() => {
    // Listen for URL changes
    const unsubscribeUrl = window.electron.onUrlChange((url) => {
      setCurrentUrl(url);
    });

    // Listen for page loads
    const unsubscribePage = window.electron.onPageLoad((data) => {
      setCurrentUrl(data.url);
      setPageTitle(data.title);
    });

    // Get initial URL
    window.electron.getCurrentUrl().then(setCurrentUrl);
    window.electron.getPageTitle().then(setPageTitle);

    return () => {
      unsubscribeUrl();
      unsubscribePage();
    };
  }, []);

  const handleNavigate = async (url) => {
    try {
      await window.electron.navigate(url);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="logo">
          <span className="logo-icon">🌟</span>
          <span className="logo-text">Opulent</span>
        </div>
        <div className="header-actions">
          <button 
            className="icon-button"
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Browser info */}
      <div className="browser-info">
        <div className="url-display" title={currentUrl}>
          {currentUrl || 'No page loaded'}
        </div>
        {pageTitle && (
          <div className="page-title">{pageTitle}</div>
        )}
      </div>

      {/* Browser controls */}
      <BrowserControls onNavigate={handleNavigate} currentUrl={currentUrl} />

      {/* Tab navigation */}
      <div className="tabs">
        <TabButton
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
          icon="💬"
        >
          Chat
        </TabButton>
        <TabButton
          active={activeTab === 'tools'}
          onClick={() => setActiveTab('tools')}
          icon="🔧"
        >
          Tools
        </TabButton>
      </div>

      {/* Content */}
      <div className="content">
        {activeTab === 'chat' && (
          <Chat
            isRunning={isAgentRunning}
            setIsRunning={setIsAgentRunning}
            currentUrl={currentUrl}
          />
        )}
        {activeTab === 'tools' && (
          <div className="tools-panel">
            <h3>Browser Tools</h3>
            <p>Tool panel coming soon...</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="settings-panel">
            <h3>Settings</h3>
            <p>Settings coming soon...</p>
            <button onClick={() => setActiveTab('chat')}>Back to Chat</button>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <ResizeHandle />
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`tab-button ${active ? 'active' : ''}`}
    >
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{children}</span>
    </button>
  );
}

export default App;
