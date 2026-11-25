import { IsString, Length, MaxLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @MaxLength(72)
  oldPassword: string;

  @IsString()
  @Length(8, 72, { message: "新密码长度需要在 8 到 72 个字符之间" })
  newPassword: string;
}
