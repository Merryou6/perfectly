import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body?: string;
}
