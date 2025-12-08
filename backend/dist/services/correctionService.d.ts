import { CorrectionStatus } from '@prisma/client';
export declare const listCorrections: (status?: CorrectionStatus) => Promise<({
    pet: {
        name: string;
        id: number;
        publicId: string;
    };
    owner: {
        name: string;
        id: number;
    };
} & {
    id: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.CorrectionStatus;
    ownerId: number;
    petId: number;
    fieldName: string;
    oldValue: string;
    newValue: string;
    reviewedAt: Date | null;
    reason: string | null;
    reviewedById: number | null;
})[]>;
export declare const reviewCorrection: (params: {
    correctionId: number;
    reviewerId: number;
    status: CorrectionStatus;
    reason?: string;
}) => Promise<any>;
//# sourceMappingURL=correctionService.d.ts.map