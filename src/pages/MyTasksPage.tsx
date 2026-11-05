import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../app/providers/AuthProvider";
import { signOut } from "../features/auth/api/auth";

import {
  getMyTasks,
  transitionTask,
  type TaskStatus,
} from "../features/tasks/api/tasks";

const statusLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  accepted: "Принята",
  rework: "На доработке",
};

export default function MyTasksPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const {
    data: tasks,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: getMyTasks,
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      transitionTask(taskId, status),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["task"] }),
      ]);
    },
  });

  const filteredTasks = tasks?.filter(
    (task) => filter === "all" || task.status === filter,
  );

  if (isLoading) return <p>Загрузка задач...</p>;

  if (isError) {
    return <p>Ошибка загрузки: {error.message}</p>;
  }

  return (
    <main>
      <h1>Мои задачи</h1>

      <p>Исполнитель: {profile?.full_name}</p>

      <button onClick={() => signOut()}>Выйти</button>

      <hr />

      <h2>Фильтр по статусу</h2>

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as TaskStatus | "all")}
      >
        <option value="all">Все задачи</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <h2>Список задач</h2>

      {!filteredTasks?.length && <p>Задач с таким статусом нет.</p>}

      {filteredTasks?.map((task) => (
        <article key={task.id}>
          <h3>{task.title}</h3>

          <p>Объект: {task.objects?.name ?? "Неизвестный объект"}</p>

          <p>Адрес: {task.objects?.address ?? "Не указан"}</p>

          <p>Статус: {statusLabels[task.status]}</p>

          {task.description && <p>{task.description}</p>}

          <Link to={`/tasks/${task.id}`}>Открыть задачу</Link>

          {task.status === "new" && (
            <button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  taskId: task.id,
                  status: "in_progress",
                })
              }
            >
              Начать работу
            </button>
          )}

          {(task.status === "in_progress" || task.status === "rework") && (
            <button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  taskId: task.id,
                  status: "review",
                })
              }
            >
              Отправить на проверку
            </button>
          )}
        </article>
      ))}

      {statusMutation.isError && (
        <p>Ошибка изменения статуса: {statusMutation.error.message}</p>
      )}
    </main>
  );
}
