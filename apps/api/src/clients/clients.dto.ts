import { IsBoolean, IsNumber, IsOptional, IsString, MinLength, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  dailyWorkHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSaturdays?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSundays?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultHourlyRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string | null;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  dailyWorkHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSaturdays?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSundays?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultHourlyRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrency?: string | null;
}
