import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./settings.dto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  get() {
    return this.prisma.systemSettings.findUniqueOrThrow({ where: { id: 1 } });
  }

  update(dto: UpdateSettingsDto) {
    return this.prisma.systemSettings.update({
      where: { id: 1 },
      data: dto,
    });
  }
}
