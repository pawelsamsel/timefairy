import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TrackTimeMode } from "@prisma/client";

export class UpdateWorkHoursPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  dailyWorkHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSaturdays?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSundays?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlyBillableProjects?: boolean;

  @ApiPropertyOptional({ enum: TrackTimeMode })
  @IsOptional()
  @IsEnum(TrackTimeMode)
  trackTimeMode?: TrackTimeMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  minimalTaskMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  useTimeGrid?: boolean;
}
