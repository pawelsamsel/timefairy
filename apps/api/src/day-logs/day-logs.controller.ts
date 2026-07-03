import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators";
import { DayLogListQueryDto, UpsertDayLogDto } from "./day-logs.dto";
import { DayLogsService } from "./day-logs.service";

@ApiTags("day-logs")
@Controller("day-logs")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class DayLogsController {
  constructor(private dayLogsService: DayLogsService) {}

  @Get()
  findInRange(@CurrentUser() user: RequestUser, @Query() query: DayLogListQueryDto) {
    return this.dayLogsService.findInRange(user.sub, query);
  }

  @Get(":date")
  findOne(@CurrentUser() user: RequestUser, @Param("date") date: string) {
    return this.dayLogsService.findOne(user.sub, date);
  }

  @Patch(":date")
  upsert(
    @CurrentUser() user: RequestUser,
    @Param("date") date: string,
    @Body() dto: UpsertDayLogDto,
  ) {
    return this.dayLogsService.upsert(user.sub, date, dto);
  }
}
