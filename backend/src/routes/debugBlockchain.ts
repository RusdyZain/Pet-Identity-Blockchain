import { Router, Request, Response } from "express";
import {
  registerPet,
  getPet,
  addMedicalRecord,
  getMedicalRecords,
} from "../blockchain/petIdentityClient";
import {
  buildMedicalRecordDataHash,
  buildPetDataHash,
} from "../utils/dataHash";

const router = Router();

// Helper konversi tanggal ke UNIX timestamp (detik).
const toUnixTime = (value: string | number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return Math.floor(date.getTime() / 1000);
};

const toDate = (value: string | number) => new Date(toUnixTime(value) * 1000);

// Ubah BigInt agar JSON.stringify aman.
const serializeBigInt = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInt);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeBigInt(val)])
    );
  }
  return value;
};

// Ambil pesan error paling relevan dari error ethers.
const getBlockchainErrorMessage = (error: any): string | undefined => {
  if (!error) {
    return undefined;
  }
  const candidates = [
    error?.reason,
    error?.shortMessage,
    error?.error?.reason,
    error?.error?.message,
    error?.error?.error?.message,
    error?.info?.error?.message,
    error?.message,
  ];
  return candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0
  );
};

// Deteksi error "pet tidak ada" dari pesan blockchain.
const isPetMissingError = (error: any): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string" && message.toLowerCase().includes("pet does not exist");
};

// Deteksi error akses klinik dari pesan blockchain.
const isClinicAccessError = (error: any): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string" && message.toLowerCase().includes("caller is not clinic");
};

// Endpoint debug untuk register pet di kontrak.
router.post("/debug/register-pet", async (req: Request, res: Response) => {
  try {
    console.log("[debug/register-pet] payload", req.body);
    const { publicId, name, species, breed, birthDate, color, physicalMark } =
      req.body;
    const parsedBirthDate = toDate(birthDate);
    const dataHash = buildPetDataHash({
      publicId,
      name,
      species,
      breed,
      birthDate: parsedBirthDate,
      color: color ?? "",
      physicalMark: physicalMark ?? "",
    });
    const { receipt } = await registerPet(dataHash);
    return res.json({ txHash: receipt.hash, dataHash });
  } catch (error: any) {
    console.error("Failed to register pet via blockchain:", error);
    return res
      .status(500)
      .json({ error: error?.message ?? "Internal server error" });
  }
});

// Endpoint debug untuk mengambil data pet di kontrak.
router.get("/debug/pet/:id", async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.id);
    const pet = await getPet(petId);
    return res.json(serializeBigInt(pet));
  } catch (error: any) {
    if (isPetMissingError(error)) {
      return res.status(404).json({
        code: "PET_NOT_FOUND",
        message: "Pet ID tidak ditemukan",
      });
    }
    const message = getBlockchainErrorMessage(error);
    console.error("Failed to fetch pet via blockchain:", error);
    return res
      .status(500)
      .json({ error: message ?? "Internal server error" });
  }
});

router.post(
  "/debug/add-medical-record",
  async (req: Request, res: Response) => {
    // Endpoint debug untuk menambah catatan medis di kontrak.
    try {
      const { petId, vaccineType, batchNumber, givenAt, notes, evidenceUrl } =
        req.body;
      const parsedGivenAt = toDate(givenAt);
      const dataHash = buildMedicalRecordDataHash({
        petId: Number(petId),
        vaccineType,
        batchNumber,
        givenAt: parsedGivenAt,
        notes,
        evidenceUrl,
      });
      const { receipt, recordId } = await addMedicalRecord(
        Number(petId),
        dataHash
      );
      return res.json({
        txHash: receipt.hash,
        dataHash,
        recordId: recordId.toString(),
      });
    } catch (error: any) {
      if (isClinicAccessError(error)) {
        return res.status(403).json({
          code: "CLINIC_ACCESS_DENIED",
          message:
            "Akses ditolak: alamat wallet backend belum terdaftar sebagai klinik di kontrak. Jalankan addClinic() dari akun pemilik kontrak untuk mendaftarkan alamat ini sebelum menulis rekam medis.",
        });
      }
      const message = getBlockchainErrorMessage(error);
      console.error("Failed to add medical record via blockchain:", error);
      return res
        .status(500)
        .json({ error: message ?? "Internal server error" });
    }
  }
);

// Endpoint debug untuk mengambil seluruh catatan medis di kontrak.
router.get("/debug/records/:petId", async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.petId);
    const records = await getMedicalRecords(petId);
    return res.json(serializeBigInt(records));
  } catch (error: any) {
    if (isPetMissingError(error)) {
      return res.status(404).json({
        code: "PET_NOT_FOUND",
        message: "Pet ID tidak ditemukan",
      });
    }
    const message = getBlockchainErrorMessage(error);
    console.error("Failed to fetch medical records via blockchain:", error);
    return res
      .status(500)
      .json({ error: message ?? "Internal server error" });
  }
});

export default router;

// Contoh penggunaan:
// import debugBlockchainRouter from './routes/debugBlockchain';
// app.use('/api', debugBlockchainRouter);
