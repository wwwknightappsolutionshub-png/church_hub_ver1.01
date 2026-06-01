import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHubCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}
