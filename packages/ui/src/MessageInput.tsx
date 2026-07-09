import { useState, useRef, useEffect } from 'preact/hooks';

interface MessageInputProps {
  placeholder: string;
  disabled: boolean;
  onSend: (message: string) => void;
  isStreaming?: boolean;
  onAbort?: () => void;
}

/**
 * Message input component with auto-growing textarea (max 3 lines)
 * OWASP: Input validation and sanitization
 */
export function MessageInput({
  placeholder,
  disabled,
  onSend,
  isStreaming = false,
  onAbort,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate line height on mount
  useEffect(() => {
    if (textareaRef.current) {
      const computedStyle = window.getComputedStyle(textareaRef.current);
      const lineHeight = parseInt(computedStyle.lineHeight);
      // Store for max height calculation
      textareaRef.current.dataset.lineHeight = lineHeight.toString();
    }
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    
    // OWASP: Input validation
    if (!trimmed || disabled) return;
    
    // OWASP: Length limit to prevent DoS
    if (trimmed.length > 5000) {
      alert('Message is too long (max 5000 characters)');
      return;
    }

    onSend(trimmed);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Send on Enter (without Shift), but not while composing (for Asian languages)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    
    // OWASP: Prevent very long single messages (client-side check)
    if (value.length > 5000) {
      setMessage(value.substring(0, 5000));
      return;
    }
    
    setMessage(value);
    
    // Auto-resize textarea up to 3 lines
    const lineHeight = parseInt(target.dataset.lineHeight || '24');
    const maxHeight = lineHeight * 3; // 3 lines max
    
    target.style.height = 'auto';
    const newHeight = Math.min(target.scrollHeight, maxHeight);
    target.style.height = `${newHeight}px`;
  };

  return (
    <div
      class="border-t p-4"
      style={{
        backgroundColor: 'var(--widget-background-color)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <div class="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={5000}
          class="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto custom-scrollbar"
          style={{
            borderColor: 'rgba(0, 0, 0, 0.2)',
            color: 'var(--widget-text-color)',
            minHeight: '40px',
          }}
          aria-label="Message input"
        />
        
        <button
          onClick={isStreaming ? onAbort : handleSend}
          disabled={isStreaming ? !onAbort : disabled || !message.trim()}
          class="px-4 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: isStreaming ? '#ef4444' : 'var(--widget-primary-color)',
            minHeight: '40px',
          }}
          type="button"
          aria-label={isStreaming ? 'Stop generation' : 'Send message'}
        >
          {isStreaming ? (
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          ) : (
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
      
      {/* Character count indicator */}
      {message.length > 4500 && (
        <div class="text-xs text-gray-500 mt-1 text-right">
          {message.length} / 5000
        </div>
      )}
    </div>
  );
}
