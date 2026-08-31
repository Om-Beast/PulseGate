import { Request, Response } from 'express';
import { getAllUsers, getUserById, createUser } from '../services/userService';
import { ServiceResponse, ErrorResponse, User } from '../types';

const SERVICE_NAME = 'user-service';
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'user-service-unknown';

export function listUsers(_req: Request, res: Response): void {
  const users = getAllUsers();
  const response: ServiceResponse<User[]> = {
    success: true,
    data: users,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function getUser(req: Request, res: Response): void {
  const user = getUserById(req.params.id);

  if (!user) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: `User with id '${req.params.id}' not found`,
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(404).json(error);
    return;
  }

  const response: ServiceResponse<User> = {
    success: true,
    data: user,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function addUser(req: Request, res: Response): void {
  const { name, email, role } = req.body;

  if (!name || !email) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name and email are required',
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(400).json(error);
    return;
  }

  const user = createUser({ name, email, role });
  const response: ServiceResponse<User> = {
    success: true,
    data: user,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.status(201).json(response);
}
