import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import {
  USER_DATA_EXPORT_VERSION,
  userDataExportSchema,
  type UserDataExport,
  type UserDataImportResult,
} from "@timefairy/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { formatTaskDateOnly, parseOptionalTaskDate } from "../tasks/task-schedule.util";

type IdMap = Map<string, string>;

@Injectable()
export class UserDataService {
  constructor(private prisma: PrismaService) {}

  async exportForUser(userId: string): Promise<UserDataExport> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const [clients, lanes, projects, tasks, timeEntries, events, plannedBlocks] =
      await Promise.all([
        this.prisma.client.findMany({ where: { userId } }),
        this.prisma.lane.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
        this.prisma.project.findMany({ where: { userId } }),
        this.prisma.task.findMany({ where: { userId } }),
        this.prisma.timeEntry.findMany({ where: { userId } }),
        this.prisma.event.findMany({ where: { userId } }),
        this.prisma.plannedBlock.findMany({ where: { userId } }),
      ]);

    return {
      version: USER_DATA_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      lanes: lanes.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        isDefault: l.isDefault,
        color: l.color,
        sortOrder: l.sortOrder,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      projects: projects.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        name: p.name,
        color: p.color,
        hourlyRate: p.hourlyRate.toString(),
        currency: p.currency,
        note: p.note,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        clientId: t.clientId,
        title: t.title,
        externalId: t.externalId,
        externalUrl: t.externalUrl,
        status: t.status,
        note: t.note,
        sortOrder: t.sortOrder,
        pinned: t.pinned,
        scheduledFrom: formatTaskDateOnly(t.scheduledFrom),
        scheduledTo: formatTaskDateOnly(t.scheduledTo),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      timeEntries: timeEntries.map((e) => ({
        id: e.id,
        laneId: e.laneId,
        taskId: e.taskId,
        projectId: e.projectId,
        clientId: e.clientId,
        startAt: e.startAt?.toISOString() ?? null,
        endAt: e.endAt?.toISOString() ?? null,
        durationMinutes: e.durationMinutes,
        title: e.title,
        note: e.note,
        source: e.source,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      events: events.map((ev) => ({
        id: ev.id,
        laneId: ev.laneId,
        title: ev.title,
        startAt: ev.startAt.toISOString(),
        endAt: ev.endAt?.toISOString() ?? null,
        isAllDay: ev.isAllDay,
        isMomentary: ev.isMomentary,
        note: ev.note,
        createdAt: ev.createdAt.toISOString(),
        updatedAt: ev.updatedAt.toISOString(),
      })),
      plannedBlocks: plannedBlocks.map((b) => ({
        id: b.id,
        laneId: b.laneId,
        taskId: b.taskId,
        projectId: b.projectId,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        note: b.note,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    };
  }

  async importForUser(userId: string, raw: unknown): Promise<UserDataImportResult> {
    const parsed = userDataExportSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }
    const data = parsed.data;

    const result: UserDataImportResult = {
      created: {
        clients: 0,
        lanes: 0,
        projects: 0,
        tasks: 0,
        timeEntries: 0,
        events: 0,
        plannedBlocks: 0,
      },
      updated: {
        clients: 0,
        lanes: 0,
        projects: 0,
        tasks: 0,
        timeEntries: 0,
        events: 0,
        plannedBlocks: 0,
      },
      idRemapped: 0,
    };

    const idMap: IdMap = new Map();
    let remapped = 0;

    await this.prisma.$transaction(async (tx) => {
      const resolveId = async (
        table: "client" | "lane" | "project" | "task",
        exportedId: string,
      ): Promise<string> => {
        if (idMap.has(exportedId)) return idMap.get(exportedId)!;

        let existing: { userId: string } | null = null;
        if (table === "client") {
          existing = await tx.client.findUnique({ where: { id: exportedId } });
        } else if (table === "lane") {
          existing = await tx.lane.findUnique({ where: { id: exportedId } });
        } else if (table === "project") {
          existing = await tx.project.findUnique({ where: { id: exportedId } });
        } else {
          existing = await tx.task.findUnique({ where: { id: exportedId } });
        }

        if (!existing) {
          idMap.set(exportedId, exportedId);
          return exportedId;
        }
        if (existing.userId === userId) {
          idMap.set(exportedId, exportedId);
          return exportedId;
        }
        const newId = randomUUID();
        idMap.set(exportedId, newId);
        remapped += 1;
        return newId;
      };

      const mapRef = (id: string | null | undefined) => {
        if (!id) return null;
        return idMap.get(id) ?? id;
      };

      for (const c of data.clients) {
        const id = await resolveId("client", c.id);
        const existing = await tx.client.findUnique({ where: { id } });
        const payload = {
          userId,
          name: c.name,
          note: c.note,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        };
        if (existing) {
          await tx.client.update({ where: { id }, data: payload });
          result.updated.clients += 1;
        } else {
          await tx.client.create({ data: { id, ...payload } });
          result.created.clients += 1;
        }
      }

      for (const l of data.lanes) {
        const id = await resolveId("lane", l.id);
        const existing = await tx.lane.findUnique({ where: { id } });
        const payload = {
          userId,
          name: l.name,
          type: l.type,
          isDefault: l.isDefault,
          color: l.color,
          sortOrder: l.sortOrder,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        };
        if (existing) {
          await tx.lane.update({ where: { id }, data: payload });
          result.updated.lanes += 1;
        } else {
          await tx.lane.create({ data: { id, ...payload } });
          result.created.lanes += 1;
        }
      }

      for (const p of data.projects) {
        const id = await resolveId("project", p.id);
        const clientId = mapRef(p.clientId)!;
        const client = await tx.client.findFirst({ where: { id: clientId, userId } });
        if (!client) continue;

        const existing = await tx.project.findUnique({ where: { id } });
        const payload = {
          userId,
          clientId,
          name: p.name,
          color: p.color ?? "#00509d",
          hourlyRate: new Prisma.Decimal(p.hourlyRate),
          currency: p.currency,
          note: p.note,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        };
        if (existing) {
          await tx.project.update({ where: { id }, data: payload });
          result.updated.projects += 1;
        } else {
          await tx.project.create({ data: { id, ...payload } });
          result.created.projects += 1;
        }
      }

      for (const t of data.tasks) {
        const id = await resolveId("task", t.id);
        const projectId = mapRef(t.projectId)!;
        const project = await tx.project.findFirst({ where: { id: projectId, userId } });
        if (!project) continue;

        const clientId = t.clientId ? mapRef(t.clientId) : null;
        if (clientId) {
          const client = await tx.client.findFirst({ where: { id: clientId, userId } });
          if (!client) continue;
        }

        const existing = await tx.task.findUnique({ where: { id } });
        const payload = {
          userId,
          projectId,
          clientId,
          title: t.title,
          externalId: t.externalId,
          externalUrl: t.externalUrl,
          status: t.status,
          note: t.note,
          sortOrder: t.sortOrder ?? 0,
          pinned: t.pinned ?? false,
          scheduledFrom: t.scheduledFrom ? parseOptionalTaskDate(t.scheduledFrom) : null,
          scheduledTo: t.scheduledTo ? parseOptionalTaskDate(t.scheduledTo) : null,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        };
        if (existing) {
          await tx.task.update({ where: { id }, data: payload });
          result.updated.tasks += 1;
        } else {
          await tx.task.create({ data: { id, ...payload } });
          result.created.tasks += 1;
        }
      }

      for (const ev of data.events) {
        const id = await this.resolveEntryId(tx, userId, "event", ev.id, idMap, () => {
          remapped += 1;
        });
        const laneId = ev.laneId ? mapRef(ev.laneId) : null;
        if (laneId) {
          const lane = await tx.lane.findFirst({ where: { id: laneId, userId } });
          if (!lane) continue;
        }
        const existing = await tx.event.findUnique({ where: { id } });
        const payload = {
          userId,
          laneId,
          title: ev.title,
          startAt: new Date(ev.startAt),
          endAt: ev.endAt ? new Date(ev.endAt) : null,
          isAllDay: ev.isAllDay,
          isMomentary: ev.isMomentary,
          note: ev.note,
          createdAt: new Date(ev.createdAt),
          updatedAt: new Date(ev.updatedAt),
        };
        if (existing) {
          await tx.event.update({ where: { id }, data: payload });
          result.updated.events += 1;
        } else {
          await tx.event.create({ data: { id, ...payload } });
          result.created.events += 1;
        }
      }

      for (const b of data.plannedBlocks) {
        const id = await this.resolveEntryId(tx, userId, "plannedBlock", b.id, idMap, () => {
          remapped += 1;
        });
        const laneId = mapRef(b.laneId)!;
        const lane = await tx.lane.findFirst({ where: { id: laneId, userId } });
        if (!lane) continue;

        const taskId = b.taskId ? mapRef(b.taskId) : null;
        const projectId = b.projectId ? mapRef(b.projectId) : null;
        if (taskId && !(await tx.task.findFirst({ where: { id: taskId, userId } }))) continue;
        if (projectId && !(await tx.project.findFirst({ where: { id: projectId, userId } })))
          continue;

        const existing = await tx.plannedBlock.findUnique({ where: { id } });
        const payload = {
          userId,
          laneId,
          taskId,
          projectId,
          startAt: new Date(b.startAt),
          endAt: new Date(b.endAt),
          note: b.note,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        };
        if (existing) {
          await tx.plannedBlock.update({ where: { id }, data: payload });
          result.updated.plannedBlocks += 1;
        } else {
          await tx.plannedBlock.create({ data: { id, ...payload } });
          result.created.plannedBlocks += 1;
        }
      }

      for (const e of data.timeEntries) {
        const id = await this.resolveEntryId(tx, userId, "timeEntry", e.id, idMap, () => {
          remapped += 1;
        });
        const laneId = mapRef(e.laneId)!;
        const lane = await tx.lane.findFirst({ where: { id: laneId, userId } });
        if (!lane) continue;

        const taskId = e.taskId ? mapRef(e.taskId) : null;
        const projectId = e.projectId ? mapRef(e.projectId) : null;
        const clientId = e.clientId ? mapRef(e.clientId) : null;
        if (taskId && !(await tx.task.findFirst({ where: { id: taskId, userId } }))) continue;
        if (projectId && !(await tx.project.findFirst({ where: { id: projectId, userId } })))
          continue;
        if (clientId && !(await tx.client.findFirst({ where: { id: clientId, userId } })))
          continue;

        const existing = await tx.timeEntry.findUnique({ where: { id } });
        const payload = {
          userId,
          laneId,
          taskId,
          projectId,
          clientId,
          startAt: e.startAt ? new Date(e.startAt) : null,
          endAt: e.endAt ? new Date(e.endAt) : null,
          durationMinutes: e.durationMinutes,
          title: e.title,
          note: e.note,
          source: e.source,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        };
        if (existing) {
          await tx.timeEntry.update({ where: { id }, data: payload });
          result.updated.timeEntries += 1;
        } else {
          await tx.timeEntry.create({ data: { id, ...payload } });
          result.created.timeEntries += 1;
        }
      }
    });

    result.idRemapped = remapped;
    return result;
  }

  private async resolveEntryId(
    tx: Prisma.TransactionClient,
    userId: string,
    table: "timeEntry" | "event" | "plannedBlock",
    exportedId: string,
    idMap: IdMap,
    onRemap: () => void,
  ): Promise<string> {
    if (idMap.has(exportedId)) return idMap.get(exportedId)!;

    let existing: { userId: string } | null = null;
    if (table === "timeEntry") {
      existing = await tx.timeEntry.findUnique({ where: { id: exportedId } });
    } else if (table === "event") {
      existing = await tx.event.findUnique({ where: { id: exportedId } });
    } else {
      existing = await tx.plannedBlock.findUnique({ where: { id: exportedId } });
    }

    if (!existing) {
      idMap.set(exportedId, exportedId);
      return exportedId;
    }
    if (existing.userId === userId) {
      idMap.set(exportedId, exportedId);
      return exportedId;
    }
    const newId = randomUUID();
    idMap.set(exportedId, newId);
    onRemap();
    return newId;
  }
}
