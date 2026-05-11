// app/lib/encryption.ts
import crypto from 'crypto';

// Generate a secure key (run once and add to .env)
// node -e "console.log(crypto.randomBytes(32).toString('hex'))"

const ALGORITHM = 'aes-256-gcm';

/**
 * Lazily read and validate the encryption key. This is *not* run at module
 * load time so that simply importing this module (which happens in many API
 * route modules) does not throw during Next.js' "Collecting page data" build
 * step on Vercel — where env vars may not be present yet. The key is only
 * required when encrypt/decrypt is actually called at request time.
 */
function getEncryptionKey(): string {
  const key = process.env.ANTI_PHISHING_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ANTI_PHISHING_ENCRYPTION_KEY environment variable is required');
  }
  if (key.length !== 64) {
    throw new Error('ANTI_PHISHING_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return key;
}

export function encrypt(text: string): string {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(encryptionKey, 'hex');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const encryptionKey = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const key = Buffer.from(encryptionKey, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Test the encryption (optional)
export function testEncryption(): boolean {
  try {
    const testText = 'test-anti-phishing-code';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    return testText === decrypted;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}
