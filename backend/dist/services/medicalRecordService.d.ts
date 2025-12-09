import { MedicalRecordStatus } from '@prisma/client';
export declare const createMedicalRecord: (params: {
    petId: number;
    clinicId: number;
    vaccineType: string;
    batchNumber: string;
    givenAt: Date;
    notes?: string;
    evidenceUrl?: string;
}) => Promise<{
    id: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MedicalRecordStatus;
    petId: number;
    givenAt: Date;
    clinicId: number;
    vaccineType: string;
    batchNumber: string;
    notes: string | null;
    evidenceUrl: string | null;
    verifiedById: number | null;
    verifiedAt: Date | null;
}>;
export declare const listMedicalRecords: (petId: number, user: Express.UserContext) => Promise<{
    id: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MedicalRecordStatus;
    petId: number;
    givenAt: Date;
    clinicId: number;
    vaccineType: string;
    batchNumber: string;
    notes: string | null;
    evidenceUrl: string | null;
    verifiedById: number | null;
    verifiedAt: Date | null;
}[]>;
export declare const listPendingRecordsForClinic: (clinicId: number) => Promise<({
    pet: {
        name: string;
        id: number;
        publicId: string;
    };
} & {
    id: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MedicalRecordStatus;
    petId: number;
    givenAt: Date;
    clinicId: number;
    vaccineType: string;
    batchNumber: string;
    notes: string | null;
    evidenceUrl: string | null;
    verifiedById: number | null;
    verifiedAt: Date | null;
})[]>;
export declare const verifyMedicalRecord: (recordId: number, reviewerId: number, status: MedicalRecordStatus) => Promise<{
    id: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MedicalRecordStatus;
    petId: number;
    givenAt: Date;
    clinicId: number;
    vaccineType: string;
    batchNumber: string;
    notes: string | null;
    evidenceUrl: string | null;
    verifiedById: number | null;
    verifiedAt: Date | null;
}>;
//# sourceMappingURL=medicalRecordService.d.ts.map