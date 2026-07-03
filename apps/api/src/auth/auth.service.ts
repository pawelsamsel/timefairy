import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LanesHelperService } from "../common/lanes-helper.service";
import { ChangeOwnPasswordDto, LoginDto, RegisterDto } from "./auth.dto";
import { UpdateWorkHoursPreferencesDto } from "./work-hours.dto";
import { AuthPayload } from "../common/decorators";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private lanesHelper: LanesHelperService,
  ) {}

  private signTokens(payload: AuthPayload) {
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
      expiresIn: "8h",
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production",
      expiresIn: "7d",
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.active) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const payload: AuthPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      ...this.signTokens(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
      },
    };
  }

  async register(dto: RegisterDto) {
    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!settings?.registrationEnabled) {
      throw new ForbiddenException("Registration is disabled");
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });
    await this.lanesHelper.createDefaultLanes(user.id);
    const payload: AuthPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      ...this.signTokens(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<AuthPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-in-production",
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.active) {
        throw new UnauthorizedException();
      }
      const newPayload: AuthPayload = { sub: user.id, email: user.email, role: user.role };
      return this.signTokens(newPayload);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async changeOwnPassword(userId: string, dto: ChangeOwnPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      timezone: user.timezone,
    };
  }

  private serializeWorkHoursPreferences(user: {
    dailyWorkHours: Prisma.Decimal;
    includeSaturdays: boolean;
    includeSundays: boolean;
    onlyBillableProjects: boolean;
    trackTimeMode: "SINGLE" | "MULTI" | "ASK";
    minimalTaskMinutes: number;
    useTimeGrid: boolean;
  }) {
    return {
      dailyWorkHours: user.dailyWorkHours.toNumber(),
      includeSaturdays: user.includeSaturdays,
      includeSundays: user.includeSundays,
      onlyBillableProjects: user.onlyBillableProjects,
      trackTimeMode: user.trackTimeMode,
      minimalTaskMinutes: user.minimalTaskMinutes,
      useTimeGrid: user.useTimeGrid,
    };
  }

  async getWorkHoursPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.serializeWorkHoursPreferences(user);
  }

  async updateWorkHoursPreferences(userId: string, dto: UpdateWorkHoursPreferencesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        dailyWorkHours:
          dto.dailyWorkHours != null ? new Prisma.Decimal(dto.dailyWorkHours) : undefined,
        includeSaturdays: dto.includeSaturdays,
        includeSundays: dto.includeSundays,
        onlyBillableProjects: dto.onlyBillableProjects,
        trackTimeMode: dto.trackTimeMode,
        minimalTaskMinutes: dto.minimalTaskMinutes,
        useTimeGrid: dto.useTimeGrid,
      },
    });

    return this.serializeWorkHoursPreferences(updated);
  }
}
