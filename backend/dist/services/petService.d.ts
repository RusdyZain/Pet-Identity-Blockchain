export declare const createPet: (ownerId: number, data: {
    name: string;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
}) => Promise<{
    name: string;
    id: number;
    createdAt: Date;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
    age: number | null;
    publicId: string;
    status: import(".prisma/client").$Enums.PetStatus;
    ownerId: number;
    updatedAt: Date;
}>;
export declare const listPets: (user: Express.UserContext, query?: {
    search?: string;
}) => Promise<{
    name: string;
    id: number;
    createdAt: Date;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
    age: number | null;
    publicId: string;
    status: import(".prisma/client").$Enums.PetStatus;
    ownerId: number;
    updatedAt: Date;
}[]>;
export declare const getPetById: (petId: number, user: Express.UserContext) => Promise<{
    owner: {
        name: string;
        email: string;
        id: number;
    };
} & {
    name: string;
    id: number;
    createdAt: Date;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
    age: number | null;
    publicId: string;
    status: import(".prisma/client").$Enums.PetStatus;
    ownerId: number;
    updatedAt: Date;
}>;
export declare const getOwnershipHistory: (petId: number, user: Express.UserContext) => Promise<({
    fromOwner: {
        name: string;
        email: string;
        id: number;
    };
    toOwner: {
        name: string;
        email: string;
        id: number;
    };
} & {
    id: number;
    petId: number;
    fromOwnerId: number;
    toOwnerId: number;
    transferredAt: Date | null;
})[]>;
export declare const initiateTransfer: (petId: number, currentOwnerId: number, newOwnerEmail: string) => Promise<{
    message: string;
}>;
export declare const acceptTransfer: (petId: number, newOwnerId: number) => Promise<{
    name: string;
    id: number;
    createdAt: Date;
    species: string;
    breed: string;
    birthDate: Date;
    color: string;
    physicalMark: string;
    age: number | null;
    publicId: string;
    status: import(".prisma/client").$Enums.PetStatus;
    ownerId: number;
    updatedAt: Date;
}>;
export declare const getTraceByPublicId: (publicId: string) => Promise<{
    name: string;
    species: string;
    breed: string;
    ownerName: string;
    vaccines: {
        vaccineType: string;
        lastGivenAt: Date;
        status: import(".prisma/client").$Enums.MedicalRecordStatus;
    }[];
}>;
export declare const createCorrectionRequest: (params: {
    petId: number;
    ownerId: number;
    fieldName: string;
    newValue: string;
    reason?: string;
}) => Promise<{
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
}>;
//# sourceMappingURL=petService.d.ts.map