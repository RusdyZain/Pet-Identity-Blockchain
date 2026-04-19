import { describe, expect, it } from "vitest";
import { OwnershipHistory } from "../../src/entities/OwnershipHistory";
import {
  maskPublicOwnerName,
  maskPublicWalletAddress,
  serializeTracePublicOwnershipItem,
} from "../../src/services/tracePublicSerializer";

describe("tracePublicSerializer", () => {
  it("masks owner name and wallet address", () => {
    expect(maskPublicOwnerName("Jonathan Doe")).toBe("Jo*** D.");
    expect(maskPublicOwnerName("Al")).toBe("A***");
    expect(maskPublicOwnerName("")).toBe("Anonim");

    expect(
      maskPublicWalletAddress("0x1234567890abcdef1234567890abcdef12345678")
    ).toBe("0x1234...5678");
    expect(maskPublicWalletAddress("")).toBeNull();
    expect(maskPublicWalletAddress(null)).toBeNull();
  });

  it("serializes public trace ownership item without leaking email", () => {
    const history = {
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      transferredAt: new Date("2026-01-02T10:00:00.000Z"),
      fromOwner: {
        name: "Owner Alpha",
        email: "owner.alpha@example.com",
        walletAddress: "0xaabbccddeeff0011223344556677889900aabbcc",
      },
      toOwner: {
        name: "Owner Beta",
        email: "owner.beta@example.com",
        walletAddress: "0xbbccddeeff0011223344556677889900aabbccdd",
      },
    } as OwnershipHistory;

    const serialized = serializeTracePublicOwnershipItem(history);
    expect(serialized.fromOwner.name).toBe("Ow*** A.");
    expect(serialized.toOwner.name).toBe("Ow*** B.");
    expect(serialized.fromOwner.wallet).toBe("0xaabb...bbcc");
    expect(serialized.toOwner.wallet).toBe("0xbbcc...ccdd");
    expect(serialized.status).toBe("COMPLETED");
    expect((serialized.fromOwner as { email?: string }).email).toBeUndefined();
    expect((serialized.toOwner as { email?: string }).email).toBeUndefined();
    expect(JSON.stringify(serialized)).not.toContain("@example.com");
  });
});
