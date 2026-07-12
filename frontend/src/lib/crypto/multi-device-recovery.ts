export interface MultiDeviceRecoverySetup {
  primaryDeviceId: string;
  backupCodes: string[];
  trustedDevices: TrustedDevice[];
  recoveryQuestions: RecoveryQuestion[];
}

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  publicKey: string;
  lastSeen: Date;
}

export interface RecoveryQuestion {
  id: string;
  question: string;
  answerHash: string;
}

export class MultiDeviceRecoveryService {
  /**
   * Sets up multi-device recovery with backup codes and trusted devices
   */
  async setupMultiDeviceRecovery(
    password: string,
    deviceName: string,
    questions: string[],
    answers: string[]
  ): Promise<MultiDeviceRecoverySetup> {
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Generate device key pair
    const deviceKeyPair = await this.generateDeviceKeyPair();
    
    // Create recovery questions
    const recoveryQuestions: RecoveryQuestion[] = questions.map((question, index) => ({
      id: `question_${index}`,
      question,
      answerHash: await this.hashAnswer(answers[index])
    }));
    
    // Encrypt password with device key
    const encryptedPassword = await this.encryptPasswordWithDeviceKey(password, deviceKeyPair.publicKey);
    
    // Store encrypted password locally
    await this.storeEncryptedPassword(encryptedPassword);
    
    return {
      primaryDeviceId: deviceKeyPair.deviceId,
      backupCodes,
      trustedDevices: [{
        deviceId: deviceKeyPair.deviceId,
        deviceName,
        publicKey: deviceKeyPair.publicKeyString,
        lastSeen: new Date()
      }],
      recoveryQuestions
    };
  }

  /**
   * Recovers password using backup codes or trusted devices
   */
  async recoverPassword(
    method: 'backup-code' | 'trusted-device' | 'questions',
    data: any
  ): Promise<string> {
    switch (method) {
      case 'backup-code':
        return this.recoverWithBackupCode(data.backupCode);
      
      case 'trusted-device':
        return this.recoverWithTrustedDevice(data.deviceId, data.deviceKey);
      
      case 'questions':
        return this.recoverWithQuestions(data.questions, data.answers);
      
      default:
        throw new Error('Invalid recovery method');
    }
  }

  /**
   * Adds a trusted device for recovery
   */
  async addTrustedDevice(
    deviceName: string,
    devicePublicKey: string
  ): Promise<TrustedDevice> {
    const deviceId = await this.generateDeviceId();
    
    const trustedDevice: TrustedDevice = {
      deviceId,
      deviceName,
      publicKey: devicePublicKey,
      lastSeen: new Date()
    };
    
    // Store trusted device info
    await this.storeTrustedDevice(trustedDevice);
    
    return trustedDevice;
  }

  /**
   * Generates backup codes for recovery
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      // Generate 8-character alphanumeric codes
      const code = Array.from(
        crypto.getRandomValues(new Uint8Array(6))
      ).map(byte => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[byte % 36]
      ).join('');
      
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Generates a device key pair
   */
  private async generateDeviceKeyPair(): Promise<{
    deviceId: string;
    publicKey: CryptoKey;
    publicKeyString: string;
    privateKey: CryptoKey;
  }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    const deviceId = await this.generateDeviceId();
    const publicKeyString = await this.exportPublicKey(keyPair.publicKey);
    
    return {
      deviceId,
      publicKey: keyPair.publicKey,
      publicKeyString,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Recovers password using backup code
   */
  private async recoverWithBackupCode(backupCode: string): Promise<string> {
    // Verify backup code
    const storedCodes = await this.getStoredBackupCodes();
    if (!storedCodes.includes(backupCode)) {
      throw new Error('Invalid backup code');
    }
    
    // Get encrypted password
    const encryptedPassword = await this.getStoredEncryptedPassword();
    
    // Decrypt using backup code as key
    return this.decryptWithBackupCode(encryptedPassword, backupCode);
  }

  /**
   * Recovers password using trusted device
   */
  private async recoverWithTrustedDevice(
    deviceId: string, 
    deviceKey: CryptoKey
  ): Promise<string> {
    // Verify device is trusted
    const trustedDevices = await this.getTrustedDevices();
    const trustedDevice = trustedDevices.find(d => d.deviceId === deviceId);
    
    if (!trustedDevice) {
      throw new Error('Device not trusted for recovery');
    }
    
    // Get encrypted password
    const encryptedPassword = await this.getStoredEncryptedPassword();
    
    // Decrypt using device key
    return this.decryptWithDeviceKey(encryptedPassword, deviceKey);
  }

  /**
   * Recovers password using security questions
   */
  private async recoverWithQuestions(
    questions: RecoveryQuestion[],
    answers: string[]
  ): Promise<string> {
    // Verify answers
    for (let i = 0; i < questions.length; i++) {
      const answerHash = await this.hashAnswer(answers[i]);
      if (answerHash !== questions[i].answerHash) {
        throw new Error(`Incorrect answer for question: ${questions[i].question}`);
      }
    }
    
    // Get encrypted password
    const encryptedPassword = await this.getStoredEncryptedPassword();
    
    // Decrypt using questions-derived key
    return this.decryptWithQuestions(encryptedPassword, answers);
  }

  /**
   * Encrypts password with device key
   */
  private async encryptPasswordWithDeviceKey(
    password: string, 
    publicKey: CryptoKey
  ): Promise<string> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      passwordData
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  /**
   * Decrypts password with backup code
   */
  private async decryptWithBackupCode(
    encryptedPassword: string, 
    backupCode: string
  ): Promise<string> {
    // Derive key from backup code
    const key = await this.deriveKeyFromBackupCode(backupCode);
    
    const encryptedData = new Uint8Array(
      atob(encryptedPassword).split('').map(c => c.charCodeAt(0))
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      key,
      encryptedData
    );
    
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Derives key from backup code
   */
  private async deriveKeyFromBackupCode(backupCode: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const codeData = encoder.encode(backupCode);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      codeData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('backup-code-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates device ID
   */
  private async generateDeviceId(): Promise<string> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Exports public key as string
   */
  private async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Hashes answer
   */
  private async hashAnswer(answer: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(answer);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Storage methods (simplified for demo)
  private async storeEncryptedPassword(encryptedPassword: string): Promise<void> {
    localStorage.setItem('encryptedPassword', encryptedPassword);
  }

  private async getStoredEncryptedPassword(): Promise<string> {
    const stored = localStorage.getItem('encryptedPassword');
    if (!stored) throw new Error('No encrypted password found');
    return stored;
  }

  private async storeBackupCodes(codes: string[]): Promise<void> {
    localStorage.setItem('backupCodes', JSON.stringify(codes));
  }

  private async getStoredBackupCodes(): Promise<string[]> {
    const stored = localStorage.getItem('backupCodes');
    return stored ? JSON.parse(stored) : [];
  }

  private async storeTrustedDevice(device: TrustedDevice): Promise<void> {
    const devices = await this.getTrustedDevices();
    devices.push(device);
    localStorage.setItem('trustedDevices', JSON.stringify(devices));
  }

  private async getTrustedDevices(): Promise<TrustedDevice[]> {
    const stored = localStorage.getItem('trustedDevices');
    return stored ? JSON.parse(stored) : [];
  }

  // Placeholder methods for demo
  private async decryptWithDeviceKey(encryptedPassword: string, deviceKey: CryptoKey): Promise<string> {
    throw new Error('Device key decryption not implemented in demo');
  }

  private async decryptWithQuestions(encryptedPassword: string, answers: string[]): Promise<string> {
    throw new Error('Questions decryption not implemented in demo');
  }
}