import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { SettingsModule } from "./settings/settings.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { ProjectsModule } from "./projects/projects.module";
import { TasksModule } from "./tasks/tasks.module";
import { LanesModule } from "./lanes/lanes.module";
import { TimeEntriesModule } from "./time-entries/time-entries.module";
import { HealthModule } from "./health/health.module";
import { UserDataModule } from "./user-data/user-data.module";
import { DayLogsModule } from "./day-logs/day-logs.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SettingsModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    TasksModule,
    LanesModule,
    TimeEntriesModule,
    UserDataModule,
    DayLogsModule,
    HealthModule,
  ],
})
export class AppModule {}
