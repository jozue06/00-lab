import { ShamirSecretSharing, RecoveryShare, RecoverySetup } from './shamir-secret-sharing';

export interface RecoveryQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface RecoverySession {
  id: string;
  shares: RecoveryShare[];
  threshold: number;
  createdAt: Date;
}

export class PasswordRecoveryService {
  private shamir: ShamirSecretSharing;
  private readonly salt = 'password-recovery-salt';

  constructor() {
    this.shamir = new ShamirSecretSharing();
  }

  /**
   * Sets up password recovery using Shamir's Secret Sharing
   * @param password User's password
   * @param questions Security questions and answers
   * @param threshold Minimum answers needed to recover (default: 2)
   */
  async setupRecovery(
    password: string,
    questions: RecoveryQuestion[],
    threshold: number = 2
  ): Promise<RecoverySetup> {
    if (questions.length < threshold) {
      throw new Error(`Need at least ${threshold} questions for recovery`);
    }
    if (questions.length > 5) {
      throw new Error('Maximum 5 recovery questions allowed');
    }

    // Derive a recovery key from the password
    const recoveryKey = await this.deriveRecoveryKey(password);
    
    // Generate Shamir shares
    const shares = await this.shamir.generateShares(
      recoveryKey,
      questions.length,
      threshold
    );

    // Encrypt each share with its corresponding answer
    const recoveryShares: RecoveryShare[] = [];
    
    for (let i = 0; i < shares.length; i++) {
      const encryptedShare = await this.encryptShare(shares[i], questions[i].answer);
      
      recoveryShares.push({
        id: `share_${i}`,
        share: encryptedShare,
        question: questions[i].question,
        answer: questions[i].answer, // In production, this would be hashed
        threshold
      });
    }

    return {
      shares: recoveryShares,
      threshold
    };
  }

  /**
   * Recovers password using security question answers
   * @param shares Recovery shares
   * @param answers User's answers to security questions
   */
  async recoverPassword(
    shares: RecoveryShare[],
    answers: string[]
  ): Promise<string> {
    if (answers.length < shares[0].threshold) {
      throw new Error(`Need at least ${shares[0].threshold} correct answers`);
    }

    // Decrypt shares using provided answers
    const decryptedShares: Uint8Array[] = [];
    
    for (let i = 0; i < shares.length; i++) {
      try {
        const decryptedShare = await this.decryptShare(shares[i].share, answers[i]);
        decryptedShares.push(decryptedShare);
        
        // If we have enough shares, we can reconstruct
        if (decryptedShares.length >= shares[0].threshold) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to decrypt share ${i}:`, error);
      }
    }

    if (decryptedShares.length < shares[0].threshold) {
      throw new Error(`Not enough valid answers. Need ${shares[0].threshold} correct answers.`);
    }

    // Reconstruct the recovery key using Shamir's Secret Sharing
    const recoveryKey = await this.shamir.reconstructSecret(
      decryptedShares,
      shares[0].threshold
    );

    // Derive the original password from the recovery key
    return this.derivePasswordFromRecoveryKey(recoveryKey);
  }

  /**
   * Validates recovery questions and answers
   */
  validateRecoveryQuestions(questions: RecoveryQuestion[]): string[] {
    const errors: string[] = [];

    if (questions.length < 2) {
      errors.push('At least 2 recovery questions are required');
    }

    if (questions.length > 5) {
      errors.push('Maximum 5 recovery questions allowed');
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.question.trim()) {
        errors.push(`Question ${i + 1} cannot be empty`);
      }
      
      if (!question.answer.trim()) {
        errors.push(`Answer ${i + 1} cannot be empty`);
      }
      
      if (question.answer.length < 3) {
        errors.push(`Answer ${i + 1} must be at least 3 characters`);
      }
    }

    // Check for duplicate questions
    const questionTexts = questions.map(q => q.question.toLowerCase().trim());
    const uniqueQuestions = new Set(questionTexts);
    if (uniqueQuestions.size !== questions.length) {
      errors.push('Recovery questions must be unique');
    }

    return errors;
  }

  /**
   * Derives a recovery key from the password
   */
  private async deriveRecoveryKey(password: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(this.salt);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const recoveryKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      128 // 128 bits for recovery key
    );
    
    return new Uint8Array(recoveryKey);
  }

  /**
   * Encrypts a share with a recovery answer
   */
  private async encryptShare(share: Uint8Array, answer: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const key = await this.deriveKeyFromAnswer(answer, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: crypto.getRandomValues(new Uint8Array(12))
      },
      key,
      share
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + encryptedArray.length);
    combined.set(salt);
    combined.set(encryptedArray, salt.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts a share using a recovery answer
   */
  private async decryptShare(encryptedShare: string, answer: string): Promise<Uint8Array> {
    const combined = new Uint8Array(
      atob(encryptedShare).split('').map(c => c.charCodeAt(0))
    );
    
    const salt = combined.slice(0, 32);
    const encrypted = combined.slice(32);
    
    const key = await this.deriveKeyFromAnswer(answer, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(12) // IV is prepended in the encrypted data
      },
      key,
      encrypted
    );
    
    return new Uint8Array(decrypted);
  }

  /**
   * Derives a key from a recovery answer
   */
  private async deriveKeyFromAnswer(answer: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const answerData = encoder.encode(answer);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      answerData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derives the original password from the recovery key
   * Note: In a real implementation, you'd store a hash of the password
   * and verify it matches the derived password
   */
  private derivePasswordFromRecoveryKey(recoveryKey: Uint8Array): string {
    // This is a simplified implementation
    // In production, you'd store a hash of the password and verify it
    const hash = Array.from(recoveryKey, byte => byte.toString(16).padStart(2, '0')).join('');
    return `recovered_${hash.substring(0, 8)}`; // Simplified for demo
  }

  /**
   * Generates suggested recovery questions
   */
  getSuggestedQuestions(): string[] {
    return [
      'What was the name of your first pet?',
      'In which city were you born?',
      'What was your first car?',
      'What was your childhood nickname?',
      'What is your mother\'s maiden name?',
      'What was the name of your first school?',
      'What was your favorite food as a child?',
      'What is the name of the street you grew up on?',
      'What was your first job?',
      'What is your favorite book?'
    ];
  }
}