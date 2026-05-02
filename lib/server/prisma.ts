import "server-only";

type PrismaObservationRecord = {
  id: string;
  type: string;
  zoneId: string;
  source: string;
  observedAt: Date;
  title: string;
  summary: string;
  locationName: string;
  geometry: unknown;
  tags: unknown;
  avalancheObserved: boolean;
  media: unknown;
};

type PrismaObservationDelegate = {
  findMany(args: unknown): Promise<PrismaObservationRecord[]>;
  upsert(args: unknown): Promise<PrismaObservationRecord>;
};

type PrismaClientLike = {
  observation: PrismaObservationDelegate;
};

declare global {
  var __avytsPrismaClient: PrismaClientLike | undefined;
}

async function importPrismaClientModule(): Promise<{ PrismaClient: new () => PrismaClientLike } | null> {
  try {
    return await (0, eval)("import('@prisma/client')") as { PrismaClient: new () => PrismaClientLike };
  } catch {
    return null;
  }
}

export async function getPrismaClient(): Promise<PrismaClientLike | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  if (globalThis.__avytsPrismaClient) {
    return globalThis.__avytsPrismaClient;
  }

  const prismaModule = await importPrismaClientModule();
  if (!prismaModule) {
    return null;
  }

  const client = new prismaModule.PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__avytsPrismaClient = client;
  }

  return client;
}

export type { PrismaObservationRecord };