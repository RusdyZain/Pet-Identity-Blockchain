import { AbiCoder, keccak256 } from "ethers";

const coder = AbiCoder.defaultAbiCoder();

const normalize = (value: string | null | undefined) => value ?? "";

export const buildPetDataHash = (params: {
  publicId: string;
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
  color: string;
  physicalMark: string;
}): string => {
  const birthDateTs = Math.floor(params.birthDate.getTime() / 1000);
  return keccak256(
    coder.encode(
      ["string", "string", "string", "string", "uint256", "string", "string"],
      [
        normalize(params.publicId),
        normalize(params.name),
        normalize(params.species),
        normalize(params.breed),
        birthDateTs,
        normalize(params.color),
        normalize(params.physicalMark),
      ]
    )
  );
};

export const buildMedicalRecordDataHash = (params: {
  petId: number;
  vaccineType: string;
  batchNumber: string;
  givenAt: Date;
  notes?: string | null;
  evidenceUrl?: string | null;
}): string => {
  const givenAtTs = Math.floor(params.givenAt.getTime() / 1000);
  return keccak256(
    coder.encode(
      [
        "uint256",
        "string",
        "string",
        "uint256",
        "string",
        "string",
      ],
      [
        params.petId,
        normalize(params.vaccineType),
        normalize(params.batchNumber),
        givenAtTs,
        normalize(params.notes),
        normalize(params.evidenceUrl),
      ]
    )
  );
};

export const buildCorrectionDataHash = (params: {
  petId: number;
  ownerId: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason?: string | null;
}): string => {
  return keccak256(
    coder.encode(
      ["uint256", "uint256", "string", "string", "string", "string"],
      [
        params.petId,
        params.ownerId,
        normalize(params.fieldName),
        normalize(params.oldValue),
        normalize(params.newValue),
        normalize(params.reason),
      ]
    )
  );
};
