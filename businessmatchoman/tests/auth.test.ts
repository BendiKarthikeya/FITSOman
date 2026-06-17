import request from 'supertest';
import { Express } from 'express';
import { createTestUser } from './setup';
import { storage } from '../server/storage';
import { hashPassword, comparePasswords, registerUser } from '../server/auth';
import bcrypt from 'bcryptjs';

// Mock the storage module to avoid actual database operations during tests
jest.mock('../server/storage', () => ({
  storage: {
    getUserByEmail: jest.fn(),
    getUserByUsername: jest.fn(),
    createUser: jest.fn(),
    getUserById: jest.fn(),
  }
}));

const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('Authentication System Tests', () => {
  
  describe('Password Hashing and Comparison', () => {
    const testPassword = 'TestPassword123!';
    
    test('should hash password correctly', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
      expect(hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')).toBe(true);
    });

    test('should verify correct password against hash', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isMatch = await comparePasswords(testPassword, hashedPassword);
      
      expect(isMatch).toBe(true);
    });

    test('should reject incorrect password against hash', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isMatch = await comparePasswords('WrongPassword123!', hashedPassword);
      
      expect(isMatch).toBe(false);
    });

    test('should handle empty passwords securely', async () => {
      await expect(hashPassword('')).resolves.toBeDefined();
      
      const hashedEmpty = await hashPassword('');
      const isMatch = await comparePasswords('', hashedEmpty);
      expect(isMatch).toBe(true);
    });
  });

  describe('User Registration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should register user with valid data', async () => {
      const testUser = createTestUser({
        email: 'newuser@test.com',
        username: 'newuser123'
      });

      // Mock storage responses
      mockedStorage.getUserByEmail.mockResolvedValue(undefined);
      mockedStorage.getUserByUsername.mockResolvedValue(undefined);
      mockedStorage.createUser.mockResolvedValue({
        id: 1,
        ...testUser,
        password: 'hashed_password',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        originalRole: null,
        company: null,
        position: null,
        location: null,
        phone: null,
        bio: null,
        profileImageUrl: null,
      });

      const result = await registerUser(testUser);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.username).toBe(testUser.username);
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(100); // JWT tokens are long
    });

    test('should reject registration with duplicate email', async () => {
      const testUser = createTestUser({
        email: 'existing@test.com'
      });

      // Mock existing user
      mockedStorage.getUserByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@test.com',
        username: 'existing',
        password: 'hashed',
        fullName: 'Existing User',
        role: 'entrepreneur',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        originalRole: null,
        company: null,
        position: null,
        location: null,
        phone: null,
        bio: null,
        profileImageUrl: null,
      });

      await expect(registerUser(testUser)).rejects.toThrow('Email is already registered');
    });

    test('should reject registration with duplicate username', async () => {
      const testUser = createTestUser({
        username: 'existinguser'
      });

      // Mock responses
      mockedStorage.getUserByEmail.mockResolvedValue(undefined);
      mockedStorage.getUserByUsername.mockResolvedValue({
        id: 1,
        email: 'different@test.com',
        username: 'existinguser',
        password: 'hashed',
        fullName: 'Existing User',
        role: 'entrepreneur',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        originalRole: null,
        company: null,
        position: null,
        location: null,
        phone: null,
        bio: null,
        profileImageUrl: null,
      });

      await expect(registerUser(testUser)).rejects.toThrow('Username is already taken');
    });

    test('should reject registration with invalid email format', async () => {
      const invalidUser = createTestUser({
        email: 'invalid-email-format'
      });

      await expect(registerUser(invalidUser)).rejects.toThrow();
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = createTestUser({
        password: '123' // Too short and weak
      });

      await expect(registerUser(weakPasswordUser)).rejects.toThrow();
    });

    test('should reject registration with invalid role', async () => {
      const invalidRoleUser = createTestUser({
        role: 'invalid_role' as any
      });

      await expect(registerUser(invalidRoleUser)).rejects.toThrow();
    });

    test('should handle missing required fields', async () => {
      const incompleteUser = {
        email: 'test@example.com',
        // Missing username, password, fullName, role
      };

      await expect(registerUser(incompleteUser)).rejects.toThrow();
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token structure', async () => {
      const testUser = createTestUser();
      
      mockedStorage.getUserByEmail.mockResolvedValue(undefined);
      mockedStorage.getUserByUsername.mockResolvedValue(undefined);
      mockedStorage.createUser.mockResolvedValue({
        id: 1,
        ...testUser,
        password: 'hashed_password',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        originalRole: null,
        company: null,
        position: null,
        location: null,
        phone: null,
        bio: null,
        profileImageUrl: null,
      });

      const result = await registerUser(testUser);
      const tokenParts = result.token.split('.');
      
      // JWT should have 3 parts: header.payload.signature
      expect(tokenParts).toHaveLength(3);
      
      // Decode payload to verify structure
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('role');
      expect(payload).toHaveProperty('iat'); // Issued at
      expect(payload).toHaveProperty('exp'); // Expiration
      
      // Verify payload content
      expect(payload.userId).toBe(1);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
    });
  });

  describe('Security Validations', () => {
    test('should reject extremely long inputs', async () => {
      const longString = 'a'.repeat(10000);
      const maliciousUser = createTestUser({
        username: longString,
        email: `${longString}@test.com`,
        fullName: longString
      });

      await expect(registerUser(maliciousUser)).rejects.toThrow();
    });

    test('should handle special characters safely', async () => {
      const specialCharUser = createTestUser({
        username: 'user<script>alert("xss")</script>',
        fullName: 'John "O\'Malley" & Associates'
      });

      mockedStorage.getUserByEmail.mockResolvedValue(null);
      mockedStorage.getUserByUsername.mockResolvedValue(null);
      mockedStorage.createUser.mockResolvedValue({
        id: 1,
        ...specialCharUser,
        password: 'hashed_password',
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        originalRole: null,
        company: null,
        position: null,
        location: null,
        phone: null,
        bio: null,
        profileImageUrl: null,
      });

      const result = await registerUser(specialCharUser);
      expect(result.user.username).toBe(specialCharUser.username);
      expect(result.user.fullName).toBe(specialCharUser.fullName);
    });
  });
});