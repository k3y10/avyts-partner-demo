import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getPrismaClient, type PrismaObservationRecord } from "@/lib/server/prisma";
import type { FieldObservation } from "@/types/terrain";

const STORAGE_DIR = process.env.AVYTS_OBSERVATION_STORAGE_DIR
  ? path.resolve(process.env.AVYTS_OBSERVATION_STORAGE_DIR)
  : process.env.VERCEL
    ? path.join(tmpdir(), "avyts-terrain-intel")
    : path.join(process.cwd(), "data", "user-data");
const STORAGE_PATH = path.join(STORAGE_DIR, "observations.json");

async function ensureStorage() {
  await mkdir(STORAGE_DIR, { recursive: true });
}

async function readStoredObservations() {
  try {
    const payload = await readFile(STORAGE_PATH, "utf8");
    return JSON.parse(payload) as FieldObservation[];
  } catch {
    return [];
  }
}

async function writeStoredObservations(observations: FieldObservation[]) {
  await ensureStorage();
  await writeFile(STORAGE_PATH, JSON.stringify(observations, null, 2));
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toFieldObservation(record: PrismaObservationRecord): FieldObservation {
  return {
    id: record.id,
    type: record.type as FieldObservation["type"],
    zoneId: record.zoneId,
    source: record.source,
    observedAt: record.observedAt.toISOString(),
    title: record.title,
    summary: record.summary,
    locationName: record.locationName,
    geometry: record.geometry as FieldObservation["geometry"],
    tags: asStringArray(record.tags),
    avalancheObserved: record.avalancheObserved,
    media: asStringArray(record.media),
  };
}

async function listPrismaObservations() {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return null;
  }

  const records = await prisma.observation.findMany({
    orderBy: { observedAt: "desc" },
    take: 100,
  });

  return records.map(toFieldObservation);
}

async function savePrismaObservation(observation: FieldObservation) {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return null;
  }

  const record = await prisma.observation.upsert({
    where: { id: observation.id },
    update: {
      type: observation.type,
      zoneId: observation.zoneId,
      source: observation.source,
      observedAt: new Date(observation.observedAt),
      title: observation.title,
      summary: observation.summary,
      locationName: observation.locationName,
      geometry: observation.geometry,
      tags: observation.tags,
      avalancheObserved: observation.avalancheObserved,
      media: observation.media,
    },
    create: {
      id: observation.id,
      type: observation.type,
      zoneId: observation.zoneId,
      source: observation.source,
      observedAt: new Date(observation.observedAt),
      title: observation.title,
      summary: observation.summary,
      locationName: observation.locationName,
      geometry: observation.geometry,
      tags: observation.tags,
      avalancheObserved: observation.avalancheObserved,
      media: observation.media,
    },
  });

  return toFieldObservation(record);
}

function sortObservations(observations: FieldObservation[]) {
  return [...observations].sort((left, right) => right.observedAt.localeCompare(left.observedAt));
}

export async function listObservations() {
  const prismaObservations = await listPrismaObservations();
  if (prismaObservations) {
    return sortObservations(prismaObservations);
  }

  const stored = await readStoredObservations();
  return sortObservations(stored);
}

export async function saveObservation(observation: FieldObservation) {
  const prismaObservation = await savePrismaObservation(observation);
  if (prismaObservation) {
    return prismaObservation;
  }

  const stored = await readStoredObservations();
  const next = [observation, ...stored].slice(0, 100);
  await writeStoredObservations(next);
  return observation;
}