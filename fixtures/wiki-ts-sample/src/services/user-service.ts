import { User, UpdateUserInput, UserPublic, toPublicUser } from '../models/user';

const USER_STORE: Map<string, User> = new Map();

export function findAll(): UserPublic[] {
  return Array.from(USER_STORE.values()).map(toPublicUser);
}

export function findById(id: string): UserPublic | null {
  const user = USER_STORE.get(id);
  return user ? toPublicUser(user) : null;
}

export function update(id: string, input: UpdateUserInput): UserPublic | null {
  const user = USER_STORE.get(id);
  if (!user) return null;

  const updated: User = {
    ...user,
    displayName: input.displayName ?? user.displayName,
    role: input.role ?? user.role,
    updatedAt: new Date(),
  };

  USER_STORE.set(id, updated);
  return toPublicUser(updated);
}

export function deleteById(id: string): boolean {
  return USER_STORE.delete(id);
}

export function count(): number {
  return USER_STORE.size;
}

export function existsByEmail(email: string): boolean {
  return Array.from(USER_STORE.values()).some((u) => u.email === email);
}
