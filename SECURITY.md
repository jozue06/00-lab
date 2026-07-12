# Security Architecture for Points Data

## Overview

This application implements **server-side encryption** for sensitive points data. The encryption/decryption happens **exclusively on the backend** - the frontend never handles encryption keys or encrypted data directly.

## Security Model

### ✅ What We're Protecting Against

1. **Database Breach**: If someone gains access to the database, they cannot read the sensitive data without the encryption key
2. **Server Compromise**: If the server is compromised, the encryption key is stored separately (environment variables, key management service)
3. **Data at Rest**: All sensitive data in the database is encrypted

### ❌ What We're NOT Protecting Against

1. **Network Interception**: HTTPS/TLS already handles this
2. **Frontend Security**: The frontend receives decrypted data over HTTPS
3. **Server Memory**: Data is decrypted in server memory (this is normal and expected)

## How It Works

### 1. Data Flow

```
Frontend (Svelte) → HTTPS → Backend (Node.js) → Encrypt → Database (PostgreSQL)
```

### 2. Encryption Process

1. **Frontend sends plain text data** over HTTPS to backend
2. **Backend encrypts the data** using AES-256-GCM with a random IV
3. **Backend stores encrypted data** in the database
4. **Backend decrypts data** when requested and sends plain text over HTTPS

### 3. Key Management

- **Encryption key is stored in environment variables** (never in code)
- **Key is 32 bytes (256 bits)** generated using cryptographically secure random generator
- **Key is never sent to frontend** or exposed in API responses

## Security Benefits

### Database Security
```sql
-- What's stored in the database (encrypted):
points_data: "eyJpdiI6IjEyMzQ1Njc4OTAiLCJkYXRhIjoiZW5jcnlwdGVkX2RhdGEiLCJ0YWciOiJhdXRoX3RhZyJ9"

-- What the attacker sees (meaningless):
{
  "id": 1,
  "points_data": "eyJpdiI6IjEyMzQ1Njc4OTAiLCJkYXRhIjoiZW5jcnlwdGVkX2RhdGEiLCJ0YWciOiJhdXRoX3RhZyJ9",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### API Security
```typescript
// Frontend sends plain text (over HTTPS)
POST /api/points
{
  "date": "2024-01-01",
  "title": "My Point",
  "description": "Sensitive information"
}

// Backend receives plain text, encrypts, stores encrypted
// Frontend receives plain text (over HTTPS)
GET /api/points/1
{
  "id": 1,
  "date": "2024-01-01",
  "title": "My Point", 
  "description": "Sensitive information"
}
```

## Why This Approach is Secure

### 1. **HTTPS Handles Network Security**
- All communication between frontend and backend uses HTTPS/TLS
- TLS provides encryption, authentication, and integrity
- No need for additional network-level encryption

### 2. **Backend Encryption Protects Data at Rest**
- Database contains only encrypted data
- Even with database access, data is unreadable without the key
- Encryption key is stored separately from the database

### 3. **Proper Key Management**
- Keys are generated using cryptographically secure methods
- Keys are stored in environment variables or key management services
- Keys are never exposed to clients

## Alternative Approaches (Not Recommended)

### ❌ Frontend Encryption
```typescript
// DON'T DO THIS - Key exposed to users
const encryptionKey = "exposed_key"; // Visible in browser
const encrypted = encrypt(data, encryptionKey); // User can see the key
```

### ❌ Double Encryption
```typescript
// DON'T DO THIS - Redundant and confusing
const encrypted = encrypt(alreadyEncryptedData, key); // Pointless
```

## Best Practices

### 1. **Use HTTPS in Production**
```bash
# Always use HTTPS in production
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### 2. **Secure Key Generation**
```bash
# Generate a secure key
node scripts/generate-key.js
```

### 3. **Environment Variable Security**
```bash
# Store keys securely
ENCRYPTION_KEY=your_generated_key_here
```

### 4. **Key Rotation**
- Regularly rotate encryption keys
- Implement key versioning for seamless rotation
- Use key management services (AWS KMS, Azure Key Vault, etc.)

## Threat Model

### Protected Against
- ✅ Database breaches
- ✅ Unauthorized database access
- ✅ Data theft from storage
- ✅ Network interception (via HTTPS)

### Not Protected Against
- ❌ Server compromise (data is decrypted in memory)
- ❌ Frontend XSS (data is decrypted on server)
- ❌ Insider threats (server administrators)

## Conclusion

This architecture provides **database-level security** while leveraging **HTTPS for network security**. The encryption protects sensitive data at rest, while HTTPS protects data in transit. This is the standard and secure approach used by most applications.