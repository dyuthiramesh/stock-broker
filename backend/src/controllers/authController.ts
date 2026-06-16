import { Request, Response } from 'express';
import { loginSchema, signToken } from '../services/authService';
import { UserModel } from '../models/user';

export function login(req: Request, res: Response): void {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { email } = result.data;
  const user = UserModel.findOrCreate(email);
  const token = signToken({ userId: user.id, email: user.email });

  res.json({
    token,
    user: { id: user.id, email: user.email },
  });
}
