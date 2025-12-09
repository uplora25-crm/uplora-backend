/**
 * Encryption/Decryption Utility
 * 
 * Uses AES-256-GCM encryption for secure password storage.
 * The encryption key should be stored in environment variables.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for GCM tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * If not set, generates a key (for development only - should be set in production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // For development: use a default key (NOT SECURE FOR PRODUCTION)
    console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. Using default key. This is NOT secure for production!');
    // Generate a consistent key from a default string (for development only)
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }
  
  // If key is provided as hex string, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, derive key from the provided string
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypts a password using AES-256-GCM
 * 
 * @param password - The plain text password to encrypt
 * @returns Encrypted password as a hex string (format: iv:salt:tag:encrypted)
 */
export function encryptPassword(password: string): string {
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine iv, salt, tag, and encrypted data
  // Format: iv:salt:tag:encrypted (all in hex)
  return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a password using AES-256-GCM
 * 
 * @param encryptedPassword - The encrypted password (format: iv:salt:tag:encrypted)
 * @returns Decrypted plain text password
 */
export function decryptPassword(encryptedPassword: string): string {
  if (!encryptedPassword) {
    throw new Error('Encrypted password cannot be empty');
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedPassword.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted password format');
    }
    
    const [ivHex, saltHex, tagHex, encrypted] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    throw new Error(`Failed to decrypt password: ${error.message}`);
  }
}

