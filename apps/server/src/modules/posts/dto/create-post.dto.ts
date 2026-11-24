import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsString()
  @MinLength(1, { message: "动态正文不能为空" })
  @MaxLength(2000, { message: "动态正文不能超过 2000 个字符" })
  content: string;
}
