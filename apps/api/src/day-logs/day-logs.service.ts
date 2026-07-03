import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { formatTaskDateOnly, parseOptionalTaskDate } from "../tasks/task-schedule.util";
import { DayLogListQueryDto, UpsertDayLogDto } from "./day-logs.dto";

function isWorkDayDate(dateStr: string, includeSaturdays: boolean, includeSundays: boolean): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  if (dayOfWeek === 0) return includeSundays;
  if (dayOfWeek === 6) return includeSaturdays;
  return true;
}

@Injectable()
export class DayLogsService {
  constructor(private prisma: PrismaService) {}

  private parseDateParam(value: string): Date {
    const parsed = parseOptionalTaskDate(value);
    if (!parsed) throw new BadRequestException("Expected date in YYYY-MM-DD format");
    return parsed;
  }

  private toState(date: string, row: { note: string; isDayOff: boolean } | null) {
    if (!row) {
      return { date, note: "", isDayOff: null as boolean | null };
    }
    return {
      date,
      note: row.note,
      isDayOff: row.isDayOff,
    };
  }

  async findInRange(userId: string, query: DayLogListQueryDto) {
    const from = this.parseDateParam(query.from);
    const to = this.parseDateParam(query.to);
    if (query.from > query.to) {
      throw new BadRequestException("from must be on or before to");
    }

    const rows = await this.prisma.dayLog.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      date: formatTaskDateOnly(row.date)!,
      note: row.note,
      isDayOff: row.isDayOff,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async findOne(userId: string, dateParam: string) {
    const date = this.parseDateParam(dateParam);
    const row = await this.prisma.dayLog.findUnique({
      where: { userId_date: { userId, date } },
    });
    return this.toState(dateParam, row);
  }

  async upsert(userId: string, dateParam: string, dto: UpsertDayLogDto) {
    const date = this.parseDateParam(dateParam);
    const note = dto.note !== undefined ? dto.note : undefined;
    const isDayOff = dto.isDayOff;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");

    const includeSaturdays = user.includeSaturdays;
    const includeSundays = user.includeSundays;
    const defaultWorkDay = isWorkDayDate(dateParam, includeSaturdays, includeSundays);

    const existing = await this.prisma.dayLog.findUnique({
      where: { userId_date: { userId, date } },
    });

    const nextNote = note !== undefined ? note : (existing?.note ?? "");
    const nextDayOff = isDayOff !== undefined ? isDayOff : (existing?.isDayOff ?? false);

    const shouldPersist =
      nextNote.trim().length > 0 ||
      nextDayOff ||
      (!defaultWorkDay && isDayOff === false);

    if (!shouldPersist) {
      if (existing) {
        await this.prisma.dayLog.delete({ where: { id: existing.id } });
      }
      return this.toState(dateParam, null);
    }

    const saved = await this.prisma.dayLog.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        note: nextNote,
        isDayOff: nextDayOff,
      },
      update: {
        ...(note !== undefined ? { note: nextNote } : {}),
        ...(isDayOff !== undefined ? { isDayOff: nextDayOff } : {}),
      },
    });

    return this.toState(dateParam, saved);
  }
}
