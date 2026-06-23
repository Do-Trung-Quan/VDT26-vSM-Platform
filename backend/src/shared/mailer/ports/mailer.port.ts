export interface IMailerPort {
  sendPasswordEmail(to: string, password: string): Promise<void>;
  sendOtpEmail(to: string, otp: string): Promise<void>;
}
