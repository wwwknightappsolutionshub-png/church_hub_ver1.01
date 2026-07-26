import { IsEmail, IsString, MaxLength } from 'class-validator';

export class UpdateTenantUserEmailDto {
  @IsString()
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
