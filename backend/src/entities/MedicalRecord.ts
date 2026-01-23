import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MedicalRecordStatus } from "../types/enums";
import { Pet } from "./Pet";
import { User } from "./User";

@Entity({ name: "medical_records" })
export class MedicalRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "pet_id", type: "int" })
  petId!: number;

  @ManyToOne(() => Pet, (pet) => pet.medicalRecords)
  @JoinColumn({ name: "pet_id" })
  pet?: Pet;

  @Column({ name: "clinic_id", type: "int" })
  clinicId!: number;

  @ManyToOne(() => User, (user) => user.clinicRecords)
  @JoinColumn({ name: "clinic_id" })
  clinic?: User;

  @Column({ name: "on_chain_record_id", type: "int", nullable: true })
  onChainRecordId!: number | null;

  @Column({ name: "data_hash", type: "text", nullable: true })
  dataHash!: string | null;

  @Column({ name: "tx_hash", type: "text", nullable: true })
  txHash!: string | null;

  @Column({ name: "vaccine_type" })
  vaccineType!: string;

  @Column({ name: "batch_number" })
  batchNumber!: string;

  @Column({ name: "given_at", type: "timestamp" })
  givenAt!: Date;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "evidence_url", type: "text", nullable: true })
  evidenceUrl!: string | null;

  @Column({
    type: "enum",
    enum: MedicalRecordStatus,
    enumName: "MedicalRecordStatus",
    default: MedicalRecordStatus.PENDING,
  })
  status!: MedicalRecordStatus;

  @Column({ name: "verified_by", type: "int", nullable: true })
  verifiedById!: number | null;

  @ManyToOne(() => User, (user) => user.verifiedRecords, { nullable: true })
  @JoinColumn({ name: "verified_by" })
  verifiedBy?: User | null;

  @Column({ name: "verified_at", type: "timestamp", nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
