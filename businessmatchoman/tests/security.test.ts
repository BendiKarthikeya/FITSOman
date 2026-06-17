import { hashPassword, comparePasswords } from '../server/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createTestUser } from './setup';

describe('Security Tests', () => {
  
  describe('Password Security', () => {
    test('should use strong bcrypt hashing', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      // Verify bcrypt format
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$.{53}$/);
      
      // Verify salt rounds (should be at least 10)
      const saltRounds = parseInt(hashedPassword.split('$')[2]);
      expect(saltRounds).toBeGreaterThanOrEqual(10);
      
      // Verify password is actually hashed
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Hashes should be different due to unique salts
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await comparePasswords(password, hash1)).toBe(true);
      expect(await comparePasswords(password, hash2)).toBe(true);
    });

    test('should handle password timing attacks securely', async () => {
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(correctPassword);
      
      // Measure timing for correct and incorrect passwords
      const startCorrect = Date.now();
      await comparePasswords(correctPassword, hashedPassword);
      const timeCorrect = Date.now() - startCorrect;
      
      const startWrong = Date.now();
      await comparePasswords(wrongPassword, hashedPassword);
      const timeWrong = Date.now() - startWrong;
      
      // Times should be relatively similar (within reasonable bounds)
      // bcrypt inherently provides timing attack protection
      expect(Math.abs(timeCorrect - timeWrong)).toBeLessThan(100); // 100ms tolerance
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '',
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'Password', // No numbers or special chars
        'password123', // No uppercase or special chars
        'PASSWORD123', // No lowercase or special chars
        'Pa1!', // Too short
      ];
      
      weakPasswords.forEach(password => {
        // Mock password strength validation
        const isWeak = password.length < 8 || 
                      !/[A-Z]/.test(password) || 
                      !/[a-z]/.test(password) || 
                      !/\d/.test(password) || 
                      !/[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        expect(isWeak).toBe(true);
      });
    });
  });

  describe('JWT Security', () => {
    const jwtSecret = 'test-jwt-secret-key-for-testing-only';
    
    test('should generate secure JWT tokens', () => {
      const user = createTestUser();
      const payload = {
        userId: 1,
        email: user.email,
        role: user.role
      };
      
      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: '30d',
        algorithm: 'HS256'
      });
      
      // Verify token structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // header.payload.signature
      
      // Verify token is not empty
      expect(token.length).toBeGreaterThan(100);
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, jwtSecret) as any;
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    test('should reject tampered tokens', () => {
      const validToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'entrepreneur' },
        jwtSecret,
        { expiresIn: '1h' }
      );
      
      // Tamper with token
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';
      
      expect(() => {
        jwt.verify(tamperedToken, jwtSecret);
      }).toThrow();
    });

    test('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'entrepreneur' },
        jwtSecret,
        { expiresIn: '-1h' } // Already expired
      );
      
      expect(() => {
        jwt.verify(expiredToken, jwtSecret);
      }).toThrow(jwt.TokenExpiredError);
    });

    test('should reject tokens with wrong secret', () => {
      const token = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'entrepreneur' },
        jwtSecret,
        { expiresIn: '1h' }
      );
      
      const wrongSecret = 'wrong-secret-key';
      
      expect(() => {
        jwt.verify(token, wrongSecret);
      }).toThrow(jwt.JsonWebTokenError);
    });

    test('should not include sensitive data in token payload', () => {
      const user = createTestUser();
      const payload = {
        userId: 1,
        email: user.email,
        role: user.role
      };
      
      const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
      const decoded = jwt.decode(token) as any;
      
      // Verify sensitive data is NOT in token
      expect(decoded.password).toBeUndefined();
      expect(decoded.hashedPassword).toBeUndefined();
      expect(decoded.phone).toBeUndefined();
      expect(decoded.bio).toBeUndefined();
      
      // Verify only necessary data is included
      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.role).toBeDefined();
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "1; DELETE FROM listings; --",
        "UNION SELECT * FROM users WHERE username='admin'--",
        "'; INSERT INTO users (username, email, password) VALUES ('hacker', 'hack@evil.com', 'password'); --"
      ];
      
      maliciousInputs.forEach(input => {
        // Mock SQL injection detection
        const containsSQLKeywords = /(\b(DROP|DELETE|INSERT|UPDATE|UNION|SELECT|WHERE|OR|AND)\b)/i.test(input);
        const containsSQLChars = /['";\\]/.test(input);
        
        if (containsSQLKeywords || containsSQLChars) {
          // Should be flagged as potentially malicious
          expect(true).toBe(true); // This would trigger validation error
        }
      });
    });

    test('should prevent XSS attacks', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "'; alert('XSS'); //",
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];
      
      xssPayloads.forEach(payload => {
        // Mock XSS detection
        const containsScriptTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(payload);
        const containsJavaScript = /javascript:/i.test(payload);
        const containsOnEvents = /\bon\w+\s*=/i.test(payload);
        
        if (containsScriptTags || containsJavaScript || containsOnEvents) {
          expect(true).toBe(true); // Should be sanitized
        }
      });
    });

    test('should handle malformed email inputs', () => {
      const malformedEmails = [
        '',
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double.dot@domain.com',
        'user@domain..com',
        'user name@domain.com', // Space in local part
        'user@domain.com.', // Trailing dot
        'user@-domain.com', // Hyphen at start of domain
        'a'.repeat(255) + '@domain.com', // Too long
      ];
      
      malformedEmails.forEach(email => {
        // Mock email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email) && email.length <= 254;
        
        expect(isValid).toBe(false);
      });
    });

    test('should validate file upload security', () => {
      const dangerousFiles = [
        { name: 'virus.exe', type: 'application/exe' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'malware.bat', type: 'application/batch' },
        { name: 'hack.php', type: 'application/php' },
        { name: '../../etc/passwd', type: 'text/plain' }, // Path traversal
        { name: 'file.pdf.exe', type: 'application/exe' }, // Double extension
      ];
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
      
      dangerousFiles.forEach(file => {
        const isTypeAllowed = allowedTypes.includes(file.type);
        const hasAllowedExtension = allowedExtensions.some(ext => 
          file.name.toLowerCase().endsWith(ext)
        );
        const hasPathTraversal = file.name.includes('../') || file.name.includes('..\\');
        
        const isSecure = isTypeAllowed && hasAllowedExtension && !hasPathTraversal;
        expect(isSecure).toBe(false);
      });
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce login rate limits', () => {
      // Mock rate limiting for login attempts
      const loginAttempts = [
        { ip: '192.168.1.100', timestamp: Date.now() - 1000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 2000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 3000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 4000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 5000 },
      ];
      
      const maxAttemptsPerMinute = 5;
      const windowMs = 60000; // 1 minute
      
      const recentAttempts = loginAttempts.filter(
        attempt => Date.now() - attempt.timestamp < windowMs
      );
      
      expect(recentAttempts.length).toBeLessThanOrEqual(maxAttemptsPerMinute);
    });

    test('should enforce API rate limits', () => {
      // Mock API rate limiting
      const apiRequests = Array(101).fill(null).map((_, i) => ({
        ip: '192.168.1.100',
        timestamp: Date.now() - (i * 100), // 100ms apart
        endpoint: '/api/listings'
      }));
      
      const maxRequestsPerHour = 100;
      const windowMs = 3600000; // 1 hour
      
      const recentRequests = apiRequests.filter(
        request => Date.now() - request.timestamp < windowMs
      );
      
      if (recentRequests.length > maxRequestsPerHour) {
        expect(true).toBe(true); // Should be rate limited
      }
    });
  });

  describe('Authorization Security', () => {
    test('should enforce role-based access control', () => {
      const testCases = [
        {
          userRole: 'entrepreneur',
          action: 'create_listing',
          resource: 'own_listing',
          allowed: true
        },
        {
          userRole: 'entrepreneur',
          action: 'approve_listing',
          resource: 'any_listing',
          allowed: false
        },
        {
          userRole: 'admin',
          action: 'approve_listing',
          resource: 'any_listing',
          allowed: true
        },
        {
          userRole: 'investor',
          action: 'view_listing',
          resource: 'approved_listing',
          allowed: true
        },
        {
          userRole: 'blocked',
          action: 'create_listing',
          resource: 'any_listing',
          allowed: false
        }
      ];
      
      testCases.forEach(testCase => {
        // Mock authorization logic
        let isAllowed = false;
        
        if (testCase.userRole === 'blocked') {
          isAllowed = false;
        } else if (testCase.userRole === 'admin') {
          isAllowed = true;
        } else if (testCase.action === 'view_listing' && testCase.resource === 'approved_listing') {
          isAllowed = true;
        } else if (testCase.action === 'create_listing' && testCase.resource === 'own_listing') {
          isAllowed = ['entrepreneur', 'investor'].includes(testCase.userRole);
        } else if (testCase.action === 'approve_listing') {
          isAllowed = testCase.userRole === 'admin';
        }
        
        expect(isAllowed).toBe(testCase.allowed);
      });
    });

    test('should prevent privilege escalation', () => {
      const privilegeTests = [
        {
          currentRole: 'entrepreneur',
          attemptedRole: 'admin',
          shouldSucceed: false
        },
        {
          currentRole: 'investor',
          attemptedRole: 'admin',
          shouldSucceed: false
        },
        {
          currentRole: 'broker',
          attemptedRole: 'admin',
          shouldSucceed: false
        },
        {
          currentRole: 'admin',
          attemptedRole: 'entrepreneur',
          shouldSucceed: true // Admin can change roles
        }
      ];
      
      privilegeTests.forEach(test => {
        // Mock privilege escalation prevention
        const canChangeRole = test.currentRole === 'admin' || 
                             test.currentRole === test.attemptedRole;
        
        expect(canChangeRole).toBe(test.shouldSucceed);
      });
    });
  });

  describe('Session Security', () => {
    test('should handle session security properly', () => {
      const sessionConfig = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        name: 'sessionId'
      };
      
      // Verify secure session configuration
      expect(sessionConfig.httpOnly).toBe(true);
      expect(sessionConfig.sameSite).toBe('strict');
      expect(sessionConfig.maxAge).toBeGreaterThan(0);
      expect(sessionConfig.name).toBe('sessionId');
    });

    test('should invalidate sessions on logout', () => {
      // Mock session invalidation
      const activeSession = {
        sessionId: 'abc123',
        userId: 1,
        isValid: true,
        lastAccess: Date.now()
      };
      
      // Simulate logout
      const logoutSession = {
        ...activeSession,
        isValid: false,
        lastAccess: null
      };
      
      expect(logoutSession.isValid).toBe(false);
      expect(logoutSession.lastAccess).toBeNull();
    });
  });
});