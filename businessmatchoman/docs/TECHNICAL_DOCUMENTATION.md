# BusinessMatchOman - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Specification](#api-specification)
6. [Security Implementation](#security-implementation)
7. [Authentication & Authorization](#authentication--authorization)
8. [Translation System](#translation-system)
9. [File Management](#file-management)
10. [Performance & Optimization](#performance--optimization)
11. [Deployment & DevOps](#deployment--devops)
12. [Monitoring & Logging](#monitoring--logging)

## System Overview

TEEJARTI is a comprehensive full-stack business matchmaking platform designed to connect entrepreneurs and investors across Oman and the GCC region. The platform facilitates business discovery, investment opportunities, and partnerships through an intelligent matching system with advanced filtering capabilities.

### Key Features
- **Business Listings Management**: Create, manage, and discover business opportunities
- **Intelligent Matching**: Advanced filtering and search algorithms
- **Multi-language Support**: Full English/Arabic translation with RTL support
- **KYC Verification**: Document verification and compliance system
- **User Management**: Role-based access control for different user types
- **Admin Dashboard**: Comprehensive administration and monitoring
- **Real-time Updates**: Live data synchronization and notifications

### User Roles
- **Entrepreneurs**: Create business listings and seek investors
- **Investors**: Browse and filter investment opportunities
- **Brokers**: Facilitate connections between parties
- **Admins**: Platform management and moderation

## Architecture Overview

### System Architecture Pattern
The application follows a **Three-Tier Architecture** pattern:

1. **Presentation Layer**: React.js frontend with TypeScript
2. **Business Logic Layer**: Node.js/Express.js backend with RESTful APIs
3. **Data Layer**: PostgreSQL database with Drizzle ORM

### Architectural Principles
- **Separation of Concerns**: Clear separation between frontend, backend, and database
- **RESTful Design**: Standard HTTP methods and resource-based URLs
- **Type Safety**: Full TypeScript implementation across the stack
- **Scalability**: Modular design for horizontal scaling
- **Security First**: Multiple layers of security implementation
- **Internationalization**: Built-in multi-language support

## Technology Stack

### Frontend Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: Component library built on Radix UI
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **React Hook Form**: Form handling with Zod validation
- **i18next**: Internationalization framework

### Backend Technologies
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **TypeScript**: Type-safe server-side development
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Primary database system
- **JWT**: JSON Web Token authentication
- **bcrypt**: Password hashing and security
- **Multer**: File upload handling
- **Helmet**: Security middleware
- **Sharp**: Image processing and optimization

### External Services
- **HuggingFace API**: Primary translation service
- **SendGrid**: Email communication service
- **Stripe**: Payment processing (configured)

### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Drizzle Kit**: Database migration management
- **Vite Plugin Suite**: Development enhancements

## Database Design

### Core Entity Relationships

```
Users (1:N) Listings
Users (1:N) KYC Documents
Users (1:N) OTP Codes
Listings (N:M) Tags
Listings (N:1) Categories
Listings (N:1) Locations
```

### Primary Tables

#### Users Table
```sql
users {
  id: serial PRIMARY KEY
  username: text UNIQUE NOT NULL
  email: text UNIQUE NOT NULL
  password: text NOT NULL
  role: enum('admin', 'entrepreneur', 'investor', 'broker')
  status: enum('active', 'blocked', 'pending')
  company: text
  position: text
  location: text
  phone: text
  bio: text
  profileImageUrl: text
  verified: boolean DEFAULT false
  twoFactorEnabled: boolean DEFAULT false
  createdAt: timestamp DEFAULT NOW()
}
```

#### Listings Table
```sql
listings {
  id: serial PRIMARY KEY
  userId: integer REFERENCES users(id)
  categoryId: integer REFERENCES categories(id)
  locationId: integer REFERENCES locations(id)
  title_en: text NOT NULL
  title_ar: text NOT NULL
  industry: text NOT NULL
  location: text NOT NULL
  saleType: text NOT NULL
  askingPrice: double precision NOT NULL
  currency: text DEFAULT 'OMR'
  description_en: text
  description_ar: text
  featured: boolean DEFAULT false
  verified: boolean DEFAULT false
  status: enum('pending', 'approved', 'rejected') DEFAULT 'pending'
  active: boolean DEFAULT true
  imageUrl: text
  businessPlan: text
  financials: text
  createdAt: timestamp DEFAULT NOW()
  updatedAt: timestamp DEFAULT NOW()
}
```

#### KYC Documents Table
```sql
kycDocuments {
  id: serial PRIMARY KEY
  userId: integer REFERENCES users(id)
  documentType: text NOT NULL
  documentUrl: text NOT NULL
  status: enum('pending', 'approved', 'rejected') DEFAULT 'pending'
  rejectionReason: text
  reviewedBy: integer REFERENCES users(id)
  reviewedAt: timestamp
  createdAt: timestamp DEFAULT NOW()
}
```

### Data Integrity
- **Foreign Key Constraints**: Maintain referential integrity
- **Unique Constraints**: Prevent duplicate entries
- **Check Constraints**: Validate data ranges and formats
- **Indexes**: Optimize query performance on frequently accessed columns

## API Specification

### Base URL Structure
```
https://[domain]/api/[version]/[resource]
```

### Authentication Endpoints
```http
POST /api/auth/register    # User registration
POST /api/auth/login       # User authentication
POST /api/auth/logout      # Session termination
POST /api/auth/refresh     # Token refresh
POST /api/auth/verify-2fa  # Two-factor authentication
```

### Listing Endpoints
```http
GET    /api/listings                 # Get filtered listings
POST   /api/listings                 # Create new listing
GET    /api/listings/{id}            # Get specific listing
PUT    /api/listings/{id}            # Update listing
DELETE /api/listings/{id}            # Delete listing
GET    /api/listings/featured        # Get featured listings
GET    /api/listings/{id}/similar    # Get similar listings
```

### User Management Endpoints
```http
GET    /api/user                     # Get current user
PUT    /api/user                     # Update user profile
GET    /api/users/{id}               # Get user profile
POST   /api/users/{id}/block         # Block user (admin)
```

### KYC Endpoints
```http
GET    /api/kyc                      # Get KYC documents
POST   /api/kyc                      # Upload KYC document
PUT    /api/kyc/{id}                 # Update KYC status
```

### Admin Endpoints
```http
GET    /api/admin/users              # Get all users
GET    /api/admin/listings           # Get all listings
GET    /api/admin/analytics          # Get platform analytics
PUT    /api/admin/settings           # Update settings
```

### Filtering Parameters
```http
?location={location}           # Filter by location
?transactionType={type}        # Filter by transaction type
?industry={industry}           # Filter by industry
?minPrice={amount}             # Minimum price filter
?maxPrice={amount}             # Maximum price filter
?hasFinancials={boolean}       # Has financial documents
?hasDocuments={boolean}        # Has business plan
?featured={boolean}            # Featured listings only
?verified={boolean}            # Verified listings only
?sortBy={field}                # Sort criteria
?page={number}                 # Pagination
?limit={number}                # Results per page
```

## Security Implementation

### Authentication Security
- **JWT Tokens**: Stateless authentication with 30-day expiration
- **Password Hashing**: bcrypt with 10 salt rounds
- **Two-Factor Authentication**: OTP-based 2FA support
- **Session Management**: PostgreSQL-backed session storage

### API Security
- **Rate Limiting**: Request throttling per IP and user
- **CORS Configuration**: Controlled cross-origin requests
- **Helmet Middleware**: Security headers and protections
- **CSRF Protection**: Cross-site request forgery prevention
- **Input Validation**: Zod schema validation for all inputs

### Data Security
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: Content sanitization and encoding
- **File Upload Security**: Type validation and size limits
- **Environment Variables**: Secure configuration management

### Access Control
- **Role-Based Permissions**: Granular access control
- **Resource Authorization**: User ownership validation
- **Admin Privileges**: Elevated access for administrative functions

## Authentication & Authorization

### JWT Implementation
```typescript
// Token Structure
{
  userId: number
  email: string
  role: 'admin' | 'entrepreneur' | 'investor' | 'broker'
  tokenIssued: string
  tokenExpires: string
}
```

### Role-Based Access Control (RBAC)
- **Admin**: Full system access and user management
- **Entrepreneur**: Create listings, manage profile
- **Investor**: Browse listings, contact entrepreneurs
- **Broker**: Facilitate connections, limited admin access

### Two-Factor Authentication Flow
1. User enables 2FA in settings
2. OTP code generated and sent via email/SMS
3. User enters code for verification
4. 2FA token stored for session management

## Translation System

### Multi-Service Architecture
```typescript
// Primary: HuggingFace API
// Fallback: Google Cloud Translation
// Cache: localStorage with TTL
// Dictionary: Static translations
```

### Translation Workflow
1. **Content Creation**: User inputs in preferred language
2. **Auto-Translation**: Background translation to alternate language
3. **Cache Storage**: Translated content cached locally
4. **Fallback Logic**: Multiple translation services for reliability
5. **Manual Override**: Admin can manually correct translations

### RTL Support
- **Layout Adaptation**: Automatic RTL layout for Arabic
- **Font Management**: Arabic-compatible font loading
- **Direction Detection**: Language-based text direction

## File Management

### Upload System
- **Multer Integration**: Secure file upload handling
- **Storage Location**: `/public/uploads` directory
- **File Validation**: Type, size, and security checks
- **Image Processing**: Sharp for optimization and resizing

### Security Measures
- **File Type Validation**: Whitelist of allowed formats
- **Size Limitations**: Configurable upload limits
- **Virus Scanning**: Integration ready for security scanning
- **Access Control**: User-specific file access

## Performance & Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: WebP conversion and lazy loading
- **Caching Strategy**: Service worker and browser caching
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: PostgreSQL connection management
- **Response Caching**: API response caching for static data
- **Compression**: Gzip compression for responses

### Database Optimization
- **Query Optimization**: Efficient joins and filtering
- **Index Strategy**: Composite indexes for complex queries
- **Pagination**: Limit-offset pagination for large datasets
- **Bulk Operations**: Batch processing for large operations

## Deployment & DevOps

### Environment Configuration
```bash
# Production Environment Variables
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=...
HUGGINGFACE_API_KEY=...
SENDGRID_API_KEY=...
```

### Build Process
1. **Frontend Build**: Vite production build with optimization
2. **Backend Build**: TypeScript compilation with ESBuild
3. **Asset Optimization**: Image compression and minification
4. **Database Migration**: Drizzle schema synchronization

### Deployment Strategy
- **Platform**: Replit Deployments
- **Process Management**: Node.js process monitoring
- **Health Checks**: Automated health monitoring
- **SSL/TLS**: Automatic HTTPS certificate management

## Monitoring & Logging

### Application Logging
```typescript
// Log Levels: DEBUG, INFO, WARN, ERROR
console.log('[INFO] User authenticated:', userId);
console.log('[DEBUG] Database query executed:', query);
console.error('[ERROR] Authentication failed:', error);
```

### Performance Monitoring
- **Response Times**: API endpoint performance tracking
- **Database Queries**: Query execution time monitoring
- **Error Rates**: Application error tracking and alerting
- **User Analytics**: Platform usage statistics

### Health Monitoring
- **Database Connectivity**: Connection health checks
- **External Services**: API service availability
- **Memory Usage**: Node.js memory monitoring
- **Disk Space**: Storage utilization tracking

## Error Handling

### Frontend Error Handling
- **React Error Boundaries**: Component-level error catching
- **API Error Handling**: Standardized error response processing
- **User Feedback**: Toast notifications for user actions
- **Retry Logic**: Automatic retry for failed requests

### Backend Error Handling
- **Express Error Middleware**: Centralized error processing
- **Validation Errors**: Structured error responses
- **Database Errors**: Connection and query error handling
- **External Service Errors**: Graceful degradation patterns

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

---

## Conclusion

This technical documentation provides a comprehensive overview of the BusinessMatchOman platform architecture, implementation details, and operational considerations. The platform is built with modern web technologies, security best practices, and scalability in mind to support the growing business matchmaking needs in the Oman and GCC region.

For additional technical details or specific implementation questions, please refer to the codebase documentation or contact the development team.