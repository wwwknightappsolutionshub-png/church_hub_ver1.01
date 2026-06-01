import { IsString, MaxLength, Matches } from 'class-validator';

export class ProfileAvatarDataDto {
  @IsString()
  @MaxLength(900_000)
  @Matches(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i, {
    message: 'imageDataUrl must be a base64 data URL (image/jpeg, png, webp, or gif)',
  })
  imageDataUrl!: string;
}
