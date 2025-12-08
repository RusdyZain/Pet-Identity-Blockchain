export declare const createNotification: (params: {
    userId: number;
    title: string;
    message: string;
}) => Promise<{
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    userId: number;
}>;
export declare const listNotifications: (userId: number) => Promise<{
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    userId: number;
}[]>;
export declare const markNotificationAsRead: (notificationId: number, userId: number) => Promise<{
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    userId: number;
}>;
//# sourceMappingURL=notificationService.d.ts.map