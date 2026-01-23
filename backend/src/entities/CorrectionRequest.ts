import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CorrectionStatus } from "../types/enums";
import { Pet } from "./Pet";
import { User } from "./User";

@Entity({ name: "correction_requests" })
export class CorrectionRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "pet_id", type: "int" })
  petId!: number;

  @ManyToOne(() => Pet, (pet) => pet.corrections)
  @JoinColumn({ name: "pet_id" })
  pet?: Pet;

  @Column({ name: "owner_id", type: "int" })
  ownerId!: number;

  @ManyToOne(() => User, (user) => user.corrections)
  @JoinColumn({ name: "owner_id" })
  owner?: User;

  @Column({ name: "data_hash", type: "text", nullable: true })
  dataHash!: string | null;

  @Column({ name: "tx_hash", type: "text", nullable: true })
  txHash!: string | null;

  @Column({ name: "field_name" })
  fieldName!: string;

  @Column({ name: "old_value" })
  oldValue!: string;

  @Column({ name: "new_value" })
  newValue!: string;

  @Column({
    type: "enum",
    enum: CorrectionStatus,
    enumName: "CorrectionStatus",
    default: CorrectionStatus.PENDING,
  })
  status!: CorrectionStatus;

  @Column({ name: "reviewed_by", type: "int", nullable: true })
  reviewedById!: number | null;

  @ManyToOne(() => User, (user) => user.reviews, { nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewer?: User | null;

  @Column({ name: "reviewed_at", type: "timestamp", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
