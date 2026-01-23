import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

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

  @Column({ name: "is_read", default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;
}
