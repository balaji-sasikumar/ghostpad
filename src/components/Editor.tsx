import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

const Editor = ({ content, onChange, className }: EditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert tab character
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Move cursor after tab
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'editor-textarea',
        className
      )}
      placeholder="Start writing..."
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
};

export default Editor;
