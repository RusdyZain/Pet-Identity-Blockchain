import { UserRole } from "../enums";

declare global {
  namespace Express {
    // Data user hasil decode JWT yang disimpan di req.user.
    interface UserContext {
      id: number;
      role: UserRole;
      walletAddress: string;
    }

    // Tambahkan properti user ke Request Express.
    interface Request {
      user?: UserContext;
    }
  }
}
