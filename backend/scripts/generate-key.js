#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure 32-byte (256-bit) encryption key
const key = crypto.randomBytes(32).toString('hex');

console.log('Generated 32-byte encryption key:');
console.log(key);
console.log('\nAdd this to your .env file as:');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\n⚠️  Keep this key secure and never commit it to version control!');