import { OwnershipHistory } from "../entities/OwnershipHistory";

export type PublicOwnershipParty = {
  name: string;
  wallet: string | null;
};

export type PublicTraceOwnershipItem = {
  fromOwner: PublicOwnershipParty;
  toOwner: PublicOwnershipParty;
  requestedAt: string;
  transferredAt: string | null;
  status: "PENDING" | "COMPLETED";
};

export const resolvePublicOwnershipStatus = (
  transferredAt: Date | null
): "PENDING" | "COMPLETED" => (transferredAt ? "COMPLETED" : "PENDING");

export const maskPublicOwnerName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Anonim";
  }

  const [firstName = "", ...restNames] = trimmed.split(/\s+/);
  const maskedFirstName =
    firstName.length <= 2
      ? `${firstName[0] ?? "*"}***`
      : `${firstName.slice(0, 2)}***`;
  const maskedTail = restNames
    .map((part) => `${part[0] ?? "*"}.`)
    .join(" ")
    .trim();

  return maskedTail ? `${maskedFirstName} ${maskedTail}` : maskedFirstName;
};

export const maskPublicWalletAddress = (walletAddress: string | null | undefined) => {
  if (!walletAddress) {
    return null;
  }

  const normalized = walletAddress.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= 10) {
    return `${normalized.slice(0, 4)}...`;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
};

export const serializeTracePublicOwnershipItem = (
  history: OwnershipHistory
): PublicTraceOwnershipItem => ({
  fromOwner: {
    name: maskPublicOwnerName(history.fromOwner?.name ?? ""),
    wallet: maskPublicWalletAddress(history.fromOwner?.walletAddress),
  },
  toOwner: {
    name: maskPublicOwnerName(history.toOwner?.name ?? ""),
    wallet: maskPublicWalletAddress(history.toOwner?.walletAddress),
  },
  requestedAt: history.createdAt.toISOString(),
  transferredAt: history.transferredAt ? history.transferredAt.toISOString() : null,
  status: resolvePublicOwnershipStatus(history.transferredAt),
});
