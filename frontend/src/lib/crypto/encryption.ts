export interface Point {
  date: string;
  title: string;
  description: string;
}

export interface EncryptedPoint {
  id?: number;
  encrypted_data: string;
  iv: string;
  salt: string;
  created_at?: string;
  updated_at?: string;
}

export class ClientEncryptionService {
  private algorithm = 'AES-GCM';
  private keyLength = 256; // 256 bits
  private ivLength = 12; // 96 bits for AES-GCM
  private saltLength = 32; // 256 bits
  private iterations = 100000; // PBKDF2 iterations

  /**
   * Derives an encryption key from a user password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as raw key
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Converts string to Uint8Array
   */
  private stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  /**
   * Converts Uint8Array to string
   */
  private uint8ArrayToString(array: Uint8Array): string {
    return new TextDecoder().decode(array);
  }

  /**
   * Converts Uint8Array to base64 string
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Converts base64 string to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypts a point using the user's password
   * Only the user with the correct password can decrypt this data
   */
  async encryptPoint(point: Point, password: string): Promise<EncryptedPoint> {
    const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const key = await this.deriveKey(password, salt);
    
    const jsonData = JSON.stringify(point);
    const data = this.stringToUint8Array(jsonData);
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv,
        additionalData: this.stringToUint8Array('points-data')
      },
      key,
      data
    );
    
    return {
      encrypted_data: this.uint8ArrayToBase64(new Uint8Array(encrypted)),
      iv: this.uint8ArrayToBase64(iv),
      salt: this.uint8ArrayToBase64(salt)
    };
  }

  /**
   * Decrypts a point using the user's password
   * Only works if the password is correct
   */
  async decryptPoint(encryptedPoint: EncryptedPoint, password: string): Promise<Point> {
    const salt = this.base64ToUint8Array(encryptedPoint.salt);
    const iv = this.base64ToUint8Array(encryptedPoint.iv);
    const key = await this.deriveKey(password, salt);
    
    const encryptedData = this.base64ToUint8Array(encryptedPoint.encrypted_data);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: iv,
        additionalData: this.stringToUint8Array('points-data')
      },
      key,
      encryptedData
    );
    
    const jsonString = this.uint8ArrayToString(new Uint8Array(decrypted));
    return JSON.parse(jsonString);
  }

  /**
   * Encrypts multiple points
   */
  async encryptPoints(points: Point[], password: string): Promise<EncryptedPoint[]> {
    const encryptedPoints: EncryptedPoint[] = [];
    for (const point of points) {
      encryptedPoints.push(await this.encryptPoint(point, password));
    }
    return encryptedPoints;
  }

  /**
   * Decrypts multiple points
   */
  async decryptPoints(encryptedPoints: EncryptedPoint[], password: string): Promise<Point[]> {
    const decryptedPoints: Point[] = [];
    for (const encryptedPoint of encryptedPoints) {
      decryptedPoints.push(await this.decryptPoint(encryptedPoint, password));
    }
    return decryptedPoints;
  }

  /**
   * Updates an existing encrypted point
   */
  async updateEncryptedPoint(
    encryptedPoint: EncryptedPoint, 
    updates: Partial<Point>, 
    password: string
  ): Promise<EncryptedPoint> {
    // Decrypt existing point
    const existingPoint = await this.decryptPoint(encryptedPoint, password);
    
    // Merge with updates
    const updatedPoint: Point = {
      date: updates.date ?? existingPoint.date,
      title: updates.title ?? existingPoint.title,
      description: updates.description ?? existingPoint.description
    };
    
    // Re-encrypt with new IV and salt
    return this.encryptPoint(updatedPoint, password);
  }
}