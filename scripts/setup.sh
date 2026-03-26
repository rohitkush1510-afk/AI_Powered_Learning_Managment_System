#!/bin/bash

echo "Setting up Projexa LMS..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a .env file with your configuration"
echo "2. Add your OPENAI_API_KEY if you want to use AI features"
echo "3. Run 'npm run dev' to start the development server"

