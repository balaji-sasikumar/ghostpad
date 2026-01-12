/**
 * Compression utilities for URL-based document persistence
 * 
 * Strategy:
 * 1. Compress text using CompressionStream API (gzip)
 * 2. Convert to URL-safe Base64
 * 3. Store in URL hash for instant sharing
 * 
 * Fallback: If CompressionStream unavailable, use raw Base64
 */

// Check if CompressionStream API is available
export const isCompressionSupported = (): boolean => {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
};

// Convert ArrayBuffer to Base64 URL-safe string
const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Standard Base64 to URL-safe Base64
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Convert URL-safe Base64 to ArrayBuffer
const base64UrlToArrayBuffer = (base64Url: string): ArrayBuffer => {
  // URL-safe Base64 to standard Base64
  let base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Compress text using CompressionStream API
export const compressText = async (text: string): Promise<string> => {
  if (!text) return '';
  
  if (!isCompressionSupported()) {
    // Fallback: just encode as Base64
    return 'r:' + arrayBufferToBase64Url(new TextEncoder().encode(text).buffer);
  }
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const compressedData = await new Response(cs.readable).arrayBuffer();
    return 'c:' + arrayBufferToBase64Url(compressedData);
  } catch (error) {
    console.error('Compression failed, using raw encoding:', error);
    return 'r:' + arrayBufferToBase64Url(new TextEncoder().encode(text).buffer);
  }
};

// Decompress text from compressed Base64
export const decompressText = async (encoded: string): Promise<string> => {
  if (!encoded) return '';
  
  try {
    const isCompressed = encoded.startsWith('c:');
    const isRaw = encoded.startsWith('r:');
    const data = encoded.slice(2);
    
    if (!isCompressed && !isRaw) {
      // Legacy format without prefix - try to decompress
      const buffer = base64UrlToArrayBuffer(encoded);
      if (isCompressionSupported()) {
        try {
          const ds = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          writer.write(new Uint8Array(buffer));
          writer.close();
          const decompressedData = await new Response(ds.readable).arrayBuffer();
          return new TextDecoder().decode(decompressedData);
        } catch {
          return new TextDecoder().decode(buffer);
        }
      }
      return new TextDecoder().decode(buffer);
    }
    
    const buffer = base64UrlToArrayBuffer(data);
    
    if (isRaw) {
      return new TextDecoder().decode(buffer);
    }
    
    if (!isCompressionSupported()) {
      throw new Error('Decompression not supported');
    }
    
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(buffer));
    writer.close();
    
    const decompressedData = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(decompressedData);
  } catch (error) {
    console.error('Decompression failed:', error);
    return '';
  }
};

// Maximum safe URL length (conservative estimate)
export const MAX_URL_LENGTH = 2000;

// Check if content will exceed URL length limit
export const willExceedUrlLimit = async (text: string): Promise<boolean> => {
  const compressed = await compressText(text);
  const baseUrl = window.location.origin + window.location.pathname;
  return (baseUrl + '#' + compressed).length > MAX_URL_LENGTH;
};
