import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto, UpdateClientDto } from "./clients.dto";

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.client.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  create(userId: string, dto: CreateClientDto) {
    return this.prisma.client.create({ data: { userId, ...dto } });
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException("Client not found");
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException("Client not found");
    await this.prisma.client.delete({ where: { id } });
    return { ok: true };
  }
}
