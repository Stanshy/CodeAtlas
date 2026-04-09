import { User, CreateUserInput, UserPublic, toPublicUser } from '../models/user';
import { Token, TokenPayload, createTokenResponse } from '../models/token';

const USER_STORE: Map<string, User> = new Map();
const TOKEN_SECRET = 'fixture-secret-key';
const TOKEN_EXPIRY = 3600;

export function login(email: string, password: string): Token | null {
  const user = Array.from(USER_STORE.values()).find((u) => u.email === email);
  if (!user) return null;

  const hash = hashPassword(password);
  if (user.passwordHash !== hash) return null;

  const accessToken = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateToken({ userId: user.id, email: user.email, role: user.role });
  return createTokenResponse(accessToken, refreshToken, TOKEN_EXPIRY);
}

export function register(input: CreateUserInput): UserPublic {
  const existing = Array.from(USER_STORE.values()).find((u) => u.email === input.email);
  if (existing) throw new Error('Email already registered');

  const user: User = {
    id: generateId(),
    email: input.email,
    passwordHash: hashPassword(input.password),
    displayName: input.displayName,
    role: input.role ?? 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  USER_STORE.set(user.id, user);
  return toPublicUser(user);
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const full: TokenPayload = { ...payload, iat: now, exp: now + TOKEN_EXPIRY };
  return Buffer.from(JSON.stringify(full)).toString('base64');
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded as TokenPayload;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `hashed_${hash}_${TOKEN_SECRET}`;
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
