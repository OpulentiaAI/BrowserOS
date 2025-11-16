import React, { useEffect, useState } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import StatusPanel from './StatusPanel';
import ToolCallIndicator from './ToolCallIndicator';
import ErrorMessage from './ErrorMessage';
import { useChatStore, selectMessages, selectIsProcessing } from '../stores/chatStore';

function Chat({ currentUrl }) {
  const messages = useChatStore(selectMessages);
  const isProcessing = useChatStore(selectIsProcessing);
  const addMessage = useChatStore((state) => state.addMessage);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const setProcessing = useChatStore((state) => state.setProcessing);
  
  // Track execution status
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [currentTodoList, setCurrentTodoList] = useState(null);
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [lastPrompt, setLastPrompt] = useState(null);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        msgId: 'assistant-welcome',
        role: 'assistant',
        content: 'Hi! I\'m your BrowserOS copilot. Ask me to summarize this page, extract data, or automate a task.'
      });
    }
  }, [messages.length, addMessage]);

  useEffect(() => {
    // Listen for streaming agent responses
    const unsubscribe = window.electron.onAgentStream((data) => {
      if (data.type === 'status') {
        // Initial status update - clear any previous error
        setLastError(null);
        console.log('Agent started with tools:', data.tools);
      } else if (data.type === 'text-delta') {
        // Stream text updates to the current assistant message
        upsertMessage({
          msgId: streamMsgIdRef.current,
          role: 'assistant',
          content: data.fullText
        });
      } else if (data.type === 'tool-calls') {
        // Tool calls being executed - show visual indicator
        setActiveToolCalls(data.toolCalls);
        console.log('Tool calls:', data.toolCalls);
      } else if (data.type === 'tool-results') {
        // Tool results returned - clear active tools
        setActiveToolCalls([]);
        console.log('Tool results:', data.results);
      } else if (data.type === 'complete') {
        // Agent task completed
        setActiveToolCalls([]);
        upsertMessage({
          msgId: streamMsgIdRef.current,
          role: 'assistant',
          content: data.text,
          metadata: {
            metrics: data.metrics,
            todoList: data.todoList
          }
        });
        // Update status panel
        setCurrentMetrics(data.metrics);
        setCurrentTodoList(data.todoList);
        setProcessing(false);
      } else if (data.type === 'error') {
        // Error occurred - show enhanced error message
        setActiveToolCalls([]);
        setLastError({
          message: data.error,
          timestamp: Date.now()
        });
        setProcessing(false);
      }
    });

    return () => unsubscribe();
  }, [upsertMessage, setProcessing, addMessage]);

  const streamMsgIdRef = React.useRef(null);

  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    // Clear previous error and track this prompt for retry
    setLastError(null);
    setLastPrompt(trimmed);

    const userMsgId = `user-${Date.now()}`;
    addMessage({ msgId: userMsgId, role: 'user', content: trimmed });
    setProcessing(true);

    // Create a new assistant message for streaming
    streamMsgIdRef.current = `assistant-${Date.now()}`;
    addMessage({
      msgId: streamMsgIdRef.current,
      role: 'assistant',
      content: ''
    });

    try {
      const response = await window.electron.runAgentTask({
        prompt: trimmed,
        currentUrl
      });

      // Final update with complete response
      if (response?.text) {
        upsertMessage({
          msgId: streamMsgIdRef.current,
          role: 'assistant',
          content: response.text,
          metadata: response.metadata
        });
      }
    } catch (error) {
      setLastError({
        message: error?.message || 'The agent encountered an error.',
        stack: error?.stack,
        timestamp: Date.now()
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    if (lastPrompt && !isProcessing) {
      handleSendMessage(lastPrompt);
    }
  };

  const handleDismissError = () => {
    setLastError(null);
  };

  return (
    <div className="chat-container">
      <MessageList messages={messages} isProcessing={isProcessing} />
      <ToolCallIndicator 
        toolCalls={activeToolCalls}
        visible={activeToolCalls.length > 0}
      />
      <ErrorMessage
        error={lastError}
        onRetry={handleRetry}
        onDismiss={handleDismissError}
      />
      <StatusPanel 
        metrics={currentMetrics} 
        todoList={currentTodoList}
        visible={!!(currentMetrics || currentTodoList)}
      />
      <ChatInput onSubmit={handleSendMessage} disabled={isProcessing} />
    </div>
  );
}

export default Chat;
