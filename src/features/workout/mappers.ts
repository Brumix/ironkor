import type { RoutineDetailed } from "@/features/workout/types";

import type { RoutineDetailedRecord } from "@convex/types";

export function mapRoutineDetailed(doc: RoutineDetailedRecord): RoutineDetailed {
  return doc;
}
