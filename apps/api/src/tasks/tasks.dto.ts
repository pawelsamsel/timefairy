import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  externalUrl?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ format: "date", description: "First day the task appears on day view" })
  @IsOptional()
  @Matches(ISO_DATE)
  scheduledFrom?: string;

  @ApiPropertyOptional({ format: "date", description: "Due date — last scheduled day on day view" })
  @IsOptional()
  @Matches(ISO_DATE)
  scheduledTo?: string;
}

export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ["scheduledFrom", "scheduledTo"] as const),
) {
  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== "")
  @Matches(ISO_DATE)
  scheduledFrom?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== "")
  @Matches(ISO_DATE)
  scheduledTo?: string | null;
}

export class ReorderTasksDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  taskIds!: string[];
}
