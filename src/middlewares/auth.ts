import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.security.apiSecretKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
