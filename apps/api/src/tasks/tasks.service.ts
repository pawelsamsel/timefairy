import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto, UpdateTaskDto } from "./tasks.dto";
import {
  assertTaskScheduleRange,
  formatTaskDateOnly,
  parseOptionalTaskDate,
} from "./task-schedule.util";

const taskInclude = {
  project: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  _count: { select: { timeEntries: true } },
} as const;

function mapTask<T extends {
  scheduledFrom: Date | null;
  scheduledTo: Date | null;
}>(task: T) {
  return {
    ...task,
    scheduledFrom: formatTaskDateOnly(task.scheduledFrom),
    scheduledTo: formatTaskDateOnly(task.scheduledTo),
  };
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, projectId?: string, clientId?: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
        ...(!projectId && clientId ? { project: { clientId } } : {}),
      },
      include: taskInclude,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return tasks.map(mapTask);
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
    return mapTask(task);
  }

  async create(userId: string, dto: CreateTaskDto) {
    assertTaskScheduleRange(dto.scheduledFrom, dto.scheduledTo);

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });
    if (!project) throw new NotFoundException("Project not found");
    const maxSort = await this.prisma.task.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const task = await this.prisma.task.create({
      data: {
        userId,
        projectId: dto.projectId,
        clientId: dto.clientId ?? project.clientId,
        title: dto.title,
        externalId: dto.externalId || null,
        externalUrl: dto.externalUrl || null,
        status: dto.status,
        note: dto.note,
        pinned: dto.pinned ?? false,
        scheduledFrom: parseOptionalTaskDate(dto.scheduledFrom) ?? null,
        scheduledTo: parseOptionalTaskDate(dto.scheduledTo) ?? null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: taskInclude,
    });
    return mapTask(task);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException("Task not found");

    const nextFrom =
      dto.scheduledFrom !== undefined
        ? parseOptionalTaskDate(dto.scheduledFrom)
        : task.scheduledFrom;
    const nextTo =
      dto.scheduledTo !== undefined ? parseOptionalTaskDate(dto.scheduledTo) : task.scheduledTo;
    assertTaskScheduleRange(
      formatTaskDateOnly(nextFrom ?? null) ?? undefined,
      formatTaskDateOnly(nextTo ?? null) ?? undefined,
    );

    let clientId = dto.clientId;
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, userId },
      });
      if (!project) throw new NotFoundException("Project not found");
      if (clientId === undefined) clientId = project.clientId;
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        clientId,
        title: dto.title,
        externalId: dto.externalId !== undefined ? dto.externalId || null : undefined,
        externalUrl: dto.externalUrl !== undefined ? dto.externalUrl || null : undefined,
        status: dto.status,
        note: dto.note,
        pinned: dto.pinned,
        scheduledFrom:
          dto.scheduledFrom !== undefined ? parseOptionalTaskDate(dto.scheduledFrom) : undefined,
        scheduledTo:
          dto.scheduledTo !== undefined ? parseOptionalTaskDate(dto.scheduledTo) : undefined,
      },
      include: taskInclude,
    });
    return mapTask(updated);
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
