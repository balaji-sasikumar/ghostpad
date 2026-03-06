/**
 * KeyPrompt – modal dialog that asks for an encryption/decryption passphrase.
 *
 * Modes:
 *  "encrypt" – shown when starting a new document (no URL content).
 *  "decrypt" – shown when loading an existing encrypted document.
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface KeyPromptProps {
  mode: 'encrypt' | 'decrypt';
  onSubmit: (key: string) => Promise<void>;
  error?: string;
}

const KeyPrompt = ({ mode, onSubmit, error }: KeyPromptProps) => {
  const [key, setKey] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!key.trim()) {
      setValidationError('Passphrase cannot be empty.');
      return;
    }
    if (mode === 'encrypt' && key !== confirm) {
      setValidationError('Passphrases do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(key);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  return (
    /* Full-screen backdrop */
    <div className="key-prompt-backdrop">
      <div className="key-prompt-card">
        {/* Icon */}
        <div className="key-prompt-icon">
          <ShieldCheck className="w-7 h-7" />
        </div>

        {/* Heading */}
        <h2 className="key-prompt-title">
          {mode === 'decrypt' ? 'Enter Passphrase' : 'Set Passphrase'}
        </h2>
        <p className="key-prompt-subtitle">
          {mode === 'decrypt'
            ? 'This document is encrypted. Enter your passphrase to unlock it.'
            : 'Choose a passphrase to encrypt your document. Share it only with people you trust.'}
        </p>

        <form onSubmit={handleSubmit} className="key-prompt-form">
          {/* Passphrase field */}
          <div className="key-prompt-field">
            <label className="key-prompt-label">
              <Lock className="w-3.5 h-3.5" />
              Passphrase
            </label>
            <div className="key-prompt-input-wrap">
              <Input
                ref={inputRef}
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={mode === 'decrypt' ? 'Enter passphrase…' : 'Choose a passphrase…'}
                className="key-prompt-input"
                autoComplete="off"
              />
              <button
                type="button"
                className="key-prompt-toggle"
                onClick={() => setShowKey(!showKey)}
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm field (encrypt only) */}
          {mode === 'encrypt' && (
            <div className="key-prompt-field">
              <label className="key-prompt-label">
                <Lock className="w-3.5 h-3.5" />
                Confirm Passphrase
              </label>
              <div className="key-prompt-input-wrap">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat passphrase…"
                  className="key-prompt-input"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {displayError && (
            <p className="key-prompt-error">{displayError}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="key-prompt-submit"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            {mode === 'decrypt' ? 'Unlock Document' : 'Encrypt & Start Writing'}
          </Button>
        </form>

        {/* Footer note */}
        <p className="key-prompt-footer">
          Your passphrase never leaves your browser.
        </p>
      </div>
    </div>
  );
};

export default KeyPrompt;
