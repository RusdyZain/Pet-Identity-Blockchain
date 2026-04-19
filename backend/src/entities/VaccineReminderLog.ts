import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "vaccine_reminder_logs" })
@Index(
  "vaccine_reminder_logs_pet_id_vaccine_type_due_date_key",
  ["petId", "vaccineType", "dueDate"],
  {
  unique: true,
  }
)
export class VaccineReminderLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "pet_id", type: "int" })
  petId!: number;

  @Column({ name: "owner_id", type: "int" })
  ownerId!: number;

  @Column({ name: "vaccine_type" })
  vaccineType!: string;

  @Column({ name: "due_date", type: "date" })
  dueDate!: Date;

  @CreateDateColumn({ name: "sent_at", type: "timestamp" })
  sentAt!: Date;
}
