import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class PurgeChurchDto {
  /** Must match the tenant slug exactly (case-insensitive). */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  confirmSlug!: string;

  /** Type DELETE to confirm irreversible purge. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^DELETE$/, { message: 'Type DELETE to confirm permanent deletion' })
  confirmPhrase!: string;
}
