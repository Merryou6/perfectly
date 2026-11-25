import { Type } from "class-transformer";
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class SavePageSchemaDto {
  @IsObject()
  schema: Record<string, unknown>;
}

export class PublishPageSchemaDto extends SavePageSchemaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeSummary?: string;
}

export class RollbackPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeSummary?: string;
}
