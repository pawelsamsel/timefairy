import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { TimeEntriesService } from "./time-entries.service";
import {
  CreateTimeEntryDto,
  TimeEntryListQueryDto,
  TimeEntrySummaryQueryDto,
  UpdateTimeEntryDto,
} from "./time-entries.dto";
import { CurrentUser, RequestUser } from "../common/decorators";

@ApiTags("time-entries")
@Controller("time-entries")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query() query: TimeEntryListQueryDto) {
    return this.timeEntriesService.findAll(user.sub, query);
  }

  @Get("summary")
  summary(@CurrentUser() user: RequestUser, @Query() query: TimeEntrySummaryQueryDto) {
    return this.timeEntriesService.summary(user.sub, query);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTimeEntryDto) {
    return this.timeEntriesService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateTimeEntryDto,
  ) {
    return this.timeEntriesService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.timeEntriesService.remove(user.sub, id);
  }
}
