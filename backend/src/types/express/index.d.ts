import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: number;
      role: UserRole;
    }

    interface Request {
      user?: UserContext;
    }
  }
}
