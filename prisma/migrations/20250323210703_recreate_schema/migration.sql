-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationToken" TEXT;

-- CreateTable
CREATE TABLE "PgSession" (
    "sid" VARCHAR NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "PgSession_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "PgSession"("expire");
