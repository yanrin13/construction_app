## Данные для входа

### Менеджер
- **Роль:** Менеджер
- **Email:** `manager@example.com`
- **Пароль:** `manager`

### Исполнитель
- **Роль:** Исполнитель
- **Email:** `executor@example.com`
- **Пароль:** `executor`

### Исполнитель 2
- **Роль:** Исполнитель
- **Email:** `executor1@example.com`
- **Пароль:** `executor`

## Запуск проекта

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создать файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Вместо значений-заглушек указать данные проекта Supabase.

### 3. Запуск в режиме разработки

```bash
npm run dev
```

После запуска открыть адрес, указанный в терминале. Обычно это:

```text
http://localhost:5173
```

## Сборка проекта

Для создания production-сборки:

```bash
npm run build
```


После запуска открыть адрес, указанный в терминале. Обычно это:

http://localhost:5173
