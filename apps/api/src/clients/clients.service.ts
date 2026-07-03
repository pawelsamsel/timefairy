import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto, UpdateClientDto } from "./clients.dto";

type ClientRecord = {
  id: string;
  userId: string;
  name: string;
  note: string | null;
  dailyWorkHours: Prisma.Decimal | null;
  includeSaturdays: boolean | null;
  includeSundays: boolean | null;
  defaultHourlyRate: Prisma.Decimal | null;
  defaultCurrency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private serializeClient(client: ClientRecord) {
    return {
      id: client.id,
      name: client.name,
      note: client.note,
      dailyWorkHours: client.dailyWorkHours?.toNumber() ?? null,
      includeSaturdays: client.includeSaturdays,
      includeSundays: client.includeSundays,
      defaultHourlyRate: client.defaultHourlyRate?.toNumber() ?? null,
      defaultCurrency: client.defaultCurrency,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  private toClientData(dto: CreateClientDto | UpdateClientDto): Prisma.ClientUpdateInput {
    const data: Prisma.ClientUpdateInput = {};

    if ("name" in dto && dto.name !== undefined) data.name = dto.name;
    if ("note" in dto && dto.note !== undefined) data.note = dto.note;
    if ("dailyWorkHours" in dto) {
      data.dailyWorkHours =
        dto.dailyWorkHours == null ? null : new Prisma.Decimal(dto.dailyWorkHours);
    }
    if ("includeSaturdays" in dto) data.includeSaturdays = dto.includeSaturdays ?? null;
    if ("includeSundays" in dto) data.includeSundays = dto.includeSundays ?? null;
    if ("defaultHourlyRate" in dto) {
      data.defaultHourlyRate =
        dto.defaultHourlyRate == null ? null : new Prisma.Decimal(dto.defaultHourlyRate);
    }
    if ("defaultCurrency" in dto) data.defaultCurrency = dto.defaultCurrency ?? null;

    return data;
  }

  async findAll(userId: string) {
    const clients = await this.prisma.client.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    return clients.map((client) => this.serializeClient(client));
  }

  async create(userId: string, dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        userId,
        name: dto.name,
        note: dto.note,
        dailyWorkHours:
          dto.dailyWorkHours == null ? undefined : new Prisma.Decimal(dto.dailyWorkHours),
        includeSaturdays: dto.includeSaturdays ?? undefined,
        includeSundays: dto.includeSundays ?? undefined,
        defaultHourlyRate:
          dto.defaultHourlyRate == null ? undefined : new Prisma.Decimal(dto.defaultHourlyRate),
        defaultCurrency: dto.defaultCurrency ?? undefined,
      },
    });
    return this.serializeClient(client);
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException("Client not found");
    const updated = await this.prisma.client.update({
      where: { id },
      data: this.toClientData(dto),
    });
    return this.serializeClient(updated);
  }

  async remove(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException("Client not found");
    await this.prisma.client.delete({ where: { id } });
    return { ok: true };
  }
}
