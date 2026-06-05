// ============================================
// Encryption Utilities for LocalStorage
// ============================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Generate a new encryption key
 * Use this to create a new key for the user
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to a raw byte array
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Import a raw byte array as a CryptoKey
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  key: CryptoKey,
  data: string
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encoded
  );
  
  return { encrypted, iv };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt data for storage in localStorage
 * Returns a string that can be safely stored
 */
export async function encryptForStorage(
  key: CryptoKey,
  data: string
): Promise<string> {
  const { encrypted, iv } = await encrypt(key, data);
  
  // Combine IV and encrypted data, then convert to base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data from localStorage
 */
export async function decryptFromStorage(
  key: CryptoKey,
  encryptedData: string
): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);
  
  return await decrypt(key, encrypted.buffer, iv);
}

// ============================================
// Master Key Management
// ============================================

const MASTER_KEY_STORAGE_KEY = 'lamma_master_key';

/**
 * Get or create the master encryption key for this device
 * This key is used to encrypt/decrypt sensitive data in localStorage
 */
export async function getOrCreateMasterKey(): Promise<CryptoKey> {
  // Try to get existing key from storage
  const storedKey = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
  
  if (storedKey) {
    try {
      const keyData = base64ToArrayBuffer(storedKey);
      return await importKey(new Uint8Array(keyData));
    } catch {
      // If decryption fails, generate a new key
    }
  }
  
  // Generate new key
  const newKey = await generateEncryptionKey();
  const exportedKey = await exportKey(newKey);
  localStorage.setItem(MASTER_KEY_STORAGE_KEY, arrayBufferToBase64(exportedKey.buffer));
  
  return newKey;
}

/**
 * Clear the master key (e.g., on logout)
 */
export function clearMasterKey(): void {
  localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
}

// ============================================
// Secure Storage Helpers
// ============================================

/**
 * Store data securely in localStorage with encryption
 */
export async function secureSet(key: string, value: string): Promise<void> {
  const masterKey = await getOrCreateMasterKey();
  const encrypted = await encryptForStorage(masterKey, value);
  localStorage.setItem(key, encrypted);
}

/**
 * Retrieve and decrypt data from localStorage
 */
export async function secureGet(key: string): Promise<string | null> {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  
  try {
    const masterKey = await getOrCreateMasterKey();
    return await decryptFromStorage(masterKey, encrypted);
  } catch {
    return null;
  }
}

/**
 * Remove encrypted data from localStorage
 */
export function secureRemove(key: string): void {
  localStorage.removeItem(key);
}

// ============================================
// Rate Limiting
// ============================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if an action should be rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  // Clean up old entries
  if (entry && now - entry.windowStart > windowMs) {
    rateLimitMap.delete(key);
  }
  
  const current = rateLimitMap.get(key);
  
  if (!current) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  
  if (current.count >= maxRequests) {
    const retryAfter = Math.ceil((current.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  current.count++;
  return { allowed: true };
}

/**
 * Clear rate limit for a specific key
 */
export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

// ============================================
// Input Validation
// ============================================

/**
 * Validate a username
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }
  
  // Allow letters, numbers, underscores, hyphens, and Arabic characters
  if (!/^[a-zA-Z0-9_\-\u0621-\u064A\s]+$/.test(trimmed)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  
  if (containsXSS(trimmed)) {
    return { valid: false, error: 'Username contains invalid content' };
  }
  
  return { valid: true };
}

/**
 * Validate a message
 */
export function validateMessage(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  const trimmed = content.trim();
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Message is too long (max 2000 characters)' };
  }
  
  if (containsXSS(trimmed)) {
    return { valid: false, error: 'Message contains invalid content' };
  }
  
  return { valid: true };
}

/**
 * Validate a room name
 */
export function validateRoomName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Room name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Room name must be at least 2 characters' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Room name must be less than 50 characters' };
  }
  
  if (containsXSS(trimmed)) {
    return { valid: false, error: 'Room name contains invalid content' };
  }
  
  return { valid: true };
}

// ============================================
// Export all security utilities
// ============================================

export default {
  sanitizeHTML,
  sanitizeURL,
  sanitizeFileName,
  containsXSS,
  generateSecureId,
  hashString,
  checkRateLimit,
  validateUsername,
  validateMessage,
  validateRoomName,
  validateInput,
  SECURITY_CONSTANTS,
  secureSet,
  secureGet,
  secureRemove,
  getOrCreateMasterKey,
  clearMasterKey,
};
