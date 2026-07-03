import { BadRequestException } from "@nestjs/common";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalTaskDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (!ISO_DATE.test(value)) {
    throw new BadRequestException("Expected date in YYYY-MM-DD format");
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function assertTaskScheduleRange(from?: string | null, to?: string | null) {
  if (from && to && from > to) {
    throw new BadRequestException("Start date must be on or before due date");
  }
}

export function formatTaskDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
