import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { Meeting } from '../../../meetings/domain/entities/meeting.entity';

export enum NotificationType {
  MEETING_CREATED = 'MEETING_CREATED',
  MEETING_STATUS_CHANGED = 'MEETING_STATUS_CHANGED',
  MEETING_INFO_UPDATED = 'MEETING_INFO_UPDATED',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: false })
  meetingId: string;

  @ManyToOne(() => Meeting)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  markRead(): void {
    this.isRead = true;
  }

  static create(
    userId: string,
    meetingId: string,
    type: NotificationType,
    message: string,
  ): Notification {
    const notification = new Notification();
    notification.userId = userId;
    notification.meetingId = meetingId;
    notification.type = type;
    notification.message = message;
    notification.isRead = false;
    return notification;
  }
}
