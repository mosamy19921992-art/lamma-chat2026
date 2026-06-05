// ============================================
// Security Utilities for Lamma Chat
// ============================================

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all dangerous HTML tags and attributes
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  });
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  // Remove javascript: protocol
  const sanitized = url.replace(/^(javascript|data|vbscript):/gi, '');
  
  // Only allow http, https, and relative URLs
  if (!sanitized.match(/^(https?:\/\/|\/|#)/i) && sanitized !== '') {
    return '';
  }
  
  return sanitized;
}

/**
 * Validate and sanitize file name for uploads
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file';
  
  // Remove any directory traversal attempts
  let sanitized = fileName.replace(/[\\/:*?"<>|]/g, '_');
  
  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^[.]+/, '');
  
  // Limit length
  if (sanitized.length > 80) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      sanitized = sanitized.substring(0, 80 - (sanitized.length - ext)) + sanitized.substring(ext);
    } else {
      sanitized = sanitized.substring(0, 80);
    }
  }
  
  // Ensure it's not empty
  if (!sanitized || sanitized === '_') {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}

/**
 * Check if string contains potential XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (!input) return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,  // onclick, onerror, etc.
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /data:text\/html/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureId(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string using SHA-256 (for data integrity, not passwords)
 */
export async function hashString(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback - not cryptographically secure
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// Security Constants
// ============================================

export const SECURITY_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_USERNAME_LENGTH: 50,
  MAX_ROOM_NAME_LENGTH: 100,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  RATE_LIMIT_MESSAGES: 10, // messages per minute
  RATE_LIMIT_WINDOW: 60, // seconds
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============================================
// Validation Functions
// ============================================

export function validateMessage(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > SECURITY_CONSTANTS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${SECURITY_CONSTANTS.MAX_MESSAGE_LENGTH} characters)` };
  }
  
  if (containsXSS(content)) {
    return { valid: false, error: 'Message contains invalid content' };
  }
  
  return { valid: true };
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }
  
  if (username.length > SECURITY_CONSTANTS.MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username too long (max ${SECURITY_CONSTANTS.MAX_USERNAME_LENGTH} characters)` };
  }
  
  // Only allow letters, numbers, underscores, and hyphens
  if (!/^[a-zA-Z0-9_\-\u0621-\u064A]+$/.test(username)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  
  return { valid: true };
}

export default {
  sanitizeHTML,
  sanitizeURL,
  sanitizeFileName,
  containsXSS,
  generateSecureId,
  hashString,
  validateMessage,
  validateUsername,
  SECURITY_CONSTANTS,
};
