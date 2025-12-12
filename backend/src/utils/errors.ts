export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const assertRole = (role: string, allowed: string[]) => {
  if (!allowed.includes(role)) {
    throw new AppError("Forbidden", 403);
  }
};
