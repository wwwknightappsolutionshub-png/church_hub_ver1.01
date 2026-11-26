import { IsBoolean, IsOptional, Matches } from 'class-validator';

export class GenerateWeeklyReportDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekEnd?: string;

  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
