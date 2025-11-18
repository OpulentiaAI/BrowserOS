import React, { useEffect, useState } from 'react';
import MessageList from './MessageList';
import StatusPanel from './StatusPanel';
import ToolCallIndicator from './ToolCallIndicator';
import ErrorMessage from './ErrorMessage';
import GlowIndicator from './GlowIndicator';
import LogPanel from './LogPanel';
import TeachModePanel from './TeachModePanel';
import { useChatStore, selectMessages, selectIsProcessing } from '../stores/chatStore';

function Chat({ currentUrl, initialMessage, onMessageSent }) {
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
  
  // Track runtime events
  const [activeGlows, setActiveGlows] = useState([]); // {tabId, toolName, executionId, timestamp}
  const [logEvents, setLogEvents] = useState([]); // {source, message, level, timestamp}
  const [metricEvents, setMetricEvents] = useState([]); // {event, properties, timestamp}
  const [teachModeState, setTeachModeState] = useState(null); // {status, workflow, currentStep, etc.}
  const [mcpStatus, setMcpStatus] = useState(null); // {servers, activeServer, etc.}

  // Handle initial message from quick actions
  useEffect(() => {
    if (initialMessage && !isProcessing) {
      handleSendMessage(initialMessage);
      if (onMessageSent) {
        onMessageSent();
      }
    }
  }, [initialMessage]);

  useEffect(() => {
    // Listen for streaming agent responses
    const unsubscribe = window.electron.onAgentStream((data) => {
      if (data.type === 'status') {
        // Initial status update - clear any previous error and runtime state
        setLastError(null);
        setActiveGlows([]);
        setLogEvents([]);
        setMetricEvents([]);
        setTeachModeState(null);
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
      } else if (data.type === 'glow') {
        // Glow animation start/stop
        if (data.action === 'start') {
          setActiveGlows((prev) => [
            ...prev.filter((g) => g.tabId !== data.tabId), // Remove any existing glow for this tab
            { tabId: data.tabId, toolName: data.toolName, executionId: data.executionId, timestamp: Date.now() }
          ]);
        } else if (data.action === 'stop') {
          setActiveGlows((prev) => prev.filter((g) => g.tabId !== data.tabId));
        }
      } else if (data.type === 'log') {
        // Logging event
        setLogEvents((prev) => [...prev, { source: data.source, message: data.message, level: data.level, timestamp: data.timestamp }].slice(-100)); // Keep last 100 logs
      } else if (data.type === 'metric') {
        // Metric event
        setMetricEvents((prev) => [...prev, { event: data.event, properties: data.properties, timestamp: data.timestamp }].slice(-50)); // Keep last 50 metrics
      } else if (data.type === 'pubsub') {
        // PubSub event - handle teach-mode and MCP events
        const pubsubEvent = data.event;
        if (pubsubEvent.type === 'teach:thinking' || pubsubEvent.type === 'teach:workflow_ready' || 
            pubsubEvent.type === 'teach:workflow_complete' || pubsubEvent.type === 'teach:human_input_requested') {
          // Teach-mode event
          setTeachModeState({
            type: pubsubEvent.type,
            payload: pubsubEvent.payload,
            timestamp: Date.now()
          });
        } else if (pubsubEvent.type?.startsWith('mcp:')) {
          // MCP status event
          setMcpStatus({
            type: pubsubEvent.type,
            payload: pubsubEvent.payload,
            timestamp: Date.now()
          });
        }
      } else if (data.type === 'complete') {
        // Agent task completed
        setActiveToolCalls([]);
        setActiveGlows([]); // Clear any remaining glows
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
        setActiveGlows([]);
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
      <GlowIndicator
        glows={activeGlows}
        visible={activeGlows.length > 0}
      />
      <TeachModePanel
        teachState={teachModeState}
        mcpStatus={mcpStatus}
        visible={!!(teachModeState || mcpStatus)}
      />
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
      <LogPanel
        logs={logEvents}
        visible={logEvents.length > 0}
      />
    </div>
  );
}

export default Chat;
