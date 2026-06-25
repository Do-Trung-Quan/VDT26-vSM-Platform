import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IMailerPort } from '../../../../shared/mailer/ports/mailer.port';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';

/**
 * Adapter bất đồng bộ: thay vì gửi email trực tiếp, đẩy job vào BullMQ queue.
 * MailProcessor sẽ xử lý ở nền — giúp forgot-password handler trả response ngay lập tức.
 */
@Injectable()
export class AsyncMailerAdapter implements IMailerPort {
  constructor(
    @InjectQueue(QUEUE_NAMES.MAIL_OTP) private readonly mailQueue: Queue,
  ) {}

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this.mailQueue.add(JOB_NAMES.SEND_OTP_EMAIL, { to, otp });
  }

  async sendPasswordEmail(to: string, password: string): Promise<void> {
    await this.mailQueue.add(JOB_NAMES.SEND_PASSWORD_EMAIL, { to, password });
  }
}
