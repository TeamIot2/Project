/**
 * Authentication middleware backed by persistent application users.
 */

import { Request, Response, NextFunction } from "express";
import { User, LoginRequest } from "../../../shared/types";
import { getUserByIdFromDb, validateUserCredentialsInDb } from "../services/database";

const TOKEN_PREFIX = "team2app-token-";

export function generateToken(userId: string): string {
  return `${TOKEN_PREFIX}${userId}`;
}

function parseToken(token: string): string | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  return token.slice(TOKEN_PREFIX.length);
}

export function validateLogin(
  credentials: LoginRequest
): { token: string; user: User } | null {
  const user = validateUserCredentialsInDb(credentials.email, credentials.password);
  if (!user) return null;

  const token = generateToken(user.id);
  return { token, user };
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

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

  const token = authHeader.slice(7);
  const userId = parseToken(token);

  if (!userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = getUserByIdFromDb(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = user;
  next();
}
