import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('transcript_blocks')
export class TranscriptBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  meetingId: string;

  @ManyToOne(() => Meeting)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'int' })
  sequenceNumber: number;

  @Column({ type: 'text' })
  text: string;

  @Column()
  speakerLabel: string;

  @Column({ type: 'float' })
  startTime: number;

  @Column({ type: 'float' })
  endTime: number;

  @CreateDateColumn()
  createdAt: Date;

  renameSpeaker(newLabel: string): void {
    this.speakerLabel = newLabel;
  }
}
