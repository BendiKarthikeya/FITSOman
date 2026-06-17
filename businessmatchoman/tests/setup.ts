import '@testing-library/jest-dom';
import express, { Express } from 'express';
import { setupSecurity } from '../server/security';
import { setupAuth } from '../server/auth';
import { MemStorage } from '../server/storage';

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  // Mock console.log/warn/error for cleaner test output
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Create a test server instance
export const createTestServer = (): Express => {
  const app = express();
  
  // Set trust proxy for rate limiter
  app.set('trust proxy', 1);
  
  // Set up body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  
  // Set up security middleware
  setupSecurity(app);
  
  // Set up authentication routes
  setupAuth(app);
  
  // Initialize storage for testing
  app.locals.storage = new MemStorage();
  
  return app;
};

// Global test cleanup
afterAll(() => {
  // Restore console
  jest.restoreAllMocks();
});

// Helper function to create test user data
export const createTestUser = (overrides = {}) => ({
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@teejarti-test.com`,
  password: 'TestPassword123!',
  fullName: 'Test User',
  role: 'entrepreneur' as const,
  ...overrides,
});

// Helper function to create test listing data
export const createTestListing = (overrides = {}) => ({
  title_en: 'Test Business',
  title_ar: 'عمل تجريبي',
  description_en: 'A test business listing',
  description_ar: 'قائمة أعمال تجريبية',
  industry: 'Technology',
  location: 'Muscat',
  askingPrice: 50000,
  status: 'pending' as const,
  ...overrides,
});

// Helper function to create test KYC data
export const createTestKYC = (overrides = {}) => ({
  documentType: 'passport',
  documentNumber: 'TEST123456',
  documentUrl: '/test/document.pdf',
  status: 'pending' as const,
  ...overrides,
});

// Helper function to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create valid test credentials
export const createTestCredentials = () => ({
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!'
});