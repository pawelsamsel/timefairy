import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ClientsService } from "./clients.service";
import { CreateClientDto, UpdateClientDto } from "./clients.dto";
import { CurrentUser, RequestUser } from "../common/decorators";

@ApiTags("clients")
@Controller("clients")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.clientsService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.clientsService.remove(user.sub, id);
  }
}
