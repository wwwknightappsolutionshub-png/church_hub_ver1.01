import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitMenteeRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  requestedMentorType!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  goals!: string;
}
