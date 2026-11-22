import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { STORAGE_DIR, Users, User } from './db';

const SECRET_FILE = path.join(STORAGE_DIR, '.jwt-secret');
const SECRET = process.env.JWT_SECRET || (() => {
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  const s = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, s);
  return s;
})();

export function signToken(user: User): string {
  return jwt.sign({ uid: user.id, email: user.email }, SECRET, { expiresIn: '30d' });
}

export interface AuthRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, SECRET) as { uid: string };
    const user = Users.byId(payload.uid);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
