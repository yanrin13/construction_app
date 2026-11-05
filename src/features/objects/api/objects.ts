import { supabase } from "@/shared/api/supabase";

export interface ConstructionObject {
  id: string;
  name: string;
  address: string;
  tasks: {
    count: number;
  }[];
}

export interface ObjectInput {
  name: string;
  address: string;
}

// Создание объекта
export async function createObject(input: ObjectInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Пользователь не авторизован");

  const { data, error } = await supabase
    .from("objects")
    .insert({
      ...input,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Редактирование объекта
export async function updateObject(id: string, input: ObjectInput) {
  const { data, error } = await supabase
    .from("objects")
    .update({
      name: input.name,
      address: input.address,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Удаление объекта
export async function deleteObject(id: string) {
  const { error } = await supabase.rpc("soft_delete_object", {
    object_id: id,
  });

  if (error) throw error;
}

export async function getObjects(): Promise<ConstructionObject[]> {
  const { data, error } = await supabase
    .from("objects")
    .select(
      `
      id,
      name,
      address,
      tasks(count)
    `,
    )
    .is("deleted_at", null)
    .is("tasks.deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as ConstructionObject[];
}
