import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Проверка что пользователь авторизован
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  req.user = payload;
  next();
};

// Проверка роли (доступно только админу)
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
  }

  next();
};

// Проверка роли (доступно админу или оператору)
export const requireAdminOrOperator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или оператора' });
  }

  next();
};