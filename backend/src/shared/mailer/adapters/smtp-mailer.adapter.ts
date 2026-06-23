import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailerPort } from '../ports/mailer.port';

/**
 * Triển khai IMailerPort qua SMTP (nodemailer): cấp mật khẩu ngẫu nhiên khi Admin tạo
 * tài khoản (users) và gửi mã OTP đặt lại mật khẩu (auth) — không có luồng Register tự do.
 */
@Injectable()
export class SmtpMailerAdapter implements IMailerPort {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('SMTP_FROM') ?? 'no-reply@vsm.local';
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendPasswordEmail(to: string, password: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Tài khoản vSM Platform của bạn',
      text: `Mật khẩu đăng nhập của bạn là: ${password}`,
    });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Mã OTP đặt lại mật khẩu',
      text: `Mã OTP của bạn là: ${otp}`,
    });
  }
}
