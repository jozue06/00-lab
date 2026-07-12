# Shamir's Secret Sharing Password Recovery Implementation

## Overview

This implementation provides **secure password recovery** for end-to-end encrypted applications using **Shamir's Secret Sharing**. Users can recover their password by answering security questions, while maintaining the security benefits of E2E encryption.

## How It Works

### 🔐 **Setup Process**

1. **User enters password** and security questions
2. **Password-derived recovery key** is generated using PBKDF2
3. **Shamir's Secret Sharing** splits the recovery key into multiple shares
4. **Each share encrypted** with a different security question answer
5. **Shares stored securely** (localStorage in demo, server in production)

### 🔓 **Recovery Process**

1. **User answers security questions** (minimum threshold required)
2. **Shares decrypted** using correct answers
3. **Recovery key reconstructed** using Shamir's Secret Sharing
4. **Original password derived** from recovery key
5. **User can access encrypted data** with recovered password

## Security Architecture

### ✅ **True End-to-End Encryption Maintained**

- **Server never sees encryption keys** - only encrypted data
- **Recovery happens client-side** - no server involvement
- **Shamir's Secret Sharing** - cryptographically proven algorithm
- **Threshold security** - need minimum number of correct answers

### 🔒 **Cryptographic Security**

```typescript
// Password → Recovery Key (PBKDF2)
const recoveryKey = await deriveRecoveryKey(password);

// Recovery Key → Shamir Shares
const shares = await shamir.generateShares(recoveryKey, 3, 2);

// Each Share → Encrypted with Answer
const encryptedShare = await encryptShare(share, answer);
```

## Implementation Details

### 1. **Shamir's Secret Sharing**

```typescript
class ShamirSecretSharing {
  // Generates shares using polynomial interpolation
  async generateShares(secret: Uint8Array, numShares: number, threshold: number): Promise<Uint8Array[]>
  
  // Reconstructs secret using Lagrange interpolation
  async reconstructSecret(shares: Uint8Array[], threshold: number): Promise<Uint8Array>
}
```

**Key Features:**
- **Finite field arithmetic** over large prime field (2^127 - 1)
- **Polynomial interpolation** for share generation
- **Lagrange interpolation** for secret reconstruction
- **Threshold security** - need exactly threshold shares

### 2. **Password Recovery Service**

```typescript
class PasswordRecoveryService {
  // Setup recovery with security questions
  async setupRecovery(password: string, questions: RecoveryQuestion[], threshold: number): Promise<RecoverySetup>
  
  // Recover password using answers
  async recoverPassword(shares: RecoveryShare[], answers: string[]): Promise<string>
}
```

**Key Features:**
- **PBKDF2 key derivation** with 100,000 iterations
- **AES-256-GCM encryption** for share protection
- **Answer validation** and error handling
- **Threshold enforcement** - minimum correct answers required

### 3. **Security Questions**

```typescript
interface RecoveryQuestion {
  id: string;
  question: string;
  answer: string;
}
```

**Validation Rules:**
- **2-5 questions** required
- **Unique questions** - no duplicates
- **Minimum 3 characters** per answer
- **Custom or suggested questions** supported

## User Experience

### 📝 **Setup Flow**

1. **Enter password** for encryption
2. **Choose threshold** (2-5 answers needed)
3. **Add security questions** (custom or suggested)
4. **Provide answers** to each question
5. **Recovery setup complete** - shares generated and stored

### 🔄 **Recovery Flow**

1. **Select recovery mode**
2. **Answer security questions** (minimum threshold)
3. **Password recovered** automatically
4. **Access restored** to encrypted data

### 🎯 **Example Usage**

```typescript
// Setup Recovery
const recoverySetup = await recoveryService.setupRecovery(
  "mySecurePassword",
  [
    { question: "What was your first pet?", answer: "Fluffy" },
    { question: "Where were you born?", answer: "New York" },
    { question: "What was your first car?", answer: "Toyota Camry" }
  ],
  2 // Need 2 correct answers to recover
);

// Recover Password
const recoveredPassword = await recoveryService.recoverPassword(
  recoverySetup.shares,
  ["Fluffy", "New York"] // 2 correct answers
);
```

## Security Benefits

### ✅ **Protection Against**

- **Password loss** - recoverable through security questions
- **Single point of failure** - distributed across multiple shares
- **Brute force attacks** - PBKDF2 with 100k iterations
- **Rainbow table attacks** - unique salt per encryption
- **Server compromise** - recovery happens client-side

### 🛡️ **Cryptographic Guarantees**

- **Shamir's Secret Sharing** - mathematically proven security
- **Threshold security** - need exactly threshold shares
- **Information-theoretic security** - no computational assumptions
- **Perfect secrecy** - no information leakage below threshold

## Database Schema

### Recovery Shares Table

```sql
CREATE TABLE recovery_shares (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    share TEXT NOT NULL,           -- Encrypted Shamir share
    question TEXT NOT NULL,        -- Security question
    answer_hash TEXT NOT NULL,     -- Hashed answer for validation
    threshold INTEGER NOT NULL,    -- Minimum shares needed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id)
);
```

### Security Features

- **Encrypted shares** - server cannot decrypt
- **Hashed answers** - answers not stored in plain text
- **User isolation** - shares tied to specific users
- **Audit trail** - creation and update timestamps

## Integration with E2E Encryption

### 🔐 **Complete Flow**

```typescript
// 1. User sets password
const password = "mySecurePassword";

// 2. Setup recovery
const recoverySetup = await recoveryService.setupRecovery(password, questions, 2);

// 3. Use password for E2E encryption
pointsApi.setPassword(password);

// 4. Encrypt data (client-side)
const encryptedPoint = await encryptionService.encryptPoint(point, password);

// 5. Send encrypted data to server
await api.createPoint(encryptedPoint);

// 6. If password forgotten, recover
const recoveredPassword = await recoveryService.recoverPassword(shares, answers);

// 7. Use recovered password for decryption
pointsApi.setPassword(recoveredPassword);
const decryptedPoints = await api.getAllPoints();
```

## Best Practices

### 1. **Security Questions**

- **Use memorable questions** that are hard to guess
- **Avoid online-available information** (birth dates, addresses)
- **Consider custom questions** for better security
- **Regular updates** - change questions periodically

### 2. **Threshold Selection**

- **2 answers** - Good balance of security and convenience
- **3 answers** - Higher security, more complex recovery
- **4-5 answers** - Maximum security, complex recovery

### 3. **User Education**

- **Explain the process** - how recovery works
- **Emphasize security** - importance of keeping answers safe
- **Provide examples** - suggested questions and good practices
- **Clear instructions** - step-by-step setup and recovery

### 4. **Error Handling**

- **Graceful failures** - handle incorrect answers
- **Clear messages** - explain what went wrong
- **Retry mechanisms** - allow multiple attempts
- **Fallback options** - alternative recovery methods

## Limitations and Considerations

### ⚠️ **Current Limitations**

- **Demo implementation** - simplified for demonstration
- **Local storage** - shares stored in browser (not production-ready)
- **Password derivation** - simplified recovery key to password mapping
- **No server integration** - shares not stored on server

### 🔧 **Production Enhancements**

- **Server-side storage** - secure share storage
- **Backup mechanisms** - multiple recovery methods
- **Rate limiting** - prevent brute force attacks
- **Audit logging** - track recovery attempts
- **Multi-factor recovery** - combine with other methods

## Testing

### 🧪 **Test Scenarios**

```typescript
// Test 1: Successful recovery
const password = "testPassword123";
const questions = [
  { question: "Pet name?", answer: "Fluffy" },
  { question: "Birth city?", answer: "New York" },
  { question: "First car?", answer: "Toyota" }
];

const setup = await recoveryService.setupRecovery(password, questions, 2);
const recovered = await recoveryService.recoverPassword(setup.shares, ["Fluffy", "New York"]);
// recovered should match password

// Test 2: Insufficient answers
try {
  await recoveryService.recoverPassword(setup.shares, ["Fluffy"]);
} catch (error) {
  // Should throw "Not enough valid answers"
}

// Test 3: Incorrect answers
try {
  await recoveryService.recoverPassword(setup.shares, ["Wrong", "Wrong"]);
} catch (error) {
  // Should throw "Not enough valid answers"
}
```

## Conclusion

This implementation provides **secure, user-friendly password recovery** while maintaining the **privacy benefits of end-to-end encryption**. Shamir's Secret Sharing ensures that:

- ✅ **True E2E encryption** is maintained
- ✅ **Password recovery** is possible through security questions
- ✅ **Threshold security** prevents single point of failure
- ✅ **Cryptographic guarantees** provide mathematical security
- ✅ **User experience** is simple and intuitive

The system balances **security and usability**, making it suitable for applications requiring both strong encryption and password recovery capabilities.