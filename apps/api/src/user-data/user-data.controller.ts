import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators";
import { UserDataService } from "./user-data.service";

@ApiTags("user-data")
@Controller("user-data")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class UserDataController {
  constructor(private userData: UserDataService) {}

  @Get("export")
  export(@CurrentUser() user: RequestUser) {
    return this.userData.exportForUser(user.sub);
  }

  @Post("import")
  import(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.userData.importForUser(user.sub, body);
  }
}
