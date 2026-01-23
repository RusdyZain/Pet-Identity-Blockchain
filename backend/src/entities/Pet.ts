import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PetStatus } from "../types/enums";
import { User } from "./User";
import { MedicalRecord } from "./MedicalRecord";
import { OwnershipHistory } from "./OwnershipHistory";
import { CorrectionRequest } from "./CorrectionRequest";

@Entity({ name: "pets" })
export class Pet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "public_id", unique: true })
  publicId!: string;

  @Column({ name: "on_chain_pet_id", type: "int", nullable: true })
  onChainPetId!: number | null;

  @Column({ name: "data_hash", type: "text", nullable: true })
  dataHash!: string | null;

  @Column({ name: "tx_hash", type: "text", nullable: true })
  txHash!: string | null;

  @Column()
  name!: string;

  @Column()
  species!: string;

  @Column()
  breed!: string;

  @Column({ name: "birth_date", type: "timestamp" })
  birthDate!: Date;

  @Column({ type: "int", nullable: true })
  age!: number | null;

  @Column()
  color!: string;

  @Column({ name: "physical_mark" })
  physicalMark!: string;

  @Column({
    type: "enum",
    enum: PetStatus,
    enumName: "PetStatus",
    default: PetStatus.REGISTERED,
  })
  status!: PetStatus;

  @Column({ name: "owner_id", type: "int" })
  ownerId!: number;

  @ManyToOne(() => User, (user) => user.pets)
  @JoinColumn({ name: "owner_id" })
  owner?: User;

  @OneToMany(() => MedicalRecord, (record) => record.pet)
  medicalRecords?: MedicalRecord[];

  @OneToMany(() => OwnershipHistory, (history) => history.pet)
  ownershipHistory?: OwnershipHistory[];

  @OneToMany(() => CorrectionRequest, (correction) => correction.pet)
  corrections?: CorrectionRequest[];

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
