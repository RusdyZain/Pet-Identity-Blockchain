import { vi } from "vitest";

type MockState = {
  petSequence: number;
  recordSequence: number;
};

const state: MockState = {
  petSequence: 0,
  recordSequence: 0,
};

const buildMetadata = (txHash: string, from: string) => ({
  txHash,
  blockNumber: 123,
  blockTimestamp: new Date("2026-01-01T00:00:00.000Z"),
  from,
});

export const resetMockPetIdentityClientState = () => {
  state.petSequence = 0;
  state.recordSequence = 0;
};

vi.mock("../../../src/blockchain/petIdentityClient", () => ({
  prepareRegisterPetTx: (dataHash: string) => ({
    to: "0x0000000000000000000000000000000000000001",
    data: `0xregister${dataHash.slice(2, 10)}`,
  }),
  prepareAddMedicalRecordTx: (petId: number, dataHash: string) => ({
    to: "0x0000000000000000000000000000000000000001",
    data: `0xmedical${petId.toString(16)}${dataHash.slice(2, 8)}`,
  }),
  prepareVerifyMedicalRecordTx: (recordId: number, status: number) => ({
    to: "0x0000000000000000000000000000000000000001",
    data: `0xverify${recordId.toString(16)}${status.toString(16)}`,
  }),
  prepareUpdatePetBasicDataTx: (petId: number, dataHash: string) => ({
    to: "0x0000000000000000000000000000000000000001",
    data: `0xupdate${petId.toString(16)}${dataHash.slice(2, 8)}`,
  }),
  prepareTransferOwnershipTx: (petId: number, newOwnerWalletAddress: string) => ({
    to: "0x0000000000000000000000000000000000000001",
    data: `0xtransfer${petId.toString(16)}${newOwnerWalletAddress.slice(2, 10)}`,
  }),
  confirmRegisterPetTx: async (params: {
    txHash: string;
    expectedWalletAddress: string;
  }) => {
    state.petSequence += 1;
    return {
      petId: state.petSequence,
      metadata: buildMetadata(params.txHash, params.expectedWalletAddress),
    };
  },
  confirmAddMedicalRecordTx: async (params: {
    txHash: string;
    expectedWalletAddress: string;
  }) => {
    state.recordSequence += 1;
    return {
      recordId: state.recordSequence,
      metadata: buildMetadata(params.txHash, params.expectedWalletAddress),
    };
  },
  confirmVerifyMedicalRecordTx: async (params: {
    txHash: string;
    expectedWalletAddress: string;
  }) => ({
    metadata: buildMetadata(params.txHash, params.expectedWalletAddress),
  }),
  confirmUpdatePetBasicDataTx: async (params: {
    txHash: string;
    expectedWalletAddress: string;
  }) => ({
    metadata: buildMetadata(params.txHash, params.expectedWalletAddress),
  }),
  confirmTransferOwnershipTx: async (params: {
    txHash: string;
    expectedFromWalletAddress: string;
  }) => ({
    metadata: buildMetadata(params.txHash, params.expectedFromWalletAddress),
  }),
  getPet: async () => ({}),
  getMedicalRecords: async () => [],
  getPetIdByHash: async () => 1n,
  isLocalBlockchain: async () => true,
  getPetIdentityContractAddress: () =>
    "0x0000000000000000000000000000000000000001",
  getBackendChainId: async () => 1337,
}));
