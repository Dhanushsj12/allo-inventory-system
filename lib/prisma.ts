import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const transientDatabaseCodes = new Set([
  "08000",
  "08003",
  "08006",
  "57P01",
  "57P02",
  "P1011",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to .env locally and to Vercel Environment Variables.");
  }

  const url = new URL(databaseUrl);

  if (url.hostname.includes("supabase.co")) {
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString();
}

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  max: process.env.NODE_ENV === "production" ? 1 : 5,
  ssl: {
    rejectUnauthorized: false,
  },
});

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function isTransientDatabaseError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);

  return (
    Boolean(code && transientDatabaseCodes.has(code)) ||
    message.includes("Can't reach database server") ||
    message.includes("self-signed certificate in certificate chain") ||
    message.includes("Connection terminated") ||
    message.includes("Connection ended unexpectedly") ||
    message.includes("timeout expired")
  );
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isTransientDatabaseError(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }

  throw lastError;
}

export { prisma };
