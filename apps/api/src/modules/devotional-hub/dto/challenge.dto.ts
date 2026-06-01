import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateChallengeDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['INDIVIDUAL', 'CHURCH', 'GROUP'])
  scope!: 'INDIVIDUAL' | 'CHURCH' | 'GROUP';

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;
}

export class RecordChallengeProgressDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  increment?: number;
}
