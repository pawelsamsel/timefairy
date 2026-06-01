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
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import {
  ChangeUserPasswordDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from "./users.dto";
import { CurrentUser, RequestUser, Roles } from "../common/decorators";
import { RolesGuard } from "../common/roles.guard";

@ApiTags("admin/users")
@Controller("admin/users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findPaginated(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.usersService.update(id, dto, actor.sub);
  }

  @Patch(":id/password")
  changePassword(@Param("id") id: string, @Body() dto: ChangeUserPasswordDto) {
    return this.usersService.changePassword(id, dto);
  }

  @Post(":id/soft-delete")
  softDelete(@Param("id") id: string, @CurrentUser() actor: RequestUser) {
    return this.usersService.softDelete(id, actor.sub);
  }

  @Post(":id/restore")
  restore(@Param("id") id: string) {
    return this.usersService.restore(id);
  }

  @Delete(":id")
  hardDelete(@Param("id") id: string, @CurrentUser() actor: RequestUser) {
    return this.usersService.hardDelete(id, actor.sub);
  }
}
