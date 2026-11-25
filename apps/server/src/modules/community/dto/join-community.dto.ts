import { IsOptional, IsString, MaxLength } from "class-validator";

export class JoinCommunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
