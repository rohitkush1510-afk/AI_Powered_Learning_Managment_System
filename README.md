# Projexa LMS - AI-Powered Learning Management System

A modern, full-featured Learning Management System built with Next.js, TypeScript, and AI-powered features.

## Features

### Core Features
- **User Authentication** - Secure login/registration with role-based access (Student, Instructor, Admin)
- **Course Management** - Create, edit, and manage courses with modules and lessons
- **Student Enrollment** - Browse and enroll in courses
- **Progress Tracking** - Track learning progress through courses, modules, and lessons
- **Quiz System** - Create quizzes with multiple question types

### AI-Powered Features
- **Personalized Learning Paths** - AI-generated recommendations based on student progress
- **AI Tutor Chatbot** - Interactive AI tutor for answering student questions
- **Automated Quiz Generation** - AI-powered quiz question generation from lesson content
- **Course Insights** - AI analysis of course difficulty and engagement

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite (easily switchable to PostgreSQL)
- **AI**: OpenAI GPT-4 integration
- **Authentication**: JWT-based authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Projexa
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
OPENAI_API_KEY="your-openai-api-key"
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
Projexa/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── courses/       # Course management endpoints
│   │   ├── enrollments/   # Enrollment endpoints
│   │   └── ai/            # AI feature endpoints
│   ├── dashboard/         # User dashboard
│   ├── courses/           # Course pages
│   └── ai/                # AI feature pages
├── components/             # React components
├── lib/                    # Utility functions
│   ├── prisma.ts          # Prisma client
│   ├── auth.ts            # Authentication utilities
│   └── ai.ts              # AI service functions
├── prisma/                 # Prisma schema
└── public/                 # Static assets
```

## Usage

### As a Student
1. Register/Login as a Student
2. Browse available courses
3. Enroll in courses
4. Access AI tutor for help
5. Get personalized learning recommendations
6. Track your progress

### As an Instructor
1. Register/Login as an Instructor
2. Create courses with modules and lessons
3. Generate AI-powered quizzes
4. View course analytics
5. Manage student enrollments

## AI Features

### OpenAI Integration
The system uses OpenAI's GPT-4 API for:
- Generating personalized learning recommendations
- Creating quiz questions from lesson content
- Providing AI tutor responses
- Analyzing course insights

**Note**: AI features require a valid OpenAI API key. Without it, the system will use mock responses.

## Database Schema

The system uses Prisma with the following main models:
- **User** - Students, Instructors, Admins
- **Course** - Course information
- **Module** - Course modules
- **Lesson** - Individual lessons
- **Quiz** - Quizzes and questions
- **Enrollment** - Student enrollments
- **Progress** - Learning progress tracking
- **AIRecommendation** - AI-generated recommendations
- **ChatMessage** - AI tutor conversations

## Development

### Database Migrations
```bash
npx prisma migrate dev
```

### View Database
```bash
npx prisma studio
```

### Build for Production
```bash
npm run build
npm start
```

## Environment Variables

- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key for AI features

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

