import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { TasksService } from "./tasks.service";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.dto";
import { CurrentUser, RequestUser } from "../common/decorators";

@ApiTags("tasks")
@Controller("tasks")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query("projectId") projectId?: string,
    @Query("clientId") clientId?: string,
  ) {
    return this.tasksService.findAll(user.sub, projectId, clientId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.tasksService.findOne(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.tasksService.remove(user.sub, id);
  }
}
