import { UserRole } from '@prisma/client';
export declare const registerUser: (params: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}) => Promise<{
    name: string;
    email: string;
    role: import(".prisma/client").$Enums.UserRole;
    id: number;
}>;
export declare const loginUser: (params: {
    email: string;
    password: string;
}) => Promise<{
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}>;
//# sourceMappingURL=authService.d.ts.map