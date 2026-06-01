import { Module } from "@nestjs/common";
import { TimeEntriesController } from "./time-entries.controller";
import { TimeEntriesService } from "./time-entries.service";
import { LanesHelperService } from "../common/lanes-helper.service";

@Module({
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService, LanesHelperService],
})
export class TimeEntriesModule {}
