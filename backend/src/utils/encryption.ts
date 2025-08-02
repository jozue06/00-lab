import crypto from 'crypto';

interface Point {
  date: string;
  title: string;
  description: string;
}

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits

  constructor(private secretKey: string) {
    // Ensure the key is exactly 32 bytes (256 bits)
    if (Buffer.from(secretKey, 'hex').length !== this.keyLength) {
      throw new Error('Secret key must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypts a Point object and returns the encrypted data as a base64 string
   */
  encryptPoint(point: Point): string {
    const jsonData = JSON.stringify(point);
    const iv = crypto.randomBytes(this.ivLength);
    const key = Buffer.from(this.secretKey, 'hex');
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('points-data', 'utf8')); // Additional authenticated data
    
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);
    return combined.toString('base64');
  }

  /**
   * Decrypts an encrypted point string and returns the Point object
   */
  decryptPoint(encryptedData: string): Point {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, this.ivLength);
    const tag = combined.subarray(combined.length - this.tagLength);
    const encrypted = combined.subarray(this.ivLength, combined.length - this.tagLength);
    
    const key = Buffer.from(this.secretKey, 'hex');
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('points-data', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Encrypts an array of points
   */
  encryptPoints(points: Point[]): string {
    return this.encryptPoint({ points } as any);
  }

  /**
   * Decrypts an array of points
   */
  decryptPoints(encryptedData: string): Point[] {
    const decrypted = this.decryptPoint(encryptedData);
    return (decrypted as any).points || [];
  }
}