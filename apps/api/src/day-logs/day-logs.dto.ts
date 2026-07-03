import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class DayLogListQueryDto {
  @ApiPropertyOptional({ example: "2026-06-01" })
  @Matches(ISO_DATE)
  from!: string;

  @ApiPropertyOptional({ example: "2026-06-30" })
  @Matches(ISO_DATE)
  to!: string;
}

export class UpsertDayLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDayOff?: boolean;
}
