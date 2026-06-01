"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
const DEFAULT_LANES = [
    { name: "Główny", type: client_1.LaneType.LOGGED, color: "#22c55e", sortOrder: 0 },
    { name: "Międzyczas", type: client_1.LaneType.CUSTOM, color: "#a855f7", sortOrder: 1 },
    { name: "Planowany", type: client_1.LaneType.PLANNED, color: "#3b82f6", sortOrder: 2 },
    { name: "Wydarzenia", type: client_1.LaneType.EVENTS, color: "#f59e0b", sortOrder: 3 },
];
async function createDefaultLanes(userId) {
    for (const lane of DEFAULT_LANES) {
        await prisma.lane.create({
            data: { userId, isDefault: true, ...lane },
        });
    }
}
async function ensureDefaultLanes(userId) {
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
        }
        else {
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
