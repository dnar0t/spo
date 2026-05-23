-- AlterTable
ALTER TABLE "sync_runs" ADD COLUMN     "current_stage" TEXT,
ADD COLUMN     "stage_details" JSONB;
