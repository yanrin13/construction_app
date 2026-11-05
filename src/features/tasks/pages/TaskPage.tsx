import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  getTaskById,
  getTaskHistory,
  getExecutors,
  transitionTask,
  updateTask,
  deleteTask,
  type TaskStatus,
  type TaskInput,
} from "../api/tasks";

import { getObjects } from "../../objects/api/objects";

const statusLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  accepted: "Принята",
  rework: "На доработке",
};

export default function TaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectId, setObjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const {
    data: task,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId!),
    enabled: !!taskId,
  });

  const {
    data: history,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useQuery({
    queryKey: ["task-history", taskId],
    queryFn: () => getTaskHistory(taskId!),
    enabled: !!taskId,
  });

  const { data: executors = [] } = useQuery({
    queryKey: ["executors"],
    queryFn: getExecutors,
    enabled: profile?.role === "manager",
  });

  const { data: objects = [] } = useQuery({
    queryKey: ["objects"],
    queryFn: getObjects,
    enabled: profile?.role === "manager",
  });

  useEffect(() => {
    if (!task) return;

    setTitle(task.title);
    setDescription(task.description ?? "");
    setObjectId(task.object_id);
    setAssigneeId(task.assignee_id);
  }, [task]);

  const invalidateTaskData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
      queryClient.invalidateQueries({
        queryKey: ["task-history", taskId],
      }),
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["objects"] }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: ({
      status,
      comment,
    }: {
      status: TaskStatus;
      comment?: string;
    }) => transitionTask(taskId!, status, comment),

    onSuccess: async () => {
      setComment("");
      await invalidateTaskData();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: TaskInput) => updateTask(taskId!, input),

    onSuccess: async () => {
      setIsEditing(false);
      await invalidateTaskData();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId!),

    onSuccess: async () => {
      await invalidateTaskData();
      navigate("/objects");
    },
  });

  if (isLoading) return <p>Загрузка задачи...</p>;

  if (isError) {
    return <p>Ошибка загрузки задачи: {error.message}</p>;
  }

  if (!task || !profile) {
    return <p>Задача не найдена.</p>;
  }

  const isManager = profile.role === "manager";
  const isAssignee = task.assignee_id === profile.id;

  const canStart =
    !isManager &&
    isAssignee &&
    (task.status === "new" || task.status === "rework");

  const canSubmit = !isManager && isAssignee && task.status === "in_progress";

  const canReview = isManager && task.status === "review";

  const handleTransition = (status: TaskStatus) => {
    if (status === "rework" && !comment.trim()) return;

    statusMutation.mutate({
      status,
      comment: comment.trim() || undefined,
    });
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !objectId || !assigneeId) return;

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      object_id: objectId,
      assignee_id: assigneeId,
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить задачу «${task.title}»? Это действие скроет её из рабочих списков.`,
    );

    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  const handleCancelEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setObjectId(task.object_id);
    setAssigneeId(task.assignee_id);
    setIsEditing(false);
  };

  return (
    <main>
      <Link to={isManager ? "/objects" : "/my-tasks"}>← Назад</Link>

      {isEditing ? (
        <section>
          <h1>Редактирование задачи</h1>

          <form onSubmit={handleSave}>
            <div>
              <label htmlFor="task-title">Название задачи</label>
              <input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="task-description">Описание</label>
              <textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </div>

            <div>
              <label htmlFor="task-object">Строительный объект</label>
              <select
                id="task-object"
                value={objectId}
                onChange={(event) => setObjectId(event.target.value)}
                required
              >
                <option value="">Выберите объект</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-assignee">Исполнитель</label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                required
              >
                <option value="">Выберите исполнителя</option>
                {executors.map((executor) => (
                  <option key={executor.id} value={executor.id}>
                    {executor.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={
                updateMutation.isPending ||
                !title.trim() ||
                !objectId ||
                !assigneeId
              }
            >
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </button>

            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={updateMutation.isPending}
            >
              Отмена
            </button>
          </form>

          {updateMutation.isError && (
            <p>Ошибка сохранения: {updateMutation.error.message}</p>
          )}
        </section>
      ) : (
        <>
          <h1>{task.title}</h1>

          <p>
            <strong>Статус:</strong> {statusLabels[task.status]}
          </p>

          <p>
            <strong>Объект:</strong> {task.objects?.name ?? "Неизвестен"}
          </p>

          <p>
            <strong>Адрес:</strong> {task.objects?.address ?? "Не указан"}
          </p>

          <p>
            <strong>Описание:</strong> {task.description || "Нет описания"}
          </p>

          <p>
            <strong>Создана:</strong>{" "}
            {new Date(task.created_at).toLocaleString()}
          </p>

          <p>
            <strong>Обновлена:</strong>{" "}
            {new Date(task.updated_at).toLocaleString()}
          </p>

          {isManager && (
            <section>
              <h2>Управление задачей</h2>

              <button onClick={() => setIsEditing(true)}>Редактировать</button>

              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Удаление..." : "Удалить задачу"}
              </button>

              {deleteMutation.isError && (
                <p>Ошибка удаления: {deleteMutation.error.message}</p>
              )}
            </section>
          )}

          {!isManager && !isAssignee && (
            <p>Эта задача назначена другому исполнителю.</p>
          )}

          {(canReview || canStart || canSubmit) && (
            <section>
              <h2>Изменение статуса</h2>

              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Комментарий к изменению статуса"
                rows={4}
              />

              {canStart && (
                <button
                  disabled={statusMutation.isPending}
                  onClick={() => handleTransition("in_progress")}
                >
                  Начать работу
                </button>
              )}

              {canSubmit && (
                <button
                  disabled={statusMutation.isPending}
                  onClick={() => handleTransition("review")}
                >
                  Отправить на проверку
                </button>
              )}

              {canReview && (
                <>
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() => handleTransition("accepted")}
                  >
                    Принять задачу
                  </button>

                  <button
                    disabled={statusMutation.isPending || !comment.trim()}
                    onClick={() => handleTransition("rework")}
                  >
                    Вернуть на доработку
                  </button>
                </>
              )}
            </section>
          )}

          {statusMutation.isError && (
            <p>Ошибка изменения статуса: {statusMutation.error.message}</p>
          )}
        </>
      )}

      <hr />

      <h2>История изменений</h2>

      {isHistoryLoading && <p>Загрузка истории...</p>}

      {isHistoryError && <p>Не удалось загрузить историю.</p>}

      {!isHistoryLoading && !isHistoryError && !history?.length && (
        <p>История изменений пока пуста.</p>
      )}

      {history?.map((item) => (
        <article key={item.id}>
          <p>
            {item.from_status ? statusLabels[item.from_status] : "Создана"}
            {" → "}
            {statusLabels[item.to_status]}
          </p>

          {item.comment && <p>Комментарий: {item.comment}</p>}

          <small>{new Date(item.created_at).toLocaleString()}</small>
        </article>
      ))}
    </main>
  );
}
