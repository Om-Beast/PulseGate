import { User } from '../types';

const users: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'ADMIN',
    createdAt: '2026-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'USER',
    createdAt: '2026-02-20T14:00:00Z',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'PREMIUM',
    createdAt: '2026-03-10T09:15:00Z',
  },
];

let nextId = 4;

export function getAllUsers(): User[] {
  return users;
}

export function getUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function createUser(data: { name: string; email: string; role?: User['role'] }): User {
  const user: User = {
    id: String(nextId++),
    name: data.name,
    email: data.email,
    role: data.role ?? 'USER',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}
