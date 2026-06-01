import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./settings.dto";
import { Roles } from "../common/decorators";
import { RolesGuard } from "../common/roles.guard";

@ApiTags("settings")
@Controller("settings")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @Roles(Role.ADMIN)
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
