import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/errors";

loadEnv();

const { BLOCKCHAIN_RPC_URL, PET_IDENTITY_ADDRESS } = process.env;

if (!BLOCKCHAIN_RPC_URL) {
  throw new Error("Missing BLOCKCHAIN_RPC_URL in environment variables.");
}
if (!PET_IDENTITY_ADDRESS) {
  throw new Error("Missing PET_IDENTITY_ADDRESS in environment variables.");
}

const provider = new JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const contractAddress = getAddress(PET_IDENTITY_ADDRESS);
const contractAddressLower = contractAddress.toLowerCase();

const artifactPath = path.join(
  __dirname,
  "../../artifacts/contracts/PetIdentityRegistry.sol/PetIdentityRegistry.json"
);
const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

type PetIdentityContract = Contract & {
  getPetIdByHash: (dataHash: string) => Promise<bigint>;
  getPet: (petId: number) => Promise<unknown>;
  getMedicalRecords: (petId: number) => Promise<unknown[]>;
};

const contract: PetIdentityContract = new Contract(
  contractAddress,
  artifactJson.abi,
  provider
) as PetIdentityContract;

const LOCAL_CHAIN_IDS = new Set([1337, 31337]);
let cachedChainId: number | null = null;

export type TxMetadata = {
  txHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  from: string;
};

type ParsedEvent = {
  args: any;
};

const normalizeWalletAddress = (walletAddress: string) => {
  try {
    return getAddress(walletAddress);
  } catch (_error) {
    throw new AppError("Invalid wallet address", 400);
  }
};

const getChainId = async (): Promise<number> => {
  if (cachedChainId !== null) {
    return cachedChainId;
  }
  const network = await provider.getNetwork();
  cachedChainId = Number(network.chainId);
  return cachedChainId;
};

const ensureContractTarget = (toAddress: string | null, txHash: string) => {
  if (!toAddress || toAddress.toLowerCase() !== contractAddressLower) {
    throw new AppError(
      `Transaction ${txHash} is not sent to PetIdentityRegistry contract`,
      400
    );
  }
};

const toNumber = (value: unknown, label: string) => {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    return Number(value);
  }
  throw new AppError(`Unable to decode ${label} from transaction event`, 400);
};

const getMinedReceipt = async (txHash: string) => {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new AppError("Transaction not found or not mined yet", 400);
  }
  if (receipt.status !== 1) {
    throw new AppError("Transaction failed on-chain", 400);
  }
  ensureContractTarget(receipt.to, txHash);
  return receipt;
};

const buildTxMetadata = async (txHash: string): Promise<TxMetadata> => {
  const receipt = await getMinedReceipt(txHash);
  const block = await provider.getBlock(receipt.blockNumber);
  if (!block) {
    throw new AppError("Block not found for transaction", 500);
  }
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockTimestamp: new Date(Number(block.timestamp) * 1000),
    from: normalizeWalletAddress(receipt.from),
  };
};

const assertTxSender = (sender: string, expectedWalletAddress: string) => {
  const expected = normalizeWalletAddress(expectedWalletAddress);
  if (sender.toLowerCase() !== expected.toLowerCase()) {
    throw new AppError("Transaction sender does not match authenticated wallet", 403);
  }
};

const parseEventFromReceipt = async (
  txHash: string,
  eventName: string
): Promise<ParsedEvent> => {
  const receipt = await getMinedReceipt(txHash);
  const eventFragment = contract.interface.getEvent(eventName);
  if (!eventFragment) {
    throw new AppError(`Event ${eventName} missing in contract ABI`, 500);
  }
  const topicHash = eventFragment.topicHash;
  const matchedLog = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === contractAddressLower &&
      log.topics?.[0] === topicHash
  );

  if (!matchedLog) {
    throw new AppError(`Event ${eventName} not found in transaction logs`, 400);
  }

  const parsed = contract.interface.parseLog(matchedLog);
  if (!parsed) {
    throw new AppError(`Failed to parse event ${eventName}`, 500);
  }

  return parsed;
};

const decodeAddressArg = (value: unknown) => {
  if (typeof value !== "string") {
    throw new AppError("Invalid address in transaction event", 400);
  }
  return normalizeWalletAddress(value);
};

const decodeBytes32Arg = (value: unknown) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError("Invalid data hash in transaction event", 400);
  }
  return value.toLowerCase();
};

const encodeTxData = (functionName: string, args: unknown[]) => ({
  to: contractAddress,
  data: contract.interface.encodeFunctionData(functionName, args),
});

export const isLocalBlockchain = async (): Promise<boolean> => {
  const chainId = await getChainId();
  return LOCAL_CHAIN_IDS.has(chainId);
};

export const getPetIdentityContractAddress = () => contractAddress;

export const getBackendChainId = async () => getChainId();

export const prepareRegisterPetTx = (dataHash: string) =>
  encodeTxData("registerPet", [dataHash]);

export const prepareAddMedicalRecordTx = (petId: number, dataHash: string) =>
  encodeTxData("addMedicalRecord", [petId, dataHash]);

export const prepareVerifyMedicalRecordTx = (
  recordId: number,
  status: number
) => encodeTxData("verifyMedicalRecord", [recordId, status]);

export const prepareUpdatePetBasicDataTx = (petId: number, dataHash: string) =>
  encodeTxData("updatePetBasicData", [petId, dataHash]);

export const confirmRegisterPetTx = async (params: {
  txHash: string;
  expectedDataHash: string;
  expectedWalletAddress: string;
}) => {
  const [metadata, event] = await Promise.all([
    buildTxMetadata(params.txHash),
    parseEventFromReceipt(params.txHash, "PetRegistered"),
  ]);
  assertTxSender(metadata.from, params.expectedWalletAddress);

  const petId = toNumber(event.args?.petId ?? event.args?.[0], "petId");
  const dataHash = decodeBytes32Arg(event.args?.dataHash ?? event.args?.[1]);
  const actor = decodeAddressArg(
    event.args?.verifiedBy ?? event.args?.actor ?? event.args?.[3]
  );
  const expectedDataHash = params.expectedDataHash.toLowerCase();
  const expectedWallet = normalizeWalletAddress(params.expectedWalletAddress);

  if (dataHash !== expectedDataHash) {
    throw new AppError("dataHash mismatch with on-chain event", 400);
  }
  if (actor.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new AppError("Event actor mismatch with authenticated wallet", 403);
  }

  return {
    petId,
    metadata,
  };
};

export const confirmAddMedicalRecordTx = async (params: {
  txHash: string;
  expectedPetId: number;
  expectedDataHash: string;
  expectedWalletAddress: string;
}) => {
  const [metadata, event] = await Promise.all([
    buildTxMetadata(params.txHash),
    parseEventFromReceipt(params.txHash, "MedicalRecordAdded"),
  ]);
  assertTxSender(metadata.from, params.expectedWalletAddress);

  const recordId = toNumber(event.args?.recordId ?? event.args?.[0], "recordId");
  const petId = toNumber(event.args?.petId ?? event.args?.[1], "petId");
  const dataHash = decodeBytes32Arg(event.args?.dataHash ?? event.args?.[2]);
  const actor = decodeAddressArg(
    event.args?.verifiedBy ?? event.args?.actor ?? event.args?.[4]
  );
  const expectedWallet = normalizeWalletAddress(params.expectedWalletAddress);

  if (petId !== params.expectedPetId) {
    throw new AppError("petId mismatch with on-chain event", 400);
  }
  if (dataHash !== params.expectedDataHash.toLowerCase()) {
    throw new AppError("dataHash mismatch with on-chain event", 400);
  }
  if (actor.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new AppError("Event actor mismatch with authenticated wallet", 403);
  }

  return {
    recordId,
    metadata,
  };
};

export const confirmVerifyMedicalRecordTx = async (params: {
  txHash: string;
  expectedRecordId: number;
  expectedStatus: number;
  expectedWalletAddress: string;
}) => {
  const [metadata, event] = await Promise.all([
    buildTxMetadata(params.txHash),
    parseEventFromReceipt(params.txHash, "MedicalRecordReviewed"),
  ]);
  assertTxSender(metadata.from, params.expectedWalletAddress);

  const recordId = toNumber(event.args?.recordId ?? event.args?.[0], "recordId");
  const status = toNumber(event.args?.status ?? event.args?.[3], "status");
  const actor = decodeAddressArg(
    event.args?.verifiedBy ?? event.args?.actor ?? event.args?.[4]
  );
  const expectedWallet = normalizeWalletAddress(params.expectedWalletAddress);

  if (recordId !== params.expectedRecordId) {
    throw new AppError("recordId mismatch with on-chain event", 400);
  }
  if (status !== params.expectedStatus) {
    throw new AppError("status mismatch with on-chain event", 400);
  }
  if (actor.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new AppError("Event actor mismatch with authenticated wallet", 403);
  }

  return {
    metadata,
  };
};

export const confirmUpdatePetBasicDataTx = async (params: {
  txHash: string;
  expectedPetId: number;
  expectedDataHash: string;
  expectedWalletAddress: string;
}) => {
  const [metadata, event] = await Promise.all([
    buildTxMetadata(params.txHash),
    parseEventFromReceipt(params.txHash, "PetUpdated"),
  ]);
  assertTxSender(metadata.from, params.expectedWalletAddress);

  const petId = toNumber(event.args?.petId ?? event.args?.[0], "petId");
  const dataHash = decodeBytes32Arg(event.args?.dataHash ?? event.args?.[1]);
  const actor = decodeAddressArg(
    event.args?.verifiedBy ?? event.args?.actor ?? event.args?.[3]
  );
  const expectedWallet = normalizeWalletAddress(params.expectedWalletAddress);

  if (petId !== params.expectedPetId) {
    throw new AppError("petId mismatch with on-chain event", 400);
  }
  if (dataHash !== params.expectedDataHash.toLowerCase()) {
    throw new AppError("dataHash mismatch with on-chain event", 400);
  }
  if (actor.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new AppError("Event actor mismatch with authenticated wallet", 403);
  }

  return {
    metadata,
  };
};

export async function getPet(petId: number): Promise<unknown> {
  return contract.getPet(petId);
}

export async function getMedicalRecords(petId: number): Promise<unknown[]> {
  return contract.getMedicalRecords(petId);
}

export async function getPetIdByHash(dataHash: string): Promise<bigint> {
  return contract.getPetIdByHash(dataHash);
}
