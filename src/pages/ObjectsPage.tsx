import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../app/providers/AuthProvider";
import { signOut } from "../features/auth/api/auth";
import { Link } from "react-router-dom";

import {
  getObjects,
  createObject,
  updateObject,
  deleteObject,
  type ConstructionObject,
  type ObjectInput,
} from "../features/objects/api/objects";

import {
  getObjectTasks,
  getExecutors,
  createTask,
  type Task,
  type TaskInput,
} from "../features/tasks/api/tasks";

// Названия статусов
const statusLabels: Record<Task["status"], string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  accepted: "Принята",
  rework: "На доработке",
};

export default function ObjectsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Состояние формы объекта
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [editingObject, setEditingObject] = useState<ConstructionObject | null>(
    null,
  );

  // Раскрытый объект
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Состояние формы задачи
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  // Получение объектов
  const {
    data: objects,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["objects"],
    queryFn: getObjects,
  });

  // Получение задач выбранного объекта
  const {
    data: tasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
  } = useQuery({
    queryKey: ["tasks", selectedObjectId],
    queryFn: () => getObjectTasks(selectedObjectId!),
    enabled: !!selectedObjectId,
  });

  // Получение исполнителей
  const {
    data: executors,
    isLoading: isExecutorsLoading,
    isError: isExecutorsError,
    error: executorsError,
  } = useQuery({
    queryKey: ["executors"],
    queryFn: getExecutors,
  });

  // Очистка формы объекта
  const resetForm = () => {
    setName("");
    setAddress("");
    setEditingObject(null);
  };

  // Очистка формы задачи
  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskAssignee("");
  };

  // Создание объекта
  const createMutation = useMutation({
    mutationFn: createObject,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["objects"],
      });

      resetForm();
    },
  });

  // Редактирование объекта
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ObjectInput }) =>
      updateObject(id, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["objects"],
      });

      resetForm();
    },
  });

  // Удаление объекта
  const deleteMutation = useMutation({
    mutationFn: deleteObject,

    onSuccess: async (_, deletedObjectId) => {
      await queryClient.invalidateQueries({
        queryKey: ["objects"],
      });

      if (selectedObjectId === deletedObjectId) {
        setSelectedObjectId(null);
        resetTaskForm();
      }

      await queryClient.invalidateQueries({
        queryKey: ["tasks", deletedObjectId],
      });
    },
  });

  // Создание задачи
  const createTaskMutation = useMutation({
    mutationFn: createTask,

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", variables.object_id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["objects"],
        }),
      ]);

      resetTaskForm();
    },
  });

  const isObjectPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Отправка формы объекта
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const input: ObjectInput = {
      name: name.trim(),
      address: address.trim(),
    };

    if (!input.name || !input.address) return;

    if (editingObject) {
      updateMutation.mutate({
        id: editingObject.id,
        input,
      });
    } else {
      createMutation.mutate(input);
    }
  };

  // Редактирование объекта
  const handleEdit = (object: ConstructionObject) => {
    setEditingObject(object);
    setName(object.name);
    setAddress(object.address);
  };

  // Удаление объекта
  const handleDelete = (id: string) => {
    if (!window.confirm("Удалить этот объект?")) return;

    deleteMutation.mutate(id);
  };

  // Раскрытие задач
  const toggleTasks = (objectId: string) => {
    if (selectedObjectId === objectId) {
      setSelectedObjectId(null);
    } else {
      resetTaskForm();
      setSelectedObjectId(objectId);
    }
  };

  // Создание задачи
  const handleCreateTask = (
    e: React.FormEvent<HTMLFormElement>,
    objectId: string,
  ) => {
    e.preventDefault();

    const input: TaskInput = {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      object_id: objectId,
      assignee_id: taskAssignee,
    };

    if (!input.title || !input.assignee_id) return;

    createTaskMutation.mutate(input);
  };

  // Выход
  const handleLogout = async () => {
    await signOut();
  };

  if (isLoading) {
    return <p>Загрузка объектов...</p>;
  }

  if (isError) {
    return <p>Ошибка загрузки объектов: {error.message}</p>;
  }

  return (
    <main>
      <h1>Объекты</h1>

      <p>Пользователь: {profile?.full_name}</p>

      <button onClick={handleLogout}>Выйти</button>

      <hr />

      {/* Форма объекта */}
      <section>
        <h2>{editingObject ? "Редактирование объекта" : "Создание объекта"}</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Название объекта"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Адрес объекта"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <button type="submit" disabled={isObjectPending}>
            {isObjectPending
              ? "Сохранение..."
              : editingObject
                ? "Сохранить"
                : "Создать объект"}
          </button>

          {editingObject && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isObjectPending}
            >
              Отмена
            </button>
          )}
        </form>
      </section>

      {/* Список объектов */}
      <section>
        <h2>Список объектов</h2>

        {objects?.length === 0 && <p>Объектов пока нет</p>}

        {objects?.map((object) => (
          <article key={object.id}>
            <h3>{object.name}</h3>

            <p>Адрес: {object.address}</p>

            <p>Количество задач: {object.tasks?.[0]?.count ?? 0}</p>

            <button
              onClick={() => handleEdit(object)}
              disabled={isObjectPending}
            >
              Редактировать
            </button>

            <button
              onClick={() => handleDelete(object.id)}
              disabled={isObjectPending}
            >
              Удалить
            </button>

            <button onClick={() => toggleTasks(object.id)}>
              {selectedObjectId === object.id
                ? "Скрыть задачи"
                : "Показать задачи"}
            </button>

            {/* Задачи объекта */}
            {selectedObjectId === object.id && (
              <section>
                <h4>Задачи объекта</h4>

                {/* Форма создания задачи */}
                <form onSubmit={(e) => handleCreateTask(e, object.id)}>
                  <h5>Создать задачу</h5>

                  <input
                    type="text"
                    placeholder="Название задачи"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                  />

                  <textarea
                    placeholder="Описание задачи"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={3}
                  />

                  {isExecutorsLoading && <p>Загрузка исполнителей...</p>}

                  {isExecutorsError && (
                    <p>
                      Ошибка загрузки исполнителей: {executorsError.message}
                    </p>
                  )}

                  {!isExecutorsLoading && !isExecutorsError && (
                    <select
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      required
                    >
                      <option value="">Выберите исполнителя</option>

                      {executors?.map((executor) => (
                        <option key={executor.id} value={executor.id}>
                          {executor.full_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="submit"
                    disabled={
                      createTaskMutation.isPending ||
                      isExecutorsLoading ||
                      !executors?.length
                    }
                  >
                    {createTaskMutation.isPending
                      ? "Создание..."
                      : "Создать задачу"}
                  </button>
                </form>

                {createTaskMutation.isError && (
                  <p>
                    Ошибка создания задачи: {createTaskMutation.error.message}
                  </p>
                )}

                {/* Загрузка задач */}
                {isTasksLoading && <p>Загрузка задач...</p>}

                {/* Ошибка загрузки */}
                {isTasksError && (
                  <p>Ошибка загрузки задач: {tasksError.message}</p>
                )}

                {/* Пустой список */}
                {!isTasksLoading && !isTasksError && tasks?.length === 0 && (
                  <p>У этого объекта пока нет задач.</p>
                )}

                {/* Список задач */}
                {tasks?.map((task) => (
                  <article key={task.id}>
                    <h4>{task.title}</h4>

                    <p>Статус: {statusLabels[task.status]}</p>

                    {task.description && <p>{task.description}</p>}

                    <Link to={`/tasks/${task.id}`}>Открыть задачу</Link>
                  </article>
                ))}
              </section>
            )}
          </article>
        ))}
      </section>

      {/* Ошибки объектов */}
      {createMutation.isError && (
        <p>Ошибка создания объекта: {createMutation.error.message}</p>
      )}

      {updateMutation.isError && (
        <p>Ошибка редактирования объекта: {updateMutation.error.message}</p>
      )}

      {deleteMutation.isError && (
        <p>Ошибка удаления объекта: {deleteMutation.error.message}</p>
      )}
    </main>
  );
}
