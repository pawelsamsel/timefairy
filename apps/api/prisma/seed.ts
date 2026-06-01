import { PrismaClient, LaneType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEFAULT_LANES = [
  { name: "Główny", type: LaneType.LOGGED, color: "#22c55e", sortOrder: 0 },
  { name: "Międzyczas", type: LaneType.CUSTOM, color: "#a855f7", sortOrder: 1 },
  { name: "Planowany", type: LaneType.PLANNED, color: "#3b82f6", sortOrder: 2 },
  { name: "Wydarzenia", type: LaneType.EVENTS, color: "#f59e0b", sortOrder: 3 },
] as const;

async function createDefaultLanes(userId: string) {
  for (const lane of DEFAULT_LANES) {
    await prisma.lane.create({
      data: { userId, isDefault: true, ...lane },
    });
  }
}

async function ensureDefaultLanes(userId: string) {
  const existing = await prisma.lane.findMany({ where: { userId } });
  if (existing.length === 0) {
    await createDefaultLanes(userId);
    return;
  }
  for (const spec of DEFAULT_LANES) {
    const match = existing.find((l) => l.type === spec.type && l.isDefault);
    if (match) {
      await prisma.lane.update({
        where: { id: match.id },
        data: { name: spec.name, color: spec.color, sortOrder: spec.sortOrder },
      });
    } else {
      await prisma.lane.create({
        data: { userId, isDefault: true, ...spec },
      });
    }
  }
}

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, registrationEnabled: true },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@timefairy.local" },
    update: {},
    create: {
      email: "admin@timefairy.local",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      timezone: "UTC",
    },
  });

  await ensureDefaultLanes(admin.id);

  const demoClient = await prisma.client.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      userId: admin.id,
      name: "Demo Client",
      note: "Sample client for development",
    },
  });

  await prisma.project.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      userId: admin.id,
      clientId: demoClient.id,
      name: "Demo Project",
      hourlyRate: 100,
      currency: "PLN",
      note: "Sample project",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
