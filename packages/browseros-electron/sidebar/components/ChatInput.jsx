import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, CircleFadingPlus, AtSign, ShipWheel, AudioWaveform } from 'lucide-react';

function ChatInput({ onSubmit, disabled, placeholder = "Ask, search, or make anything…" }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSubmit(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.textContent = '';
      }
    }
  };

  const handleInput = (e) => {
    setMessage(e.currentTarget.textContent || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current && !message) {
      textareaRef.current.textContent = '';
    }
  }, [message]);

  const isDisabled = disabled || !message.trim();

  return (
    <div className="w-full max-w-[360px] bg-white rounded-[22px] shadow-[0_8px_12px_0_rgba(25,25,25,0.027),0_2px_6px_0_rgba(25,25,25,0.027),0_0_0_1px_rgba(42,28,0,0.07)] border-2 border-[#2783de] transition-shadow duration-100 ease-in-out">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-2 pt-2">
          <button 
            type="button" 
            className="flex items-center justify-center h-6 px-0.5 rounded-full border border-[#e6e5e3] transition-colors duration-[0.02s] ease-in hover:bg-gray-50 active:bg-gray-100" 
            aria-label="Add context"
          >
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <AtSign className="w-4 h-4 text-[#8e8b86]" />
            </div>
          </button>
        </div>

        <div 
          ref={textareaRef}
          contentEditable={!disabled}
          role="textbox"
          aria-label="Start typing to edit text"
          className="w-full px-2 py-2 text-sm leading-5 text-[#2c2c2b] min-h-[40px] max-h-[240px] overflow-y-auto break-words outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#a19e99]"
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          style={{
            whiteSpace: 'break-spaces',
            wordBreak: 'break-word',
            caretColor: '#2c2c2b'
          }}
        />

        <div className="flex items-center justify-between gap-1.5 px-1.5 pb-1.5">
          <div className="flex items-center gap-0.5 flex-1 min-w-0">
            <button 
              type="button" 
              aria-label="Attach file" 
              className="flex items-center justify-center flex-shrink-0 h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in hover:bg-gray-100 active:bg-gray-200"
            >
              <Paperclip className="w-4 h-4 text-[#8e8b86]" />
            </button>

            <button 
              type="button" 
              aria-label="Agent" 
              className="flex items-center justify-center h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in hover:bg-gray-50 active:bg-gray-100"
            >
              <span className="text-[#7d7a75] text-xs font-medium">A</span>
            </button>

            <button 
              type="button" 
              aria-label="Models" 
              className="flex items-center justify-center h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in hover:bg-gray-50 active:bg-gray-100"
            >
              <ShipWheel className="w-4 h-4 text-[#7d7a75]" />
            </button>

            <button 
              type="button" 
              aria-label="Connectors" 
              className="flex items-center justify-center h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in hover:bg-gray-50 active:bg-gray-100 flex-shrink-0"
            >
              <CircleFadingPlus className="w-4 h-4 text-[#8e8b86]" />
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button 
              type="button" 
              aria-label="Audio waveform" 
              className="flex items-center justify-center flex-shrink-0 h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in hover:bg-gray-100 active:bg-gray-200"
            >
              <AudioWaveform className="w-3.5 h-3.5 text-[#8e8b86]" />
            </button>

            <button 
              type="button" 
              onClick={handleSend}
              disabled={isDisabled}
              aria-label="Submit AI message"
              className={`flex items-center justify-center flex-shrink-0 h-6 w-6 rounded-full transition-colors duration-[0.02s] ease-in ${isDisabled ? 'bg-[#8e8b86] opacity-40 cursor-default' : 'bg-[#8e8b86] hover:bg-[#7d7a75] active:bg-[#6d6a65] cursor-pointer'}`}
            >
              <Send className="w-3.5 h-3.5 text-[#f0efed]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
