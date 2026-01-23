import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from "../types/enums";
import { Pet } from "./Pet";
import { MedicalRecord } from "./MedicalRecord";
import { Notification } from "./Notification";
import { CorrectionRequest } from "./CorrectionRequest";
import { OwnershipHistory } from "./OwnershipHistory";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: "password_hash", select: false })
  passwordHash!: string;

  @Column({ name: "wallet_address", type: "text", nullable: true })
  walletAddress!: string | null;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "UserRole",
    default: UserRole.OWNER,
  })
  role!: UserRole;

  @OneToMany(() => Pet, (pet) => pet.owner)
  pets?: Pet[];

  @OneToMany(() => MedicalRecord, (record) => record.clinic)
  clinicRecords?: MedicalRecord[];

  @OneToMany(() => MedicalRecord, (record) => record.verifiedBy)
  verifiedRecords?: MedicalRecord[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @OneToMany(() => CorrectionRequest, (correction) => correction.owner)
  corrections?: CorrectionRequest[];

  @OneToMany(() => CorrectionRequest, (correction) => correction.reviewer)
  reviews?: CorrectionRequest[];

  @OneToMany(() => OwnershipHistory, (history) => history.fromOwner)
  ownedFrom?: OwnershipHistory[];

  @OneToMany(() => OwnershipHistory, (history) => history.toOwner)
  ownedTo?: OwnershipHistory[];
}
