# TEEJARTI - API Documentation

## Base URL
```
https://[your-domain]/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```http
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {...}
  }
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "entrepreneur|investor|broker",
  "company": "string (optional)",
  "position": "string (optional)",
  "location": "string (optional)",
  "phone": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "entrepreneur",
      "verified": false
    },
    "token": "jwt_token_here"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt_token_here",
    "expiresAt": "2025-08-16T07:29:14.000Z"
  }
}
```

### Logout User
```http
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## User Endpoints

### Get Current User
```http
GET /api/user
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "entrepreneur",
    "company": "Tech Startup Inc.",
    "verified": true,
    "twoFactorEnabled": false,
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### Update User Profile
```http
PUT /api/user
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "company": "string (optional)",
  "position": "string (optional)",
  "location": "string (optional)",
  "phone": "string (optional)",
  "bio": "string (optional)"
}
```

## Business Listings Endpoints

### Get Listings (with filtering)
```http
GET /api/listings
```

**Query Parameters:**
- `location` - Filter by location (Muscat, Dubai, Salalah, Sohar, Sur)
- `transactionType` - Filter by transaction type (Partnership, Investment, Business Sale, Full Sale, Partial Investment)
- `industry` - Filter by industry
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `hasFinancials` - Filter listings with financial data (true/false)
- `hasDocuments` - Filter listings with business plans (true/false)
- `featured` - Filter featured listings only (true/false)
- `verified` - Filter verified listings only (true/false)
- `sortBy` - Sort criteria (newest, oldest, price-high, price-low, alphabetical)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `search` - Search term for title/description

**Example:**
```http
GET /api/listings?location=Muscat&transactionType=Investment&hasFinancials=true&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Tech Startup - AI Platform",
      "description": "Revolutionary AI platform for business automation",
      "industry": "Technology",
      "location": "Muscat",
      "saleType": "Investment",
      "askingPrice": 500000,
      "currency": "OMR",
      "featured": false,
      "verified": true,
      "imageUrl": "/uploads/listing1.jpg",
      "financials": "Monthly revenue: $50K...",
      "businessPlan": "5-year growth plan...",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Get Single Listing
```http
GET /api/listings/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Tech Startup - AI Platform",
    "title_en": "Tech Startup - AI Platform",
    "title_ar": "شركة تقنية ناشئة - منصة ذكاء اصطناعي",
    "description": "Revolutionary AI platform...",
    "description_en": "Revolutionary AI platform...",
    "description_ar": "منصة ذكاء اصطناعي ثورية...",
    "industry": "Technology",
    "location": "Muscat",
    "saleType": "Investment",
    "askingPrice": 500000,
    "currency": "OMR",
    "featured": false,
    "verified": true,
    "status": "approved",
    "imageUrl": "/uploads/listing1.jpg",
    "financials": "Monthly revenue: $50K...",
    "businessPlan": "5-year growth plan...",
    "user": {
      "id": 2,
      "username": "entrepreneur1",
      "company": "Innovation Labs"
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T14:20:00Z"
  }
}
```

### Create New Listing
```http
POST /api/listings
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title_en": "string",
  "title_ar": "string (optional - auto-translated if not provided)",
  "description_en": "string",
  "description_ar": "string (optional - auto-translated if not provided)",
  "industry": "string",
  "location": "string",
  "saleType": "Partnership|Investment|Business Sale|Full Sale|Partial Investment",
  "askingPrice": 500000,
  "currency": "OMR|USD|EUR",
  "financials": "string (optional)",
  "businessPlan": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "title": "New Business Listing",
    "status": "pending",
    "message": "Listing created successfully and submitted for review"
  }
}
```

### Update Listing
```http
PUT /api/listings/{id}
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as create listing

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "message": "Listing updated successfully"
  }
}
```

### Delete Listing
```http
DELETE /api/listings/{id}
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

### Get Featured Listings
```http
GET /api/listings/featured
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Featured Business Opportunity",
      "description": "Premium investment opportunity...",
      "askingPrice": 1000000,
      "imageUrl": "/uploads/featured1.jpg",
      "featured": true,
      "verified": true
    }
  ]
}
```

### Get Similar Listings
```http
GET /api/listings/{id}/similar
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "title": "Similar Tech Startup",
      "industry": "Technology",
      "askingPrice": 450000,
      "similarity": 0.85
    }
  ]
}
```

## KYC (Know Your Customer) Endpoints

### Get KYC Documents
```http
GET /api/kyc
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "documentType": "passport",
      "status": "approved",
      "uploadedAt": "2025-01-10T00:00:00Z",
      "reviewedAt": "2025-01-12T00:00:00Z"
    }
  ]
}
```

### Upload KYC Document
```http
POST /api/kyc
```

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
- `documentType`: string (passport, national_id, business_license, etc.)
- `document`: file (PDF, JPG, PNG)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "documentType": "passport",
    "status": "pending",
    "message": "Document uploaded successfully and submitted for review"
  }
}
```

## Settings Endpoints

### Get Public Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "site_title",
      "value": "BusinessMatch",
      "type": "text"
    },
    {
      "key": "site_logo",
      "value": "/uploads/logo.png",
      "type": "image"
    }
  ]
}
```

## File Upload Endpoints

### Upload File
```http
POST /api/upload
```

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
- `file`: file (max 10MB)
- `type`: string (profile, listing, document, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "upload_1642781234567_abc.jpg",
    "originalName": "business-photo.jpg",
    "url": "/uploads/upload_1642781234567_abc.jpg",
    "size": 1048576,
    "mimeType": "image/jpeg"
  }
}
```

## Admin Endpoints

All admin endpoints require admin role authentication.

### Get All Users
```http
GET /api/admin/users
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "entrepreneur",
      "status": "active",
      "verified": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Get All Listings (Admin)
```http
GET /api/admin/listings
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected)
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Business Listing",
      "status": "pending",
      "user": {
        "id": 2,
        "username": "entrepreneur1"
      },
      "createdAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### Update Listing Status
```http
PUT /api/admin/listings/{id}/status
```

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "status": "approved|rejected",
  "rejectionReason": "string (required if rejected)"
}
```

### Block/Unblock User
```http
POST /api/admin/users/{id}/block
```

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "action": "block|unblock",
  "reason": "string (required for block)"
}
```

### Get Platform Analytics
```http
GET /api/admin/analytics
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 980,
      "blocked": 15,
      "new_this_month": 125
    },
    "listings": {
      "total": 456,
      "approved": 380,
      "pending": 56,
      "rejected": 20,
      "featured": 45
    },
    "kyc": {
      "total_submissions": 890,
      "approved": 750,
      "pending": 95,
      "rejected": 45
    }
  }
}
```

## Translation Endpoints

### Translate Text
```http
POST /api/translate
```

**Request Body:**
```json
{
  "text": "Hello, world!",
  "targetLanguage": "ar|en",
  "sourceLanguage": "en|ar (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "translatedText": "مرحبا بالعالم!",
    "sourceLanguage": "en",
    "targetLanguage": "ar",
    "cached": false
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | No valid authentication token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |
| `FILE_UPLOAD_ERROR` | File upload failed |
| `TRANSLATION_ERROR` | Translation service failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_SERVER_ERROR` | Server error occurred |

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authenticated**: 200 requests per minute per user
- **File Upload**: 20 uploads per hour per user
- **Translation**: 50 translations per hour per user

## Best Practices

1. **Authentication**: Always include valid JWT tokens for protected endpoints
2. **Error Handling**: Check the `success` field and handle errors appropriately
3. **Pagination**: Use pagination for large datasets
4. **File Uploads**: Validate file types and sizes before upload
5. **Rate Limiting**: Implement exponential backoff for rate-limited requests
6. **Caching**: Cache frequently accessed data like settings and categories
7. **Security**: Never expose sensitive user data in client-side code

## SDK Examples

### JavaScript/TypeScript
```javascript
const API_BASE = 'https://your-domain/api';

class BusinessMatchAPI {
  constructor(token) {
    this.token = token;
  }

  async getListings(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/listings?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async createListing(data) {
    const response = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

### Python
```python
import requests

class BusinessMatchAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_listings(self, **filters):
        response = requests.get(
            f"{self.base_url}/listings",
            params=filters,
            headers=self.headers
        )
        return response.json()
    
    def create_listing(self, data):
        response = requests.post(
            f"{self.base_url}/listings",
            json=data,
            headers=self.headers
        )
        return response.json()
```

---

For more detailed examples and advanced usage, please refer to the technical documentation and system overview.