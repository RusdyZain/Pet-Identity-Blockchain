import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { NotificationEventType } from "../types/enums";

@Entity({ name: "notifications" })
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "int" })
  userId!: number;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({
    name: "event_type",
    type: "text",
    default: NotificationEventType.GENERAL,
  })
  eventType!: NotificationEventType;

  @Column({ name: "pet_id", type: "int", nullable: true })
  petId!: number | null;

  @Column({ name: "source_id", type: "text", nullable: true })
  sourceId!: string | null;

  @Column({ name: "action_url", type: "text", nullable: true })
  actionUrl!: string | null;

  @Column({ name: "is_read", default: false })
  isRead!: boolean;

  @Column({ name: "read_at", type: "timestamp", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
