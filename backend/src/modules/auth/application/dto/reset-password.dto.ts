import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString({ message: 'Mã OTP không được để trống' })
  otpCode: string;

  @IsString({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ hoa và 1 số',
  })
  newPassword: string;
}
