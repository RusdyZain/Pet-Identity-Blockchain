import "reflect-metadata";
import { DataSource } from "typeorm";
import { ENV } from "./env";
import { User } from "../entities/User";
import { Pet } from "../entities/Pet";
import { MedicalRecord } from "../entities/MedicalRecord";
import { OwnershipHistory } from "../entities/OwnershipHistory";
import { CorrectionRequest } from "../entities/CorrectionRequest";
import { Notification } from "../entities/Notification";

// DataSource utama untuk koneksi PostgreSQL via TypeORM.
export const AppDataSource = new DataSource({
  type: "postgres",
  url: ENV.databaseUrl,
  entities: [
    User,
    Pet,
    MedicalRecord,
    OwnershipHistory,
    CorrectionRequest,
    Notification,
  ],
  synchronize: false,
  logging: false,
});
