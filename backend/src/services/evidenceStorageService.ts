import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ENV } from "../config/env";
import { AppError } from "../utils/errors";

type UploadEvidenceParams = {
  file: Express.Multer.File;
  requestBaseUrl: string;
};

type UploadEvidenceResult = {
  storage: "local" | "ipfs";
  url: string;
  cid?: string;
};

const sanitizeFileExtension = (originalName: string) => {
  const extension = path.extname(originalName).toLowerCase();
  if (!extension) {
    return ".bin";
  }
  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) {
    return ".bin";
  }
  return extension;
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const resolveLocalStoragePath = () => {
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const evidenceRoot = path.resolve(process.cwd(), ENV.evidenceStoragePath);
  if (!evidenceRoot.startsWith(uploadsRoot)) {
    throw new AppError(
      "EVIDENCE_STORAGE_PATH must be inside uploads directory",
      500
    );
  }
  return { uploadsRoot, evidenceRoot };
};

const uploadToLocalStorage = async (
  params: UploadEvidenceParams
): Promise<UploadEvidenceResult> => {
  const { uploadsRoot, evidenceRoot } = resolveLocalStoragePath();
  await mkdir(evidenceRoot, { recursive: true });

  const extension = sanitizeFileExtension(params.file.originalname);
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const targetPath = path.join(evidenceRoot, filename);
  await writeFile(targetPath, params.file.buffer);

  const relativePath = path
    .relative(uploadsRoot, targetPath)
    .replace(/\\/g, "/");
  const publicBaseUrl = normalizeBaseUrl(
    ENV.evidencePublicBaseUrl ?? params.requestBaseUrl
  );

  return {
    storage: "local",
    url: `${publicBaseUrl}/uploads/${relativePath}`,
  };
};

const extractCid = (responseJson: Record<string, unknown>): string | undefined => {
  const candidates = [
    responseJson.IpfsHash,
    responseJson.Hash,
    responseJson.cid,
    (responseJson.value as Record<string, unknown> | undefined)?.cid,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
};

const uploadToIpfs = async (
  params: UploadEvidenceParams
): Promise<UploadEvidenceResult> => {
  if (!ENV.ipfsApiUrl) {
    throw new AppError("IPFS_API_URL is not configured", 500);
  }

  const formData = new FormData();
  const arrayBuffer = params.file.buffer.buffer.slice(
    params.file.buffer.byteOffset,
    params.file.buffer.byteOffset + params.file.buffer.byteLength
  ) as ArrayBuffer;
  formData.append(
    "file",
    new Blob([arrayBuffer], { type: params.file.mimetype }),
    params.file.originalname
  );

  const headers: Record<string, string> = {};
  if (ENV.ipfsBearerToken) {
    headers.Authorization = `Bearer ${ENV.ipfsBearerToken}`;
  }

  const response = await fetch(ENV.ipfsApiUrl, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(
      `Failed to upload evidence to IPFS: ${response.status} ${body}`,
      502
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  const cid = extractCid(json);
  if (!cid) {
    throw new AppError("Unable to read CID from IPFS upload response", 502);
  }

  const gatewayBase = normalizeBaseUrl(ENV.ipfsGatewayBaseUrl);
  return {
    storage: "ipfs",
    cid,
    url: `${gatewayBase}/${cid}`,
  };
};

export const uploadEvidenceFile = async (
  params: UploadEvidenceParams
): Promise<UploadEvidenceResult> => {
  const storageDriver = ENV.evidenceStorageDriver;
  if (storageDriver === "ipfs") {
    return uploadToIpfs(params);
  }
  return uploadToLocalStorage(params);
};
