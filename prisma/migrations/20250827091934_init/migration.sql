-- CreateTable
CREATE TABLE "public"."User" (
    "krid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "athleteId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("krid")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" BIGINT NOT NULL,
    "userKRId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "totalElevation" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "startDateLocal" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "workoutType" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userKRId_fkey" FOREIGN KEY ("userKRId") REFERENCES "public"."User"("krid") ON DELETE RESTRICT ON UPDATE CASCADE;
