/**
 * Custom hook for document state management
 * 
 * Handles:
 * - Loading content from URL or localStorage
 * - Debounced auto-save to URL hash
 * - Fallback to localStorage when URL limit exceeded
 * - Document title updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { compressText, decompressText, willExceedUrlLimit, MAX_URL_LENGTH } from '@/lib/compression';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  updateUrlHash,
  getUrlHash,
} from '@/lib/storage';

interface DocumentState {
  content: string;
  isLoading: boolean;
  isSaving: boolean;
  usingFallback: boolean;
  urlLength: number;
}

interface UseDocumentReturn extends DocumentState {
  setContent: (content: string) => void;
  wordCount: number;
  charCount: number;
}

const DEFAULT_CONTENT = `# Welcome to GhostPad

A minimal, powerful text editor where the **URL is your document**.

## Features

- 📝 **Markdown support** with live preview
- 🔗 **Shareable URLs** - your document lives in the link
- 💾 **Auto-save** - never lose your work
- 🌙 **Dark mode** - easy on the eyes
- ⚡ **Zero backend** - runs entirely in your browser

## How it works

Your text is compressed and stored in the URL hash. Share the link, and anyone can view your document instantly.

\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> Start typing to create your own document...
`;

const DEBOUNCE_DELAY = 500;

export const useDocument = (): UseDocumentReturn => {
  const [content, setContentState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [urlLength, setUrlLength] = useState(0);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Calculate word and character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Update document title based on content
  useEffect(() => {
    if (!content) {
      document.title = 'GhostPad';
      return;
    }

    // Extract first heading or first line
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const firstLine = content.split('\n')[0].slice(0, 50);
    const title = headingMatch ? headingMatch[1] : firstLine;
    
    document.title = title ? `${title} - GhostPad` : 'GhostPad';
  }, [content]);

  // Load content on mount
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      
      try {
        const hash = getUrlHash();
        
        if (hash) {
          // Try to load from URL hash
          const decompressed = await decompressText(hash);
          if (decompressed) {
            setContentState(decompressed);
            clearLocalStorage();
            setIsLoading(false);
            isInitializedRef.current = true;
            return;
          }
        }
        
        // Try localStorage fallback
        const saved = loadFromLocalStorage();
        if (saved) {
          setContentState(saved);
          setUsingFallback(true);
        } else {
          // Use default content for new documents
          setContentState(DEFAULT_CONTENT);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        setContentState(DEFAULT_CONTENT);
      }
      
      setIsLoading(false);
      isInitializedRef.current = true;
    };
    
    loadContent();
  }, []);

  // Debounced save function
  const saveContent = useCallback(async (text: string) => {
    if (!isInitializedRef.current) return;
    
    setIsSaving(true);
    
    try {
      const exceedsLimit = await willExceedUrlLimit(text);
      
      if (exceedsLimit) {
        // Use localStorage fallback
        saveToLocalStorage(text);
        updateUrlHash('');
        setUsingFallback(true);
        setUrlLength(0);
      } else {
        // Save to URL hash
        const compressed = await compressText(text);
        updateUrlHash(compressed);
        clearLocalStorage();
        setUsingFallback(false);
        setUrlLength(window.location.href.length);
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      // Fallback to localStorage on any error
      saveToLocalStorage(text);
      setUsingFallback(true);
    }
    
    setIsSaving(false);
  }, []);

  // Content setter with debounced save
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, DEBOUNCE_DELAY);
  }, [saveContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    content,
    setContent,
    isLoading,
    isSaving,
    usingFallback,
    urlLength,
    wordCount,
    charCount,
  };
};
