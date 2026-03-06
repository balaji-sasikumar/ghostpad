/**
 * Custom hook for document state management
 *
 * Handles:
 * - Loading content from URL or localStorage
 * - Debounced auto-save to URL hash
 * - Fallback to localStorage when URL limit exceeded
 * - Document title updates
 * - AES-GCM encryption/decryption via passphrase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { compressText, decompressText, willExceedUrlLimit } from '@/lib/compression';
import { encryptContent, decryptContent, isEncryptedHash } from '@/lib/encryption';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  updateUrlHash,
  getUrlHash,
} from '@/lib/storage';

export type EncryptionStatus =
  | 'idle'           // no encrypted content, no key yet
  | 'needs_key'      // encrypted hash found, waiting for passphrase
  | 'needs_new_key'  // new doc, waiting for user to choose passphrase
  | 'unlocked';      // key accepted, content is accessible

interface DocumentState {
  content: string;
  isLoading: boolean;
  isSaving: boolean;
  usingFallback: boolean;
  urlLength: number;
  encryptionStatus: EncryptionStatus;
  decryptError: string;
}

interface UseDocumentReturn extends DocumentState {
  setContent: (content: string) => void;
  wordCount: number;
  charCount: number;
  passphrase: string;
  submitPassphrase: (key: string) => Promise<void>;
}

const DEFAULT_CONTENT = `# Welcome to GhostPad

A minimal, powerful text editor where the **URL is your document**.

## Features

- 📝 **Markdown support** with live preview
- 🔗 **Shareable URLs** - your document lives in the link
- 💾 **Auto-save** - never lose your work
- 🌙 **Dark mode** - easy on the eyes
- ⚡ **Zero backend** - runs entirely in your browser
- 🔒 **End-to-end encryption** - your data, your key

## How it works

Your text is compressed, encrypted, and stored in the URL hash. Share the link and passphrase, and anyone can view your document instantly.

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
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>('idle');
  const [decryptError, setDecryptError] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  // Pending raw hash when we need a passphrase to decrypt it
  const pendingHashRef = useRef<string>('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Update document title
  useEffect(() => {
    if (!content) { document.title = 'GhostPad'; return; }
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
          if (isEncryptedHash(hash)) {
            // Encrypted content found – ask user for passphrase
            pendingHashRef.current = hash;
            setEncryptionStatus('needs_key');
            setIsLoading(false);
            return;
          }

          // Unencrypted (legacy / plain compressed) content
          const decompressed = await decompressText(hash);
          if (decompressed) {
            setContentState(decompressed);
            clearLocalStorage();
            setEncryptionStatus('unlocked');
            setIsLoading(false);
            isInitializedRef.current = true;
            return;
          }
        }

        // No URL hash – try localStorage
        const saved = loadFromLocalStorage();
        if (saved) {
          setContentState(saved);
          setUsingFallback(true);
        } else {
          setContentState(DEFAULT_CONTENT);
        }

        // New or local document: ask user to set a passphrase
        setEncryptionStatus('needs_new_key');
      } catch (error) {
        console.error('Failed to load content:', error);
        setContentState(DEFAULT_CONTENT);
        setEncryptionStatus('needs_new_key');
      }
      setIsLoading(false);
      // Do NOT set isInitializedRef here – wait for passphrase
    };

    loadContent();
  }, []);

  /**
   * Called when the user submits a passphrase (either to decrypt or to set one).
   */
  const submitPassphrase = useCallback(async (key: string) => {
    setDecryptError('');

    if (encryptionStatus === 'needs_key') {
      // Decrypt existing content
      try {
        const decrypted = await decryptContent(pendingHashRef.current, key);
        setContentState(decrypted);
        setPassphrase(key);
        setEncryptionStatus('unlocked');
        clearLocalStorage();
        isInitializedRef.current = true;
      } catch {
        setDecryptError('Wrong passphrase. Please try again.');
        throw new Error('Wrong passphrase');
      }
    } else if (encryptionStatus === 'needs_new_key') {
      // Accept new passphrase and immediately encrypt + save current content
      setPassphrase(key);
      setEncryptionStatus('unlocked');
      isInitializedRef.current = true;

      // Trigger an immediate save with the new key
      const currentContent = content || DEFAULT_CONTENT;
      try {
        const encrypted = await encryptContent(currentContent, key);
        updateUrlHash(encrypted);
        setUrlLength(window.location.href.length);
        clearLocalStorage();
        setUsingFallback(false);
      } catch (err) {
        console.error('Failed to encrypt on key set:', err);
        saveToLocalStorage(currentContent);
        setUsingFallback(true);
      }
    }
  }, [encryptionStatus, content]);

  // Debounced save with encryption
  const saveContent = useCallback(async (text: string, key: string) => {
    if (!isInitializedRef.current || !key) return;

    setIsSaving(true);
    try {
      // Encrypt content
      const encrypted = await encryptContent(text, key);

      // Check URL length
      const exceedsLimit = await willExceedUrlLimit(encrypted);
      if (exceedsLimit) {
        saveToLocalStorage(text);
        updateUrlHash('');
        setUsingFallback(true);
        setUrlLength(0);
      } else {
        updateUrlHash(encrypted);
        clearLocalStorage();
        setUsingFallback(false);
        setUrlLength(window.location.href.length);
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      saveToLocalStorage(text);
      setUsingFallback(true);
    }
    setIsSaving(false);
  }, []);

  // Content setter with debounced save
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent, passphrase);
    }, DEBOUNCE_DELAY);
  }, [saveContent, passphrase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return {
    content,
    setContent,
    isLoading,
    isSaving,
    usingFallback,
    urlLength,
    encryptionStatus,
    decryptError,
    passphrase,
    submitPassphrase,
    wordCount,
    charCount,
  };
};
