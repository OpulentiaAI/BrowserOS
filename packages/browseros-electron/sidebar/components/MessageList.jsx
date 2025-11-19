import React, { useEffect, useRef } from 'react';
import { ToolView, ReasoningTrace } from './ToolComponents';

function MessageList({ messages, isProcessing }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  return (
    <div className="messages" ref={listRef}>
      {messages.map((message) => (
        <MessageBubble key={message.msgId} message={message} />
      ))}
      {isProcessing && (
        <div className="message assistant">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const roleClass = message.role || 'assistant';
  const { content, metadata } = message;

  // Use timeline if available, otherwise fallback to legacy rendering
  const timeline = metadata?.timeline;

  return (
    <div className={`message ${roleClass}`} data-message-id={message.msgId}>
      <div className="message-avatar">
        {roleClass === 'user' ? '👤' : roleClass === 'error' ? '⚠️' : '🤖'}
      </div>
      <div className="message-content">
        
        {timeline ? (
          // Render interleaved timeline
          timeline.map((part, idx) => {
            if (part.type === 'reasoning') {
              return <ReasoningTrace key={idx} content={part.content} />;
            } else if (part.type === 'tool') {
              return <ToolView key={idx} toolCall={part.tool} result={part.result} />;
            } else if (part.type === 'text') {
              return <div key={idx} className="markdown-body">{part.content}</div>;
            }
            return null;
          })
        ) : (
          // Legacy rendering
          <>
            {metadata?.reasoning && <ReasoningTrace content={metadata.reasoning} />}
            {content && <div className="markdown-body">{content}</div>}
            {metadata?.toolCalls && metadata.toolCalls.map((tool, idx) => (
              <ToolView 
                key={idx} 
                toolCall={tool} 
                result={metadata.toolResults?.[idx]} 
              />
            ))}
          </>
        )}
        
      </div>
    </div>
  );
}

export default MessageList;
