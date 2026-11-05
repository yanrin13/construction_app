import { supabase } from "@/shared/api/supabase";

export type TaskStatus =
  | "new"
  | "in_progress"
  | "review"
  | "accepted"
  | "rework";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  object_id: string;
  assignee_id: string;
  created_by: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description: string | null;
  object_id: string;
  assignee_id: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  changed_by: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  comment: string | null;
  created_at: string;
}

export interface Executor {
  id: string;
  full_name: string;
}

export interface TaskWithObject extends Task {
  objects: {
    name: string;
    address: string;
  } | null;
}

export async function getObjectTasks(objectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("object_id", objectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Task[];
}

export async function getMyTasks(): Promise<TaskWithObject[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Пользователь не авторизован");

  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      objects (
        name,
        address
      )
    `,
    )
    .eq("assignee_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as TaskWithObject[];
}

export async function getTaskById(taskId: string): Promise<TaskWithObject> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      objects (
        name,
        address
      )
    `,
    )
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;

  return data as TaskWithObject;
}

export async function getExecutors(): Promise<Executor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "executor")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data as Executor[];
}

export async function createTask(input: TaskInput): Promise<Task> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Пользователь не авторизован");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...input,
      created_by: user.id,
      status: "new",
    })
    .select()
    .single();

  if (error) throw error;

  return data as Task;
}

export async function updateTask(
  taskId: string,
  input: TaskInput,
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      object_id: input.object_id,
      assignee_id: input.assignee_id,
    })
    .eq("id", taskId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) throw error;

  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_task", {
    p_task_id: taskId,
  });

  if (error) throw error;
}

export async function transitionTask(
  taskId: string,
  newStatus: TaskStatus,
  comment?: string,
): Promise<void> {
  const { error } = await supabase.rpc("transition_task", {
    p_task_id: taskId,
    p_new_status: newStatus,
    p_comment: comment ?? null,
  });

  if (error) throw error;
}

export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
  const { data, error } = await supabase
    .from("task_status_history")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as TaskHistory[];
}
