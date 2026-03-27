import type { DraftSessionExercise, SessionExercise } from "./types";

export interface ProgrammingDraft {
  sets: string;
  repsText: string;
  targetWeightKg: string;
  restSeconds: string;
  notes: string;
  tempo: string;
  rir: string;
}

export type ProgrammingSource = Pick<
  SessionExercise | DraftSessionExercise,
  "sets" | "repsText" | "targetWeightKg" | "restSeconds" | "notes" | "tempo" | "rir"
>;

export function createProgrammingDraft(entry?: ProgrammingSource): ProgrammingDraft {
  return {
    sets: `${entry?.sets ?? 3}`,
    repsText: entry?.repsText ?? "8-12",
    targetWeightKg:
      typeof entry?.targetWeightKg === "number" ? `${entry.targetWeightKg}` : "",
    restSeconds:
      typeof entry?.restSeconds === "number" ? `${entry.restSeconds}` : "",
    notes: entry?.notes ?? "",
    tempo: entry?.tempo ?? "",
    rir: typeof entry?.rir === "number" ? `${entry.rir}` : "",
  };
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatProgrammingSummary(entry: ProgrammingSource) {
  const pieces = [`${entry.sets} sets`, `${entry.repsText} reps`];

  if (typeof entry.targetWeightKg === "number") {
    pieces.push(`${entry.targetWeightKg}kg`);
  }

  if (typeof entry.restSeconds === "number") {
    pieces.push(`${entry.restSeconds}s rest`);
  }

  if (entry.tempo) {
    pieces.push(`Tempo ${entry.tempo}`);
  }

  if (typeof entry.rir === "number") {
    pieces.push(`${entry.rir} RIR`);
  }

  return pieces.join(" • ");
}
