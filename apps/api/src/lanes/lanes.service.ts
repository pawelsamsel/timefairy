import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { LaneType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLaneDto, UpdateLaneDto } from "./lanes.dto";

@Injectable()
export class LanesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.lane.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  create(userId: string, dto: CreateLaneDto) {
    return this.prisma.lane.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        color: dto.color ?? "#00509d",
        sortOrder: dto.sortOrder ?? 0,
        isDefault: false,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateLaneDto) {
    const lane = await this.prisma.lane.findFirst({ where: { id, userId } });
    if (!lane) throw new NotFoundException("Lane not found");
    if (lane.isDefault && dto.type && dto.type !== lane.type) {
      throw new BadRequestException("Cannot change type of default lane");
    }
    return this.prisma.lane.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const lane = await this.prisma.lane.findFirst({ where: { id, userId } });
    if (!lane) throw new NotFoundException("Lane not found");
    if (lane.type === LaneType.LOGGED) {
      throw new BadRequestException("Cannot delete main lane");
    }
    await this.prisma.lane.delete({ where: { id } });
    return { ok: true };
  }
}
