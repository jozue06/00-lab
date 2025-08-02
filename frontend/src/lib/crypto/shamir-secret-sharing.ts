export interface RecoveryShare {
  id: string;
  share: string;
  question: string;
  answer: string;
  threshold: number;
}

export interface RecoverySetup {
  shares: RecoveryShare[];
  threshold: number;
}

export class ShamirSecretSharing {
  private readonly fieldSize = 2n ** 127n - 1n; // Large prime field
  private readonly maxShares = 10;

  /**
   * Generates recovery shares using Shamir's Secret Sharing
   * @param secret The secret to share (password-derived key)
   * @param numShares Number of shares to generate
   * @param threshold Minimum shares needed to reconstruct
   */
  async generateShares(
    secret: Uint8Array,
    numShares: number,
    threshold: number
  ): Promise<Uint8Array[]> {
    if (threshold > numShares) {
      throw new Error('Threshold cannot be greater than number of shares');
    }
    if (numShares > this.maxShares) {
      throw new Error(`Maximum ${this.maxShares} shares allowed`);
    }

    // Convert secret to field element
    const secretField = this.bytesToFieldElement(secret);
    
    // Generate random coefficients for polynomial
    const coefficients = [secretField];
    for (let i = 1; i < threshold; i++) {
      coefficients.push(this.randomFieldElement());
    }

    // Generate shares by evaluating polynomial at different points
    const shares: Uint8Array[] = [];
    for (let i = 1; i <= numShares; i++) {
      const x = BigInt(i);
      const y = this.evaluatePolynomial(coefficients, x);
      shares.push(this.fieldElementToBytes(y));
    }

    return shares;
  }

  /**
   * Reconstructs the secret from shares using Lagrange interpolation
   * @param shares Array of shares (at least threshold number)
   * @param threshold Minimum shares needed
   */
  async reconstructSecret(
    shares: Uint8Array[],
    threshold: number
  ): Promise<Uint8Array> {
    if (shares.length < threshold) {
      throw new Error(`Need at least ${threshold} shares to reconstruct`);
    }

    // Use first 'threshold' shares
    const selectedShares = shares.slice(0, threshold);
    
    // Convert shares to field elements
    const points: [bigint, bigint][] = selectedShares.map((share, index) => [
      BigInt(index + 1), // x coordinate
      this.bytesToFieldElement(share) // y coordinate
    ]);

    // Use Lagrange interpolation to reconstruct the secret
    const secretField = this.lagrangeInterpolate(points);
    return this.fieldElementToBytes(secretField);
  }

  /**
   * Evaluates polynomial at given point
   */
  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = 0n;
    let power = 1n;
    
    for (const coefficient of coefficients) {
      result = this.fieldAdd(result, this.fieldMultiply(coefficient, power));
      power = this.fieldMultiply(power, x);
    }
    
    return result;
  }

  /**
   * Performs Lagrange interpolation
   */
  private lagrangeInterpolate(points: [bigint, bigint][]): bigint {
    let result = 0n;
    
    for (let i = 0; i < points.length; i++) {
      const [xi, yi] = points[i];
      let numerator = 1n;
      let denominator = 1n;
      
      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          const [xj] = points[j];
          numerator = this.fieldMultiply(numerator, xj);
          denominator = this.fieldMultiply(denominator, this.fieldSubtract(xj, xi));
        }
      }
      
      const term = this.fieldMultiply(yi, this.fieldDivide(numerator, denominator));
      result = this.fieldAdd(result, term);
    }
    
    return result;
  }

  /**
   * Field arithmetic operations
   */
  private fieldAdd(a: bigint, b: bigint): bigint {
    return (a + b) % this.fieldSize;
  }

  private fieldSubtract(a: bigint, b: bigint): bigint {
    return (a - b + this.fieldSize) % this.fieldSize;
  }

  private fieldMultiply(a: bigint, b: bigint): bigint {
    return (a * b) % this.fieldSize;
  }

  private fieldDivide(a: bigint, b: bigint): bigint {
    return this.fieldMultiply(a, this.modularInverse(b));
  }

  /**
   * Computes modular multiplicative inverse
   */
  private modularInverse(a: bigint): bigint {
    let t = 0n;
    let newT = 1n;
    let r = this.fieldSize;
    let newR = a;

    while (newR !== 0n) {
      const quotient = r / newR;
      [t, newT] = [newT, t - quotient * newT];
      [r, newR] = [newR, r - quotient * newR];
    }

    if (r > 1n) {
      throw new Error('Modular inverse does not exist');
    }

    return t < 0n ? t + this.fieldSize : t;
  }

  /**
   * Generates random field element
   */
  private randomFieldElement(): bigint {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    let value = 0n;
    
    for (let i = 0; i < randomBytes.length; i++) {
      value = (value << 8n) + BigInt(randomBytes[i]);
    }
    
    return value % this.fieldSize;
  }

  /**
   * Converts bytes to field element
   */
  private bytesToFieldElement(bytes: Uint8Array): bigint {
    let value = 0n;
    
    for (let i = 0; i < Math.min(bytes.length, 16); i++) {
      value = (value << 8n) + BigInt(bytes[i]);
    }
    
    return value % this.fieldSize;
  }

  /**
   * Converts field element to bytes
   */
  private fieldElementToBytes(element: bigint): Uint8Array {
    const bytes = new Uint8Array(16);
    
    for (let i = 15; i >= 0; i--) {
      bytes[i] = Number(element & 0xffn);
      element = element >> 8n;
    }
    
    return bytes;
  }
}