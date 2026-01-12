# GhostPad

A minimal, powerful browser-based text editor where **the URL is your document**.

## Features

- ✍️ **Markdown Editor** - Write in Markdown with live preview
- 🔗 **URL-based Storage** - Your document lives in the URL, share it instantly
- 💾 **Auto-save** - Content is debounced and saved automatically
- 🌙 **Dark/Light Mode** - Follows system preference with manual toggle
- ⚡ **Zero Backend** - Runs entirely in your browser, no server needed
- 📱 **Responsive** - Works on desktop and mobile

## How It Works

### URL Compression Strategy

1. **Compression**: Text is compressed using the browser's `CompressionStream` API (gzip)
2. **Encoding**: Compressed data is converted to URL-safe Base64
3. **Storage**: The encoded string is stored in the URL hash (`#`)

This allows documents to be shared via URL while keeping the link reasonably short.

### Fallback Storage

When content exceeds URL length limits (~2000 characters), the app automatically:
1. Stores content in `localStorage`
2. Shows a warning indicator
3. Clears the URL hash to prevent data loss

On page load, the app checks both sources and restores the most recent version.

### Browser Compatibility

- **CompressionStream API**: Chrome 80+, Edge 80+, Firefox 113+, Safari 16.4+
- **Fallback**: Older browsers use uncompressed Base64 (larger URLs but functional)

## Usage

1. Start typing in the editor (left pane)
2. See live Markdown preview (right pane)
3. Click the share button to copy the URL
4. Share the URL - anyone can view your document

### Keyboard Shortcuts

- `Tab` - Insert 2 spaces for indentation

## Limitations

- URL length is limited by browsers (~2000 chars is safe)
- Very large documents will fall back to local storage (not shareable)
- No real-time collaboration (each URL is a snapshot)

## Tech Stack

- React 18 with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- react-markdown for Markdown rendering
- CompressionStream API for gzip compression

## Future Improvements

- [ ] QR code generation for sharing
- [ ] Export to PDF/HTML
- [ ] Vim keybindings option
- [ ] Focus mode (hide toolbar)
- [ ] Multiple document tabs
- [ ] Service worker for offline support
- [ ] Syntax highlighting for code blocks

## License

MIT
