import { useState } from 'react';
import { Copy, Check, Moon, Sun, Eye, Edit3, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { copyUrlToClipboard } from '@/lib/storage';
import { MAX_URL_LENGTH } from '@/lib/compression';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  showPreview: boolean;
  onTogglePreview: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  wordCount: number;
  charCount: number;
  isSaving: boolean;
  usingFallback: boolean;
  urlLength: number;
}

const Toolbar = ({
  showPreview,
  onTogglePreview,
  isDark,
  onToggleTheme,
  wordCount,
  charCount,
  isSaving,
  usingFallback,
  urlLength,
}: ToolbarProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyUrlToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const urlPercentage = urlLength > 0 ? Math.min((urlLength / MAX_URL_LENGTH) * 100, 100) : 0;

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <h1 className="toolbar-title">Inkwell</h1>
        <div className="toolbar-stats">
          <span>{wordCount} words</span>
          <span className="toolbar-divider">•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      <div className="toolbar-right">
        {/* Storage indicator */}
        <div className="toolbar-status">
          {isSaving ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="status-icon saving">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Saving...</TooltipContent>
            </Tooltip>
          ) : usingFallback ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="status-icon warning">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Document too large for URL. Saved locally.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="status-icon saved">
                  <Save className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div>Saved to URL ({Math.round(urlPercentage)}% capacity)</div>
                  <div className="url-capacity-bar">
                    <div 
                      className="url-capacity-fill"
                      style={{ width: `${urlPercentage}%` }}
                    />
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Preview toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="toolbar"
              size="icon"
              onClick={onTogglePreview}
              className={cn(showPreview && 'active')}
            >
              {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showPreview ? 'Show editor' : 'Show preview'}
          </TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="toolbar"
              size="icon"
              onClick={onToggleTheme}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>

        {/* Share button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="toolbar"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {copied ? 'Copied!' : 'Copy share link'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};

export default Toolbar;
