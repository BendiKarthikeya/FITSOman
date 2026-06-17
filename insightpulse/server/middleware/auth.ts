import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { userRoles, rolePermissions, permissions, roles } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Export as authenticateToken for compatibility with routes.ts
export const authenticateToken = requireAuth;

/**
 * Middleware to check for specific role
 */
export const requireRole = (requiredRole: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check for specific RBAC permission
 * Checks if user has the required permission through assigned roles
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
      // Admins and Superusers bypass all permission checks
      if (req.user.role === 'admin' || req.user.role === 'superuser') {
        return next();
      }

      const userId = req.user.id;
      const permissionCode = `${resource}.${action}`;

      // Get all roles assigned to user
      const userRolesList = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, userId));

      const roleIds = userRolesList.map(ur => ur.roleId);

      // If user has no roles, deny access
      if (roleIds.length === 0) {
        return res.status(403).json({ message: `Permission denied: ${permissionCode} not granted` });
      }

      // Get all permissions for these roles
      const userPermissions = await db
        .select({ permissionCode: permissions.code })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds as string[]));

      const hasPermission = userPermissions.some(p => p.permissionCode === permissionCode);

      if (!hasPermission) {
        return res.status(403).json({ message: `Permission denied: ${permissionCode} not granted` });
      }

      next();
    } catch (error) {
      
      console.error('Server error:', res.status); res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};
