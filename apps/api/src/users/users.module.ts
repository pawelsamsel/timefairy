import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { LanesHelperService } from "../common/lanes-helper.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, LanesHelperService],
})
export class UsersModule {}
