-- Auth.js tables, unused since the switch to Better Auth (0006 copied the account links).
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verificationToken" CASCADE;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "emailVerified";