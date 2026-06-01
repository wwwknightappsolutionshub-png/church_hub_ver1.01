import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectMentorApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
