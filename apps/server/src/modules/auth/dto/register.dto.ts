import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @Length(3, 32, { message: "用户名长度需要在 3 到 32 个字符之间" })
  username: string;

  @IsString()
  @Length(8, 72, { message: "密码长度需要在 8 到 72 个字符之间" })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  displayName?: string;
}
