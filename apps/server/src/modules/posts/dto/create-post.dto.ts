import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreatePostDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  communityId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sectionId: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsString()
  @MinLength(1, { message: "帖子正文不能为空" })
  @MaxLength(20000, { message: "帖子正文不能超过 20000 个字符" })
  body: string;
}
