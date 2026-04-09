import { verifyToken } from '../services/auth-service';
import { TokenPayload } from '../models/token';
import { UserRole } from '../models/user';

export interface AuthRequest {
  headers: Record<string, string | undefined>;
  user?: TokenPayload;
}

export interface AuthResponse {
  status: (code: number) => AuthResponse;
  json: (body: unknown) => void;
}

export type NextFn = () => void;

export function authenticate(req: AuthRequest, res: AuthResponse, next: NextFn): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Token expired or invalid' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: AuthResponse, next: NextFn): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
