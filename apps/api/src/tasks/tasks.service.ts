import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.dto";

const taskInclude = {
  project: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  _count: { select: { timeEntries: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string, projectId?: string, clientId?: string) {
    return this.prisma.task.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
        ...(!projectId && clientId ? { project: { clientId } } : {}),
      },
      include: taskInclude,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: {
        ...taskInclude,
        timeEntries: {
          orderBy: [{ startAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
          take: 100,
          include: {
            lane: { select: { id: true, name: true, color: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });
    if (!project) throw new NotFoundException("Project not found");
    const maxSort = await this.prisma.task.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    return this.prisma.task.create({
      data: {
        userId,
        projectId: dto.projectId,
        clientId: dto.clientId ?? project.clientId,
        title: dto.title,
        externalId: dto.externalId || null,
        externalUrl: dto.externalUrl || null,
        status: dto.status,
        note: dto.note,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: taskInclude,
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException("Task not found");

    let clientId = dto.clientId;
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, userId },
      });
      if (!project) throw new NotFoundException("Project not found");
      if (clientId === undefined) clientId = project.clientId;
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        clientId,
        title: dto.title,
        externalId: dto.externalId !== undefined ? dto.externalId || null : undefined,
        externalUrl: dto.externalUrl !== undefined ? dto.externalUrl || null : undefined,
        status: dto.status,
        note: dto.note,
      },
      include: taskInclude,
    });
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException("Task not found");
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  async reorder(userId: string, orderedIds: string[]) {
    if (orderedIds.length === 0) return { ok: true };

    const allTasks = await this.prisma.task.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: { id: true },
    });

    const allIds = allTasks.map((task) => task.id);
    const orderedSet = new Set(orderedIds);

    for (const id of orderedIds) {
      if (!allIds.includes(id)) {
        throw new NotFoundException("Task not found");
      }
    }

    let reorderIndex = 0;
    const mergedIds = allIds.map((id) => {
      if (!orderedSet.has(id)) return id;
      return orderedIds[reorderIndex++]!;
    });

    await this.prisma.$transaction(
      mergedIds.map((id, index) =>
        this.prisma.task.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { ok: true };
  }
}
