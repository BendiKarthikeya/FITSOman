# TEEJARTI - Full-Stack Business Matchmaking Platform

## Overview

TEEJARTI is a comprehensive full-stack business marketplace platform connecting business owners and investors in the Oman and GCC region. It provides a robust environment for business matchmaking, featuring bilingual support (English/Arabic) including RTL layout. The platform aims to facilitate connections, streamline business transactions, and foster economic growth in the region.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Brand Colors**: Deep blue (#1A3B5B) and golden (#C79F3D) for brand consistency.
- **Typography**: Georgia serif font for an elegant, professional look.
- **Loading System**: Clean full-page loader with TEEJARTI branding for initial loads, and professional skeleton components for API data loading, replacing all inline loaders.
- **Responsive Design**: Fully responsive across mobile, tablet, and desktop.
- **Modern Design Elements**: Gradient overlays, smooth animations (e.g., gold underline for navigation, image sliders), and compact layouts.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Shadcn/UI (based on Radix UI), Tailwind CSS, React Query for server state, React Context for global state, Wouter for routing, React Hook Form with Zod validation, and i18next for internationalization.
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM, JWT-based authentication with bcrypt, Multer for file uploads, Helmet.js for security, and rate limiting.
- **Bilingual Support**: Deeply integrated English/Arabic support with RTL layout, including database schema fields (e.g., `title_en/ar`). Automatic content translation on submission.
- **Authentication System**: JWT-based with 30-day expiration, role-based access control (admin, entrepreneur, investor, broker), bcrypt hashing, and OTP support.
- **Business Listing Management**: Features bilingual content creation, category organization, status workflows, image upload, and search/filtering.
- **KYC System**: Document upload, validation, admin review/approval workflow, and status tracking.
- **Admin Dashboard**: Comprehensive tools for user management, listing moderation, KYC review, system settings, and analytics.
- **Caching Strategy**: Multi-layer caching including React Query, in-memory cache with TTL, component memoization, lazy image loading, and service worker caching for performance optimization.

### Feature Specifications
- **Core Functionality**: Business and investment listing, user registration, authentication, profile management, and matchmaking.
- **User Journey**: Comprehensive onboarding with email verification, progressive profile completion, and KYC document submission.
- **Password Reset**: Secure email-based password reset system.
- **Newsletter System**: Subscription management with email integration.
- **FAQ Page**: Replaced success stories with an expandable FAQ section.

### System Design Choices
- **Architecture**: Three-tier architecture with a clear separation of concerns.
- **Code Quality**: Emphasis on type safety, clean code, and optimized performance.
- **Security**: Robust security features including JWT authentication, rate limiting, file upload validation, CSRF protection, SQL injection prevention (Drizzle ORM), and XSS protection.
- **Modularity**: Use of reusable components and hooks for maintainability.

## External Dependencies

- **Translation Services**:
    - **HuggingFace Inference API**: Primary service for Arabic translations.
    - **Google Cloud Translation API**: Fallback service.
- **Communication Services**:
    - **SendGrid**: Email service for notifications.
- **File Storage**:
    - **Local Storage**: Files stored in `/public/uploads`.
    - **Sharp**: Image processing and optimization.
- **Payment Processing**:
    - **Stripe**: Configured for payment processing, though not fully implemented.