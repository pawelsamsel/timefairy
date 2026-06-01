import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LanesHelperService } from "../common/lanes-helper.service";
import {
  ChangeUserPasswordDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from "./users.dto";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  timezone: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private lanesHelper: LanesHelperService,
  ) {}

  async findPaginated(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();
    const status = query.status ?? "all";

    const where = {
      ...(status === "active" ? { active: true } : {}),
      ...(status === "inactive" ? { active: false } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already exists");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        timezone: dto.timezone ?? "UTC",
      },
      select: userSelect,
    });
    await this.lanesHelper.createDefaultLanes(user.id);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const target = await this.findOne(id);
    if (dto.role === Role.USER && target.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }
    if (dto.active === false && target.active) {
      await this.assertCanDeactivate(id, actorId);
    }
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
        select: userSelect,
      });
    } catch {
      throw new NotFoundException("User not found");
    }
  }

  async changePassword(id: string, dto: ChangeUserPasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
        select: userSelect,
      });
    } catch {
      throw new NotFoundException("User not found");
    }
  }

  async softDelete(id: string, actorId: string) {
    await this.assertCanDeactivate(id, actorId);
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: userSelect,
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { active: true },
      select: userSelect,
    });
  }

  async hardDelete(id: string, actorId: string) {
    const target = await this.findOne(id);
    if (id === actorId) {
      throw new BadRequestException("Cannot delete your own account");
    }
    if (target.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertCanDeactivate(targetId: string, actorId: string) {
    if (targetId === actorId) {
      throw new BadRequestException("Cannot deactivate your own account");
    }
    const target = await this.findOne(targetId);
    if (target.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(targetId);
    }
  }

  private async assertNotLastActiveAdmin(adminId: string) {
    const count = await this.prisma.user.count({
      where: { role: Role.ADMIN, active: true, id: { not: adminId } },
    });
    if (count === 0) {
      throw new BadRequestException("Cannot remove or deactivate the last active admin");
    }
  }
}
