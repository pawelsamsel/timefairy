import { Module } from "@nestjs/common";
import { UserDataController } from "./user-data.controller";
import { UserDataService } from "./user-data.service";

@Module({
  controllers: [UserDataController],
  providers: [UserDataService],
})
export class UserDataModule {}
