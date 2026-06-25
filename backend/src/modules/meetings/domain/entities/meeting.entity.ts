import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AggregateRootBase } from '../../../../common/domain/aggregate-root.base';
import { User } from '../../../users/domain/entities/user.entity';
import { Department } from '../../../departments/domain/entities/department.entity';

export enum MeetingType {
  LIVE = 'LIVE',
  UPLOAD = 'UPLOAD',
}

export enum MeetingStatus {
  LIVE = 'LIVE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

@Entity('meetings')
export class Meeting extends AggregateRootBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'enum', enum: MeetingType })
  type: MeetingType;

  @Column({ nullable: false })
  hostId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ nullable: false })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'enum', enum: MeetingStatus })
  status: MeetingStatus;

  @Column({ nullable: true, default: null })
  audioUrl: string | null;

  @Column({ type: 'int', nullable: true, default: null })
  durationSeconds: number | null;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ type: 'timestamp', nullable: true, default: null })
  deletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  startLive(): void {
    this.status = MeetingStatus.LIVE;
    this.startedAt = new Date();
  }

  markProcessing(): void {
    this.status = MeetingStatus.PROCESSING;
    this.startedAt = this.startedAt ?? new Date();
  }

  complete(audioUrl: string, durationSeconds: number): void {
    this.status = MeetingStatus.COMPLETED;
    this.audioUrl = audioUrl;
    this.durationSeconds = durationSeconds;
    this.endedAt = new Date();
  }

  lock(): void {
    this.isLocked = true;
  }

  unlock(): void {
    this.isLocked = false;
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }

  restore(): void {
    this.deletedAt = null;
  }

  isActive(): boolean {
    return this.deletedAt === null;
  }
}
