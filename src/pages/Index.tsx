import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useDocument } from '@/hooks/useDocument';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import Toolbar from '@/components/Toolbar';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    content,
    setContent,
    isLoading,
    isSaving,
    usingFallback,
    urlLength,
    wordCount,
    charCount,
  } = useDocument();

  const [showPreview, setShowPreview] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    // Check system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <Loader2 className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="editor-container transition-theme">
      <Toolbar
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        wordCount={wordCount}
        charCount={charCount}
        isSaving={isSaving}
        usingFallback={usingFallback}
        urlLength={urlLength}
      />

      <main className={cn('content-area split-view', showPreview && 'show-preview')}>
        <div className="editor-pane">
          <Editor content={content} onChange={setContent} />
        </div>
        <div className="preview-pane">
          <Preview content={content} />
        </div>
      </main>
    </div>
  );
};

export default Index;
