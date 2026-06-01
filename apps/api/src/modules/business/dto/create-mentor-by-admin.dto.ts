import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMentorByAdminDto {
  @IsUUID()
  memberId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  specialty!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  missionStatement!: string;
}
