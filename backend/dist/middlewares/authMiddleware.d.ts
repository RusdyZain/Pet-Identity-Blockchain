import { NextFunction, Request, Response } from 'express';
export declare const authenticate: (options?: {
    optional?: boolean;
}) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const authorize: (roles: string[]) => (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=authMiddleware.d.ts.map