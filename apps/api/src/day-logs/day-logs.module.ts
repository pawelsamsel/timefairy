import { Module } from "@nestjs/common";
import { DayLogsController } from "./day-logs.controller";
import { DayLogsService } from "./day-logs.service";

@Module({
  controllers: [DayLogsController],
  providers: [DayLogsService],
})
export class DayLogsModule {}
