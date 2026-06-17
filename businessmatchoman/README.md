
# TEEJARTI

A full-stack business marketplace platform connecting business owners and investors in the Oman and GCC region.

## Features
- Business listing management with bilingual support
- User authentication and KYC verification
- Multi-language support (English/Arabic) with RTL layout
- Admin dashboard for content moderation
- Document and image management
- Translation system with HuggingFace API
- Newsletter subscription system
- Email notifications via SendGrid

## Quick Start
1. Install dependencies: `npm install`
2. Set up environment variables (see .env.example)
3. Run development server: `npm run dev`
4. Access at http://localhost:5000

## Technology Stack
- Frontend: React 18, TypeScript, Shadcn/UI, Tailwind CSS
- Backend: Node.js, Express.js, JWT authentication
- Database: PostgreSQL with Drizzle ORM
- Translation: HuggingFace Inference API
- Email: SendGrid integration
- File Upload: Multer with image processing
