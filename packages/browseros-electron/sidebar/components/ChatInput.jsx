import { useState, useRef, useEffect } from 'react';

function ChatInput({ onSubmit, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me to browse, summarize, or automate tasks..."
        className="chat-input"
        disabled={disabled}
        rows={1}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="send-button"
      >
        {disabled ? '⏳' : '➤'}
      </button>
    </form>
  );
}

export default ChatInput;
