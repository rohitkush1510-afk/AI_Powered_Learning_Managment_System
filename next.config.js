/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  },
}

module.exports = nextConfig

