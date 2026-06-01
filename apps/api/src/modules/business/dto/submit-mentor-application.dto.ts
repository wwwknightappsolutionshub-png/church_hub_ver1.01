import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitMentorApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  specialty!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  missionStatement!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  yearsExperience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whyMentor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  background?: string;
}
