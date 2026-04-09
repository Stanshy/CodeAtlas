import { findAll, findById, update } from '../services/user-service';
import { UpdateUserInput } from '../models/user';
import { MockRequest, MockResponse } from './auth';

// GET /users
export function listUsersHandler(req: MockRequest, res: MockResponse): void {
  const users = findAll();
  res.status(200).json({ data: users, total: users.length });
}

// GET /users/:id
export function getUserHandler(req: MockRequest, res: MockResponse): void {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'id param is required' });
    return;
  }

  const user = findById(id);
  if (!user) {
    res.status(404).json({ error: `User ${id} not found` });
    return;
  }

  res.status(200).json({ data: user });
}

// PUT /users/:id
export function updateUserHandler(req: MockRequest, res: MockResponse): void {
  const { id } = req.params;
  const input = req.body as UpdateUserInput;

  if (!id) {
    res.status(400).json({ error: 'id param is required' });
    return;
  }

  const updated = update(id, input);
  if (!updated) {
    res.status(404).json({ error: `User ${id} not found` });
    return;
  }

  res.status(200).json({ data: updated });
}

export const userRoutes = [
  { method: 'GET', path: '/users', handler: listUsersHandler },
  { method: 'GET', path: '/users/:id', handler: getUserHandler },
  { method: 'PUT', path: '/users/:id', handler: updateUserHandler },
];
