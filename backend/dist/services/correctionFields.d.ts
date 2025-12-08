import { Pet } from '@prisma/client';
export declare const correctionFieldMap: {
    readonly name: "name";
    readonly species: "species";
    readonly breed: "breed";
    readonly birth_date: "birthDate";
    readonly color: "color";
    readonly physical_mark: "physicalMark";
    readonly age: "age";
};
export type CorrectionField = keyof typeof correctionFieldMap;
export declare const getPetFieldValue: (pet: Pet, fieldName: CorrectionField) => any;
export declare const parsePetFieldValue: (fieldName: CorrectionField, newValue: string) => string | number | Date;
//# sourceMappingURL=correctionFields.d.ts.map