import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePraiseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  testimony!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsBoolean()
  showDisplayName!: boolean;

  @IsOptional()
  @IsString()
  memberId?: string;
}
