import { Module } from '@nestjs/common';
import { MAILER_PORT } from './mailer.tokens';
import { SmtpMailerAdapter } from './adapters/smtp-mailer.adapter';

@Module({
  providers: [{ provide: MAILER_PORT, useClass: SmtpMailerAdapter }],
  exports: [MAILER_PORT],
})
export class MailerModule {}
