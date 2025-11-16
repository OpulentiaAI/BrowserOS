import { useEffect, useRef } from 'react';

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

  return (
    <div className={`message ${roleClass}`} data-message-id={message.msgId}>
      <div className="message-avatar">
        {roleClass === 'user' ? '👤' : roleClass === 'error' ? '⚠️' : '🤖'}
      </div>
      <div className="message-content">
        {message.content}
      </div>
    </div>
  );
}

export default MessageList;
