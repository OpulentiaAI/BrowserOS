import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, Maximize2, Search, Bug, Sparkles, Code, Send, Paperclip, AlertTriangle, Globe, ChevronDown } from 'lucide-react';
import Chat from './components/Chat';
import ChatInput from './components/ChatInput';
import ResizeHandle from './components/ResizeHandle';
import { useChatStore, selectMessages } from './stores/chatStore';
import logoSvg from '../spiral_dots_translucent.svg';

function App() {
  const messages = useChatStore(selectMessages);
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [initialMessage, setInitialMessage] = useState(null);

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

  const handleQuickAction = (text) => {
    setInitialMessage(text);
  };

  return (
    <div className="flex overflow-hidden flex-col transition-[width] ease-out relative min-w-0 h-screen"
      style={{
        transitionDuration: '0.15s',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        width: '400px',
        maxWidth: '400px'
      }}>
      <div className="bg-sidebar border-sidebar-border flex h-full w-full flex-col border-0 relative min-w-0 max-w-full"
        style={{
          transformOrigin: '0px 365px',
          willChange: 'transform, opacity, filter',
          filter: 'blur(0px)'
        }}>
        <div className="flex h-full w-full flex-col min-w-0 max-w-full">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-sidebar-border flex-shrink-0 border-b">
              <div className="text-muted-foreground flex flex-row gap-4 items-center justify-between px-2 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide p-0.5">
                  <div className="relative shrink-0">
                    <div className="inline-flex items-center justify-center whitespace-nowrap font-medium gap-1.5 h-auto rounded-[0.6rem] px-2 py-1 text-xs bg-secondary text-foreground shadow-sm">
                      <span className="overflow-hidden whitespace-nowrap">Opulent Browser</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 focus-visible:outline disabled:cursor-not-allowed select-none group/button backdrop-blur-none hover:bg-accent dark:hover:bg-accent/50 size-6 rounded-md">
                    <Clock className="size-4" />
                  </button>
                  <button className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 focus-visible:outline disabled:cursor-not-allowed select-none group/button backdrop-blur-none hover:bg-accent dark:hover:bg-accent/50 size-6 rounded-md">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Welcome screen + Chat - scrollable area */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Welcome screen - shown when there are no messages */}
                {messages.length === 0 && (
                  <div className="p-6">
                    <div className="text-start w-full flex flex-col gap-4 items-start">
                      <div className="px-2">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center" style={{
                            width: '56px',
                            height: '56px'
                          }}>
                            <img
                              src={logoSvg}
                              alt="Opulent Browser Logo"
                              className="w-full h-full"
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold px-2 mb-2 text-foreground">
                        What should we do today?
                      </h3>

                      <div className="flex flex-col gap-2 w-full">
                        <button
                          onClick={() => handleQuickAction('Summarize this page')}
                          className="pl-2.5 pr-4 py-2 rounded-sm text-muted-foreground text-sm transition-colors text-left cursor-pointer hover:bg-accent flex items-center gap-2.5 font-normal">
                          <Search className="size-5 shrink-0 text-foreground" />
                          Summarize this page
                        </button>
                        <button
                          onClick={() => handleQuickAction('Extract all data from this page into a structured format')}
                          className="pl-2.5 pr-4 py-2 rounded-sm text-muted-foreground text-sm transition-colors text-left cursor-pointer hover:bg-accent flex items-center gap-2.5 font-normal">
                          <Code className="size-5 shrink-0 text-foreground" />
                          Extract data from this page
                        </button>
                        <button
                          onClick={() => handleQuickAction('Navigate to Gmail and check for new messages')}
                          className="pl-2.5 pr-4 py-2 rounded-sm text-muted-foreground text-sm transition-colors text-left cursor-pointer hover:bg-accent flex items-center gap-2.5 font-normal">
                          <Globe className="size-5 shrink-0 text-foreground" />
                          Check Gmail for new messages
                        </button>
                        <button
                          onClick={() => handleQuickAction('Search for the latest AI news')}
                          className="pl-2.5 pr-4 py-2 rounded-sm text-muted-foreground text-sm transition-colors text-left cursor-pointer hover:bg-accent flex items-center gap-2.5 font-normal">
                          <Sparkles className="size-5 shrink-0 text-foreground" />
                          Search for AI news
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat messages and status panels */}
                <Chat currentUrl={currentUrl} initialMessage={initialMessage} onMessageSent={() => setInitialMessage(null)} />
              </div>

              {/* ChatInput - fixed at bottom */}
              <div className="flex-shrink-0 border-t border-sidebar-border bg-sidebar">
                <div className="px-3 py-3 flex justify-center">
                  <ChatInput
                    onSubmit={(message) => {
                      // Forward to Chat component via initialMessage
                      setInitialMessage(message);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ResizeHandle />
    </div>
  );
}

export default App;
