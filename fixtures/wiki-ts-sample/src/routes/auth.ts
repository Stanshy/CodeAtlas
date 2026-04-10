import { login, register } from '../services/auth-service';
import { CreateUserInput } from '../models/user';

export interface RouteHandler {
  method: string;
  path: string;
  handler: (req: MockRequest, res: MockResponse) => void;
}

export interface MockRequest {
  body: Record<string, unknown>;
  params: Record<string, string>;
}

export interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: unknown) => void;
}

// POST /auth/login
export function loginHandler(req: MockRequest, res: MockResponse): void {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const token = login(email, password);
  if (!token) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.status(200).json({ data: token });
}

// POST /auth/register
export function registerHandler(req: MockRequest, res: MockResponse): void {
  const input = req.body as CreateUserInput;
  if (!input.email || !input.password || !input.displayName) {
    res.status(400).json({ error: 'email, password, and displayName are required' });
    return;
  }

  try {
    const user = register(input);
    res.status(201).json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(409).json({ error: message });
  }
}

export const authRoutes: RouteHandler[] = [
  { method: 'POST', path: '/auth/login', handler: loginHandler },
  { method: 'POST', path: '/auth/register', handler: registerHandler },
];
