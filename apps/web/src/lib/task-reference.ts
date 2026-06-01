import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";

export function normalizeTaskReference(value: string): string {
  return value.trim();
}

export function findTaskByReference(
  tasks: Pick<TaskWithRelations, "id" | "externalId">[],
  reference: string,
): Pick<TaskWithRelations, "id" | "externalId"> | undefined {
  const needle = normalizeTaskReference(reference).toLowerCase();
  if (!needle) return undefined;
  return tasks.find((task) => task.externalId?.toLowerCase() === needle);
}

export async function resolveTaskIdForEntry(input: {
  projectId?: string;
  taskId?: string;
  taskReference?: string;
  title?: string;
  knownTasks?: Pick<TaskWithRelations, "id" | "title" | "externalId">[];
}): Promise<string | undefined> {
  if (input.taskId) return input.taskId;
  if (!input.projectId) return undefined;

  const reference = normalizeTaskReference(input.taskReference ?? "");
  if (!reference) return undefined;

  const tasks =
    input.knownTasks ?? (await api.listTasks({ projectId: input.projectId }));
  const existing = findTaskByReference(tasks, reference);
  if (existing) return existing.id;

  const created = await api.createTask({
    projectId: input.projectId,
    title: input.title?.trim() || reference,
    externalId: reference,
    status: TaskStatus.TODO,
  });
  return created.id;
}
