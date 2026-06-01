import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDeptFeedbackDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}
