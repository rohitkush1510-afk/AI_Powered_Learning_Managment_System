# PowerShell setup script for Windows

Write-Host "Setting up Projexa LMS..." -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a .env file with your configuration"
Write-Host "2. Add your OPENAI_API_KEY if you want to use AI features"
Write-Host "3. Run 'npm run dev' to start the development server"

