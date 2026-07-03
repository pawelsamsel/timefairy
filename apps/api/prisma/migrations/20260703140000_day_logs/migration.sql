CREATE TABLE "DayLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayLog_userId_date_key" ON "DayLog"("userId", "date");
CREATE INDEX "DayLog_userId_idx" ON "DayLog"("userId");
CREATE INDEX "DayLog_date_idx" ON "DayLog"("date");

ALTER TABLE "DayLog" ADD CONSTRAINT "DayLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
