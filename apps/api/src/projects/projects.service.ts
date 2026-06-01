import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, timeEntries: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { timeEntries: true } },
          },
        },
        _count: { select: { tasks: true, timeEntries: true } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, userId },
    });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.project.create({
      data: { userId, ...dto },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException("Project not found");
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, userId },
      });
      if (!client) throw new NotFoundException("Client not found");
    }
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException("Project not found");
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }
}
