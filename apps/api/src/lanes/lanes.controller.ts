import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LanesService } from "./lanes.service";
import { CreateLaneDto, UpdateLaneDto } from "./lanes.dto";
import { CurrentUser, RequestUser } from "../common/decorators";

@ApiTags("lanes")
@Controller("lanes")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class LanesController {
  constructor(private lanesService: LanesService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.lanesService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLaneDto) {
    return this.lanesService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateLaneDto,
  ) {
    return this.lanesService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.lanesService.remove(user.sub, id);
  }
}
