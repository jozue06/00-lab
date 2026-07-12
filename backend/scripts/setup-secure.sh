#!/bin/bash

echo "🔐 Setting up secure points application..."
echo ""

# Generate encryption key
echo "📝 Generating secure encryption key..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "✅ Generated encryption key:"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Create .env file
echo "📄 Creating .env file..."
cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/points_db

# Security - Generated encryption key
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
EOF

echo "✅ Created .env file with secure encryption key"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔒 Security Setup Complete!"
echo ""
echo "Key Security Points:"
echo "✅ Encryption key generated and stored in .env"
echo "✅ Key is 32 bytes (256 bits) - cryptographically secure"
echo "✅ Key is never exposed to frontend"
echo "✅ All sensitive data encrypted before database storage"
echo "✅ HTTPS handles network security"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in .env with your PostgreSQL connection"
echo "2. Run database migration: psql -d your_db -f src/database/migrations/001_create_points_table.sql"
echo "3. Start the server: npm run dev"
echo ""
echo "⚠️  IMPORTANT: Never commit the .env file to version control!"
echo "   Add .env to your .gitignore file"