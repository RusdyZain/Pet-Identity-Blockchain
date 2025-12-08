import type { StringValue } from 'ms';
export interface JwtPayload {
    userId: number;
    role: string;
}
export declare const signJwt: (payload: JwtPayload, expiresIn?: StringValue | number) => string;
export declare const verifyJwt: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map