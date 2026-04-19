import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Pet } from "./Pet";
import { User } from "./User";

@Entity({ name: "ownership_history" })
export class OwnershipHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "pet_id", type: "int" })
  petId!: number;

  @ManyToOne(() => Pet, (pet) => pet.ownershipHistory)
  @JoinColumn({ name: "pet_id" })
  pet?: Pet;

  @Column({ name: "from_owner_id", type: "int" })
  fromOwnerId!: number;

  @ManyToOne(() => User, (user) => user.ownedFrom)
  @JoinColumn({ name: "from_owner_id" })
  fromOwner?: User;

  @Column({ name: "to_owner_id", type: "int" })
  toOwnerId!: number;

  @ManyToOne(() => User, (user) => user.ownedTo)
  @JoinColumn({ name: "to_owner_id" })
  toOwner?: User;

  @Column({ name: "on_chain_pet_id", type: "int", nullable: true })
  onChainPetId!: number | null;

  @Column({ name: "tx_hash", type: "text", nullable: true })
  txHash!: string | null;

  @Column({ name: "block_number", type: "int", nullable: true })
  blockNumber!: number | null;

  @Column({ name: "block_timestamp", type: "timestamp", nullable: true })
  blockTimestamp!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @Column({ name: "transferred_at", type: "timestamp", nullable: true })
  transferredAt!: Date | null;
}
