/**
 * Storage utilities for fallback persistence
 * 
 * Strategy:
 * 1. Primary: URL hash (for shareable links)
 * 2. Fallback: localStorage (when URL too long)
 * 
 * The app seamlessly switches between storage methods
 * and always preserves user content.
 */

const STORAGE_KEY = 'inkwell_document';
const STORAGE_META_KEY = 'inkwell_meta';

interface StorageMeta {
  lastSaved: number;
  usingFallback: boolean;
  charCount: number;
}

// Save to localStorage
export const saveToLocalStorage = (content: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, content);
    const meta: StorageMeta = {
      lastSaved: Date.now(),
      usingFallback: true,
      charCount: content.length,
    };
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Load from localStorage
export const loadFromLocalStorage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

// Clear localStorage
export const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

// Get storage metadata
export const getStorageMeta = (): StorageMeta | null => {
  try {
    const meta = localStorage.getItem(STORAGE_META_KEY);
    return meta ? JSON.parse(meta) : null;
  } catch {
    return null;
  }
};

// Update URL hash
export const updateUrlHash = (hash: string): void => {
  const newUrl = hash ? `${window.location.pathname}#${hash}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
};

// Get URL hash
export const getUrlHash = (): string => {
  return window.location.hash.slice(1);
};

// Copy URL to clipboard
export const copyUrlToClipboard = async (): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
};
