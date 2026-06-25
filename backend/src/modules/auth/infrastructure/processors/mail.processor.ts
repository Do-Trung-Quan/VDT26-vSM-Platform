import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmtpMailerAdapter } from '../../../../shared/mailer/adapters/smtp-mailer.adapter';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';

interface SendOtpJobData {
  to: string;
  otp: string;
}

interface SendPasswordJobData {
  to: string;
  password: string;
}

/**
 * Worker lắng nghe queue 'mail-otp', gọi SmtpMailerAdapter để gửi thực sự.
 * Chạy ở nền — không block HTTP response.
 */
@Processor(QUEUE_NAMES.MAIL_OTP)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly smtpMailer: SmtpMailerAdapter) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing mail job: ${job.name} → ${(job.data as { to: string }).to}`);

    switch (job.name) {
      case JOB_NAMES.SEND_OTP_EMAIL: {
        const { to, otp } = job.data as SendOtpJobData;
        await this.smtpMailer.sendOtpEmail(to, otp);
        break;
      }
      case JOB_NAMES.SEND_PASSWORD_EMAIL: {
        const { to, password } = job.data as SendPasswordJobData;
        await this.smtpMailer.sendPasswordEmail(to, password);
        break;
      }
      default:
        this.logger.warn(`Unknown mail job name: ${job.name}`);
    }
  }
}
