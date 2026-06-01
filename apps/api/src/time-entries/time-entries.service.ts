import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LanesHelperService } from "../common/lanes-helper.service";
import {
  CreateTimeEntryDto,
  TimeEntryListQueryDto,
  TimeEntrySummaryQueryDto,
  UpdateTimeEntryDto,
} from "./time-entries.dto";

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private lanesHelper: LanesHelperService,
  ) {}

  private resolveDuration(dto: CreateTimeEntryDto | UpdateTimeEntryDto): number | null {
    if (dto.durationMinutes) return dto.durationMinutes;
    if (dto.startAt && dto.endAt) {
      const start = new Date(dto.startAt).getTime();
      const end = new Date(dto.endAt).getTime();
      if (end <= start) throw new BadRequestException("endAt must be after startAt");
      return Math.round((end - start) / 60000);
    }
    return null;
  }

  private async resolveProjectAndClient(
    userId: string,
    input: { taskId?: string | null; projectId?: string | null; clientId?: string | null },
  ): Promise<{ projectId?: string | null; clientId?: string | null }> {
    let projectId = input.projectId ?? undefined;
    let clientId = input.clientId ?? undefined;

    if (input.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: input.taskId, userId },
      });
      if (!task) throw new NotFoundException("Task not found");
      if (projectId && projectId !== task.projectId) {
        throw new BadRequestException("Task does not belong to the selected project");
      }
      projectId = task.projectId;
      clientId = clientId ?? task.clientId ?? undefined;
    }

    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, userId },
      });
      if (!project) throw new NotFoundException("Project not found");
      if (!clientId) clientId = project.clientId;
    }

    return { projectId: projectId ?? null, clientId: clientId ?? null };
  }

  private applyEntryFilters(
    where: Prisma.TimeEntryWhereInput,
    query: {
      from?: string;
      to?: string;
      clientId?: string;
      projectId?: string;
      laneId?: string;
    },
  ) {
    if (query.laneId) {
      where.laneId = query.laneId;
    }
    if (query.projectId) {
      where.projectId = query.projectId;
    }

    const and: Prisma.TimeEntryWhereInput[] = [];

    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      const startRange: Prisma.DateTimeNullableFilter = {};
      const createdRange: Prisma.DateTimeFilter = {};
      if (from) {
        startRange.gte = from;
        createdRange.gte = from;
      }
      if (to) {
        startRange.lte = to;
        createdRange.lte = to;
      }
      and.push({
        OR: [
          { startAt: startRange },
          { startAt: null, createdAt: createdRange },
        ],
      });
    }

    if (query.clientId) {
      and.push({
        OR: [
          { clientId: query.clientId },
          { clientId: null, project: { clientId: query.clientId } },
        ],
      });
    }

    if (and.length > 0) {
      where.AND = and;
    }
  }

  findAll(userId: string, query: TimeEntryListQueryDto = {}) {
    const where: Prisma.TimeEntryWhereInput = { userId };
    this.applyEntryFilters(where, query);

    return this.prisma.timeEntry.findMany({
      where,
      include: {
        lane: { select: { id: true, name: true, type: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
        client: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, externalId: true } },
      },
      orderBy: [{ startAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
  }

  async create(userId: string, dto: CreateTimeEntryDto) {
    const laneId = dto.laneId ?? (await this.lanesHelper.getLoggedLaneId(userId));
    const durationMinutes = this.resolveDuration(dto);
    if (dto.endAt && !dto.startAt) {
      throw new BadRequestException("endAt requires startAt");
    }
    if (!durationMinutes && !dto.startAt) {
      throw new BadRequestException("Provide durationMinutes or startAt");
    }

    const { projectId, clientId } = await this.resolveProjectAndClient(userId, {
      taskId: dto.taskId,
      projectId: dto.projectId,
      clientId: dto.clientId,
    });

    return this.prisma.timeEntry.create({
      data: {
        userId,
        laneId,
        taskId: dto.taskId,
        projectId,
        clientId,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        durationMinutes,
        title: dto.title,
        note: dto.note,
        source: dto.source ?? "WEB",
      },
      include: {
        lane: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, name: true, color: true } },
        client: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, externalId: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTimeEntryDto) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException("Time entry not found");

    let durationMinutes: number | null | undefined;
    if (dto.durationMinutes !== undefined) {
      durationMinutes = dto.durationMinutes;
    } else if (dto.endAt !== undefined || dto.startAt !== undefined) {
      durationMinutes = this.resolveDuration(dto);
    }

    const taskId = dto.taskId !== undefined ? dto.taskId : entry.taskId;
    const projectId = dto.projectId !== undefined ? dto.projectId : entry.projectId;
    const explicitClient = dto.clientId !== undefined;

    const resolved = await this.resolveProjectAndClient(userId, {
      taskId,
      projectId: projectId ?? undefined,
      clientId: explicitClient ? dto.clientId : undefined,
    });

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        laneId: dto.laneId,
        taskId: dto.taskId !== undefined ? dto.taskId : undefined,
        projectId: dto.projectId !== undefined ? resolved.projectId : undefined,
        clientId: explicitClient ? dto.clientId : resolved.clientId,
        startAt:
          dto.startAt !== undefined ? (dto.startAt ? new Date(dto.startAt) : null) : undefined,
        endAt: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : undefined,
        durationMinutes:
          durationMinutes !== undefined ? durationMinutes : undefined,
        title: dto.title,
        note: dto.note,
        source: dto.source,
      },
      include: {
        lane: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, name: true, color: true } },
        client: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException("Time entry not found");
    await this.prisma.timeEntry.delete({ where: { id } });
    return { ok: true };
  }

  async summary(userId: string, query: TimeEntrySummaryQueryDto) {
    const where: Prisma.TimeEntryWhereInput = { userId };
    this.applyEntryFilters(where, query);

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            client: { select: { id: true, name: true } },
          },
        },
        client: { select: { id: true, name: true } },
      },
    });

    const map = new Map<
      string,
      {
        projectId: string | null;
        projectName: string | null;
        clientId: string | null;
        clientName: string | null;
        totalMinutes: number;
      }
    >();

    for (const entry of entries) {
      const clientId = entry.clientId ?? entry.project?.client?.id ?? null;
      const clientName = entry.client?.name ?? entry.project?.client?.name ?? null;
      const key = `${entry.projectId ?? "none"}:${clientId ?? "none"}`;
      const existing = map.get(key) ?? {
        projectId: entry.project?.id ?? null,
        projectName: entry.project?.name ?? null,
        clientId,
        clientName,
        totalMinutes: 0,
      };
      existing.totalMinutes += entry.durationMinutes ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }
}
