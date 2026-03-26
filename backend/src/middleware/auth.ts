/**
 * Mock Authentication Middleware
 *
 * Simulates JWT-based auth for development. Any token starting with
 * "mock-jwt-token-" is accepted as valid.
 */

import { Request, Response, NextFunction } from "express";
import { User, LoginRequest } from "../../../shared/types";

// ============================================================
// Mock user database
// ============================================================

interface MockUserRecord {
  user: User;
  password: string;
}

// DEV ONLY — these mock users are for development/demo. Replace with real auth in production.
const MOCK_USERS: MockUserRecord[] = [
  {
    user: {
      id: "usr-1",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
    },
    password: "admin123",
  },
  {
    user: {
      id: "usr-2",
      email: "user@example.com",
      name: "Regular User",
      role: "viewer",
    },
    password: "user123",
  },
  {
    user: {
      id: "usr-3",
      email: "user1@example.com",
      name: "User1",
      role: "operator",
    },
    password: "admin123",
  },
  {
    user: {
      id: "usr-4",
      email: "user2@example.com",
      name: "User2",
      role: "viewer",
    },
    password: "admin123",
  },
];

// ============================================================
// Token helpers
// ============================================================

const TOKEN_PREFIX = "mock-jwt-token-";

/** Generate a mock JWT token for a user */
export function generateMockToken(userId: string): string {
  return `${TOKEN_PREFIX}${userId}`;
}

/** Extract user id from a mock token, or null if invalid */
function parseToken(token: string): string | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  return token.slice(TOKEN_PREFIX.length);
}

// ============================================================
// Login helper
// ============================================================

/**
 * Validate login credentials and return user + token,
 * or null if credentials are invalid.
 */
export function validateLogin(
  credentials: LoginRequest
): { token: string; user: User } | null {
  const record = MOCK_USERS.find(
    (r) =>
      r.user.email === credentials.email &&
      r.password === credentials.password
  );
  if (!record) return null;

  const token = generateMockToken(record.user.id);
  return { token, user: record.user };
}

// ============================================================
// Express middleware
// ============================================================

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware that validates the Authorization header.
 * Attaches req.user if valid, otherwise returns 401.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const userId = parseToken(token);

  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  // Find the user by ID
  const record = MOCK_USERS.find((r) => r.user.id === userId);
  if (!record) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = record.user;
  next();
}
