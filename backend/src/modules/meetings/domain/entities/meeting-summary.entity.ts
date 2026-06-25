import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

export enum MeetingSummaryStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

@Entity('meeting_summaries')
export class MeetingSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  meetingId: string;

  @OneToOne(() => Meeting)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'text', default: '' })
  summaryText: string;

  @Column({ type: 'enum', enum: MeetingSummaryStatus, default: MeetingSummaryStatus.PROCESSING })
  status: MeetingSummaryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  markCompleted(text: string): void {
    this.summaryText = text;
    this.status = MeetingSummaryStatus.COMPLETED;
  }

  isCompleted(): boolean {
    return this.status === MeetingSummaryStatus.COMPLETED;
  }
}
