import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LaneType } from "@prisma/client";

@Injectable()
export class LanesHelperService {
  constructor(private prisma: PrismaService) {}

  async createDefaultLanes(userId: string) {
    const defaults = [
      { name: "Główny", type: LaneType.LOGGED, color: "#00509d", sortOrder: 0 },
      { name: "Międzyczas", type: LaneType.CUSTOM, color: "#003f88", sortOrder: 1 },
      { name: "Planowany", type: LaneType.PLANNED, color: "#00296b", sortOrder: 2 },
      { name: "Wydarzenia", type: LaneType.EVENTS, color: "#fdc500", sortOrder: 3 },
    ];

    await this.prisma.lane.createMany({
      data: defaults.map((lane) => ({ userId, isDefault: true, ...lane })),
    });
  }

  async getLoggedLaneId(userId: string): Promise<string> {
    const lane = await this.prisma.lane.findFirst({
      where: { userId, type: LaneType.LOGGED, isDefault: true },
    });
    if (!lane) {
      throw new BadRequestException("Default logged lane not found");
    }
    return lane.id;
  }
}
