# Требования к доработке Frontend (для Lovable)

## Общая информация

**Проект:** СПО (Система Планирования и Отчётности) — фронтенд на React + TypeScript + Vite + shadcn/ui.

**Текущее состояние:** Все данные из моков (`src/data/*.ts`, `src/lib/*.ts`), HTTP-запросов нет.

**Цель:** Добавить HTTP-клиент, авторизацию, сервисный слой API, подключить страницы к бэкенду.

**Ключевые решения:**
- **HTTP-клиент:** axios
- **Base URL API:** из переменной окружения `VITE_API_URL`
- **Токены:** только в памяти React Context (без localStorage/sessionStorage)
- **Язык API:** английский
- **Запросы к API:** через TanStack Query (`useQuery` / `useMutation`), который уже есть в проекте (`App.tsx` содержит `QueryClientProvider`)

---

## 1. Установка зависимостей

### 1.1 Установить axios

```bash
npm install axios
```

### 1.2 Создать `.env`

**Файл:** `.env` (в корне проекта)

```
VITE_API_URL=http://localhost:3000
```

### 1.3 Обновить `src/vite-env.d.ts`

Добавить типы для переменных окружения:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 2. HTTP-клиент

### 2.1 Создать `src/api/client.ts`

Создать настроенный axios instance:

- **baseURL:** `import.meta.env.VITE_API_URL || 'http://localhost:3000'`
- **Request interceptor:** добавлять `Authorization: Bearer {accessToken}` к каждому запросу (если токен есть)
- **Response interceptor:**
  - При 401: очищать токены и вызвать `onUnauthorized()` callback (редирект на `/login`)
  - При 4xx/5xx: извлекать message из формата `{ success: false, error: { message, code, details } }` (это формат бэкенда), логировать, пробрасывать Error с message

**Функции управления токенами (в памяти):**
- `setTokens(access: string, refresh: string): void`
- `clearTokens(): void`
- `getAccessToken(): string | null`
- `setOnUnauthorized(cb: () => void): void`

```typescript
// Примерная структура файла
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokens(access: string, refresh: string) { ... }
export function clearTokens() { ... }
export function getAccessToken() { ... }
export function setOnUnauthorized(cb: () => void) { ... }

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => { ... });
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => { ... }
);

export default apiClient;
```

---

## 3. Auth-слой

### 3.1 Создать `src/api/auth.ts`

Типы и функции для аутентификации:

```typescript
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  employeeId: string;
  login: string;
  email: string;
  active: boolean;
  source: 'ad' | 'local';
  roles: string[];
  name?: string;
  position?: string;
}

// POST /api/auth/login — тело: { login, password }
export async function login(login: string, password: string): Promise<LoginResponse>

// POST /api/auth/refresh — тело: { refreshToken }
export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>

// POST /api/auth/logout
export async function logout(): Promise<void>

// GET /api/auth/me
export async function getMe(): Promise<User>
```

### 3.2 Создать `src/store/auth-context.tsx`

React Context для хранения состояния аутентификации:

- **Состояние:** `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`
- **Методы:**
  - `login(login, password)` — вызывает `POST /api/auth/login`, сохраняет токены в памяти через `setTokens()`, устанавливает `user` и `isAuthenticated = true`
  - `logout()` — вызывает `POST /api/auth/logout`, чистит токены через `clearTokens()`, сбрасывает состояние
- **При монтировании:** токенов нет (они в памяти, не в localStorage), поэтому `isAuthenticated = false`. Установить `setOnUnauthorized()` для редиректа на `/login` при 401.

```typescript
export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) { ... }
export function useAuth(): AuthContextValue { ... }
```

### 3.3 Создать `src/pages/Login.tsx`

Страница авторизации:

- **Маршрут:** `/login`
- **Форма:** поле "Логин", поле "Пароль" (type="password"), кнопка "Войти"
- **Логика:**
  - При сабмите: `auth.login(login, password)` → редирект на `/` через `useNavigate()`
  - Если уже авторизован (`isAuthenticated && !isLoading`) — редирект на `/`
  - Ошибки показывать через `useToast()`
- **Дизайн:** карточка по центру с логотипом СПО (синий круг с буквами), заголовок "Система планирования и оплаты", подпись "Войдите с помощью AD-учётной записи"
- Локальный администратор: логин `spo_admin` (создаётся на бэкенде, на фронте просто форма)

### 3.4 Создать `src/components/auth/ProtectedRoute.tsx`

Компонент защиты маршрутов:

- Проверяет `isAuthenticated` из `useAuth()`
- Если `isLoading` — показать спиннер/загрузку
- Если не аутентифицирован — `<Navigate to="/login" replace />`
- Если аутентифицирован — рендерить `children`

---

## 4. Обновить `src/App.tsx`

Текущая структура:

```tsx
<QueryClientProvider client={queryClient}>
  <TooltipProvider>
    <Toaster /><Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/planning" element={<Planning />} />
        ...
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>
```

Нужно:

1. Добавить импорт `AuthProvider`, `ProtectedRoute`, `Login`
2. Обернуть `<Routes>` в `<AuthProvider>`
3. Добавить маршрут `/login`
4. Обернуть все существующие маршруты в `<ProtectedRoute>`

```tsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
      {/* ... все остальные маршруты ... */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

---

## 5. Создать API-сервисы по модулям

Создать файлы в `src/api/`. Ниже — перечень файлов, эндпоинтов и типов.

**Общий принцип:** каждый файл экспортирует асинхронные функции, которые вызывают соответствующий эндпоинт через `apiClient`.

### 5.1 `src/api/types.ts` — общие типы

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string; details?: unknown };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 5.2 `src/api/planning.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getPeriods()` | GET | `/api/planning/periods` | Список периодов |
| `getPeriod(id)` | GET | `/api/planning/periods/:id` | Детали периода |
| `createPeriod(data)` | POST | `/api/planning/periods` | Создать период |
| `updatePeriod(id, data)` | PUT | `/api/planning/periods/:id` | Обновить период |
| `getBacklog(periodId, filters?)` | GET | `/api/planning/periods/:id/backlog` | Бэклог с фильтрацией |
| `getCapacity(periodId)` | GET | `/api/planning/periods/:id/capacity` | Мощность сотрудников |
| `assignTask(periodId, taskId, data)` | PUT | `/api/planning/periods/:id/tasks/:taskId` | Назначить задачу |
| `unassignTask(periodId, taskId)` | DELETE | `/api/planning/periods/:id/tasks/:taskId` | Снять назначение |
| `fixPlan(periodId, data?)` | POST | `/api/planning/periods/:id/fix-plan` | Зафиксировать план |

**Типы брать из моков** (`src/data/planningMock.ts`): `BacklogIssue`, `Assignment`, `Employee`, `Project`, `SystemRef`.

### 5.3 `src/api/timesheets.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getMyTimesheet(year, month)` | GET | `/api/timesheets/mine?year=&month=` | Мой табель |
| `getTeamTimesheets(year, month)` | GET | `/api/timesheets/team?year=&month=` | Табели команды |
| `updateRow(tsId, rowId, data)` | PUT | `/api/timesheets/:id/rows/:rowId` | Обновить строку |
| `addRow(tsId, issueIdReadable)` | POST | `/api/timesheets/:id/rows` | Добавить строку |
| `deleteRow(tsId, rowId)` | DELETE | `/api/timesheets/:id/rows/:rowId` | Удалить строку |
| `submitTimesheet(tsId)` | POST | `/api/timesheets/:id/submit` | Отправить на согласование |
| `recallTimesheet(tsId)` | POST | `/api/timesheets/:id/recall` | Отозвать |
| `managerApprove(tsId)` | POST | `/api/timesheets/:id/manager-approve` | Согласовать (рук.) |
| `directorApprove(tsId)` | POST | `/api/timesheets/:id/director-approve` | Утвердить (дир.) |
| `rejectTimesheet(tsId, comment?)` | POST | `/api/timesheets/:id/reject` | Отклонить |
| `getTimesheetHistory(tsId)` | GET | `/api/timesheets/:id/history` | История статусов |

**Типы брать из моков** (`src/data/timesheetsMock.ts`): `Timesheet`, `TimesheetRow`, `TimesheetStatus`, `TimesheetRowChange`.

### 5.4 `src/api/finance.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getFinanceGroups(periodId, params?)` | GET | `/api/finance/periods/:id/groups` | Группировка по историям |
| `getFinanceByProject(periodId, params?)` | GET | `/api/finance/periods/:id/by-project` | По проектам |
| `getFinanceBySystem(periodId, params?)` | GET | `/api/finance/periods/:id/by-system` | По системам |
| `getFinanceTotals(periodId)` | GET | `/api/finance/periods/:id/totals` | Итоги периода |

**Типы:** `FinanceTotals`, `IssueGroup`, `IssueLine`, `IssueContribution`, `SystemBucket` — из `src/lib/finance.ts`.

### 5.5 `src/api/reports.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getSummaryReport(periodId, params?)` | GET | `/api/reporting/periods/:id/summary` | Сводный отчёт |
| `getPeriodStatistics(periodId)` | GET | `/api/reporting/periods/:id/statistics` | Статистика периода |
| `getPersonalReport(periodId, userId?)` | GET | `/api/reporting/periods/:id/personal/:userId` | Личный отчёт |
| `recalculatePeriod(periodId)` | POST | `/api/reporting/periods/:id/recalculate` | Пересчёт отчётов |

### 5.6 `src/api/admin.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getUsers(params?)` | GET | `/api/admin/users` | Список пользователей |
| `createUser(data)` | POST | `/api/admin/users` | Создать пользователя |
| `updateUser(id, data)` | PUT | `/api/admin/users/:id` | Обновить пользователя |
| `assignRoles(id, roleIds)` | PUT | `/api/admin/users/:id/roles` | Назначить роли |
| `getRates(employeeIds?)` | GET | `/api/admin/rates?employeeIds=...` | Получить ставки |
| `createRate(userId, data)` | POST | `/api/admin/rates/:userId` | Создать ставку |
| `getRateHistory(userId)` | GET | `/api/admin/rates/:userId/history` | История ставок |
| `deleteRate(rateId)` | DELETE | `/api/admin/rates/:id` | Удалить ставку |
| `getAuditLog(params?)` | GET | `/api/admin/audit-log` | Журнал аудита |
| `getPlanningSettings()` | GET | `/api/admin/settings/planning` | Настройки планирования |
| `updatePlanningSettings(data)` | PUT | `/api/admin/settings/planning` | Обновить настройки |
| `getIntegrations()` | GET | `/api/admin/integrations` | Список интеграций |
| `updateIntegration(id, data)` | PUT | `/api/admin/integrations/:id` | Обновить интеграцию |
| `getDictionaries()` | GET | `/api/admin/dictionaries` | Справочники |

**Типы:** `AppUser` из `src/data/adminMock.ts`, `SalaryRecord` из `src/data/salaryMock.ts`.

### 5.7 `src/api/period-close.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `getPeriodReadiness(periodId)` | GET | `/api/periods/:id/readiness` | Чек-лист готовности |
| `closePeriod(periodId, reason?)` | POST | `/api/periods/:id/close` | Закрыть период |
| `reopenPeriod(periodId, reason)` | POST | `/api/periods/:id/reopen` | Переоткрыть период |
| `getSnapshot(periodId)` | GET | `/api/periods/:id/snapshot` | Получить snapshot |
| `getSnapshotStatus(periodId)` | GET | `/api/periods/:id/snapshot/status` | Статус snapshot |

**Типы:** `PeriodReadiness`, `PeriodSnapshot`, `PeriodStatus`, `ChecklistItem` — из `src/data/periodCloseMock.ts`.

### 5.8 `src/api/export.ts`

| Функция | Метод | Путь | Описание |
|---------|-------|------|----------|
| `exportPlan(periodId, format)` | POST | `/api/export/plan/:periodId` | Экспорт плана |
| `exportSummary(periodId, format)` | POST | `/api/export/summary/:periodId` | Экспорт сводки |
| `exportPersonal(periodId, userId, format)` | POST | `/api/export/personal/:periodId/:userId` | Экспорт личного |
| `exportAudit(filters?, format)` | POST | `/api/export/audit` | Экспорт аудита |
| `exportAccounting(periodId)` | POST | `/api/export/accounting/:periodId` | Экспорт для бухгалтерии |
| `getExportJobs()` | GET | `/api/export/jobs` | Список задач экспорта |
| `downloadExport(jobId)` | GET | `/api/export/download/:jobId` (responseType: blob) | Скачать файл |

**Форматы:** `'xlsx' | 'pdf' | 'csv'`

### 5.9 `src/api/dashboard.ts`

| Функция | Метод | Путь |
|---------|-------|------|
| `getDashboardStats()` | GET | `/api/dashboard/stats` |

---

## 6. Подключить API к страницам

### Общие принципы

1. **Импортировать** функции API из `src/api/` в соответствующую страницу
2. **Для чтения данных** использовать `useQuery` из TanStack Query
3. **Для мутаций** (создание, изменение, удаление) использовать `useMutation`
4. **Инвалидация кеша:** после успешной мутации вызывать `queryClient.invalidateQueries()`
5. **Graceful fallback:** при ошибке API показывать toast с ошибкой, страница не должна падать
6. **Моковые файлы (`src/data/*.ts`, `src/lib/*.ts`) НЕ УДАЛЯТЬ** — они остаются для тестов и как reference

### 6.1 Planning.tsx

**Что есть сейчас:** `backlog`, `employees`, `employees` импортируются из `planningMock.ts` напрямую.

**Что нужно сделать:**

```typescript
// Вместо:
import { backlog, employees, projects, systems } from '@/data/planningMock';

// Использовать:
import { getBacklog, getCapacity, assignTask, unassignTask, fixPlan } from '@/api/planning';
import { useQuery, useMutation } from '@tanstack/react-query';

// Загрузка бэклога:
const { data: backlog, isLoading } = useQuery({
  queryKey: ['backlog', periodId, filters],
  queryFn: () => getBacklog(periodId, filters),
  enabled: !!periodId,
});

// Назначение задачи:
const assignMutation = useMutation({
  mutationFn: ({ taskId, ...data }) => assignTask(periodId, taskId, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backlog', periodId] }),
});
```

**Комментарий в коде:** `// TODO: заменить мок на API` — временно оставить импорт моков как fallback, если API недоступен.

### 6.2 Timesheets.tsx

**Что есть сейчас:** `const [timesheets, setTimesheets] = useState<Timesheet[]>(initialTimesheets)` — все мутации работают через `useState`.

**Что нужно сделать:**

```typescript
// Загрузка:
const { data: myTimesheet, isLoading } = useQuery({
  queryKey: ['timesheet', 'mine', year, month],
  queryFn: () => getMyTimesheet(year, month),
  enabled: !!year && !!month,
});

const { data: teamTimesheets } = useQuery({
  queryKey: ['timesheets', 'team', year, month],
  queryFn: () => getTeamTimesheets(year, month),
  enabled: activeTab === 'team',
});

// Мутации:
const submitMutation = useMutation({
  mutationFn: (tsId: string) => submitTimesheet(tsId),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timesheet'] }),
});

const updateRowMutation = useMutation({
  mutationFn: ({ tsId, rowId, data }) => updateRow(tsId, rowId, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timesheet'] }),
});
```

### 6.3 Finance.tsx

**Что есть сейчас:** `buildSprintIssueGroups(year, month, approvedOnly)` — синхронная функция, берёт данные из моков.

**Что нужно сделать:**

```typescript
const { data: groups, isLoading } = useQuery({
  queryKey: ['finance', 'groups', periodId, approvedOnly, gradedFilter],
  queryFn: () => getFinanceGroups(periodId, { approvedOnly }),
  enabled: !!periodId,
});

const { data: bySystem } = useQuery({
  queryKey: ['finance', 'by-system', periodId, approvedOnly],
  queryFn: () => getFinanceBySystem(periodId, { approvedOnly }),
  enabled: !!periodId,
});
```

### 6.4 Reports.tsx

**Что нужно сделать:**

```typescript
// Personal report:
const { data: myReport } = useQuery({
  queryKey: ['reports', 'personal', periodId, viewerId],
  queryFn: () => getPersonalReport(periodId, viewerId),
  enabled: tab === 'personal',
});

// Summary report:
const { data: summary } = useQuery({
  queryKey: ['reports', 'summary', periodId],
  queryFn: () => getSummaryReport(periodId),
  enabled: tab === 'global',
});
```

### 6.5 SalaryRates.tsx

**Что нужно сделать:**

```typescript
// Загрузка ставок:
const { data: rates, isLoading } = useQuery({
  queryKey: ['rates', viewerId],
  queryFn: () => getRates(),
});

// Создание ставки:
const createMutation = useMutation({
  mutationFn: (data) => createRate(selectedEmp.id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rates'] }),
});

// Удаление:
const deleteMutation = useMutation({
  mutationFn: (rateId) => deleteRate(rateId),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rates'] }),
});
```

### 6.6 PeriodClose.tsx

**Что нужно сделать:**

```typescript
const { data: readiness, isLoading } = useQuery({
  queryKey: ['period-readiness', periodId],
  queryFn: () => getPeriodReadiness(periodId),
  enabled: !!periodId,
});

const closeMutation = useMutation({
  mutationFn: () => closePeriod(periodId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['period-readiness', periodId] });
    queryClient.invalidateQueries({ queryKey: ['period-options'] });
    toast({ title: 'Период закрыт' });
  },
});

const reopenMutation = useMutation({
  mutationFn: () => reopenPeriod(periodId, reopenReason),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['period-readiness', periodId] });
    toast({ title: 'Период переоткрыт' });
  },
});
```

### 6.7 Users.tsx

**Что нужно сделать:**

```typescript
const { data: usersData, isLoading } = useQuery({
  queryKey: ['users', roleFilter, statusFilter, search],
  queryFn: () => getUsers({ role: roleFilter !== 'all' ? roleFilter : undefined, search }),
});

const updateMutation = useMutation({
  mutationFn: ({ id, data }) => updateUser(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
});
```

**Примечание:** Матрица прав и оргструктура пока могут оставаться на моках, если для них нет API.

### 6.8 Audit.tsx

**Что нужно сделать:**

```typescript
const { data: auditLog, isLoading } = useQuery({
  queryKey: ['audit', actionFilter, severityFilter, search],
  queryFn: () => getAuditLog({ action: actionFilter !== 'all' ? actionFilter : undefined }),
  enabled: true,
});

// Экспорт:
const exportMutation = useMutation({
  mutationFn: () => exportAudit({ from, to, action: actionFilter }),
  onSuccess: (job) => downloadExport(job.id),
});
```

**Примечание:** Сессии и чувствительные изменения пока могут оставаться на моках, если для них нет API.

### 6.9 Settings.tsx

**Что нужно сделать:**

```typescript
const { data: settingsData, isLoading } = useQuery({
  queryKey: ['settings', 'planning'],
  queryFn: () => getPlanningSettings(),
});

const saveMutation = useMutation({
  mutationFn: (data) => updatePlanningSettings(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['settings', 'planning'] });
    toast({ title: 'Настройки сохранены' });
  },
});

// Интеграции:
const { data: integrations } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => getIntegrations(),
});

const updateIntegrationMutation = useMutation({
  mutationFn: ({ id, data }) => updateIntegration(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
});
```

---

## 7. Подключить экспорт

Заменить все toast-заглушки `"Экспорт CSV (демо)"` на реальные вызовы API:

### 7.1 Reports.tsx

```typescript
const exportMutation = useMutation({
  mutationFn: (kind: string) => {
    if (kind === 'personal') return exportPersonal(periodId, viewerId);
    if (kind === 'team') return exportSummary(periodId);
    return exportPlan(periodId);
  },
  onSuccess: (job) => {
    toast({ title: 'Экспорт запущен', description: 'Файл формируется...' });
    // Через некоторое время скачать:
    downloadExport(job.id).then(blob => {
      // Создать ссылку и скачать
    });
  },
});
```

### 7.2 Audit.tsx

```typescript
const exportMutation = useMutation({
  mutationFn: () => exportAudit({ action: actionFilter }),
  onSuccess: (job) => downloadExport(job.id).then(blob => { /* скачать */ }),
});
```

---

## 8. Структура файлов после изменений

```
src/
  api/
    client.ts              ← axios instance (СОЗДАТЬ)
    auth.ts                ← API авторизации (СОЗДАТЬ)
    types.ts               ← общие типы API (СОЗДАТЬ)
    planning.ts            ← API планирования (СОЗДАТЬ)
    timesheets.ts          ← API табелей (СОЗДАТЬ)
    finance.ts             ← API финансов (СОЗДАТЬ)
    reports.ts             ← API отчётов (СОЗДАТЬ)
    admin.ts               ← API администрирования (СОЗДАТЬ)
    export.ts              ← API экспорта (СОЗДАТЬ)
    period-close.ts        ← API закрытия периода (СОЗДАТЬ)
    dashboard.ts           ← API дашборда (СОЗДАТЬ)
  store/
    auth-context.tsx        ← AuthProvider (СОЗДАТЬ)
  components/
    auth/
      ProtectedRoute.tsx    ← защита маршрутов (СОЗДАТЬ)
  pages/
    Login.tsx               ← страница логина (СОЗДАТЬ)
    Planning.tsx            ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    Timesheets.tsx          ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    Finance.tsx             ← добавить useQuery (ИЗМЕНИТЬ)
    Reports.tsx             ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    SalaryRates.tsx         ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    PeriodClose.tsx         ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    Users.tsx               ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    Audit.tsx               ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
    Settings.tsx            ← добавить useQuery/useMutation (ИЗМЕНИТЬ)
  data/
    planningMock.ts         ← НЕ УДАЛЯТЬ (остаётся как reference)
    timesheetsMock.ts       ← НЕ УДАЛЯТЬ
    salaryMock.ts           ← НЕ УДАЛЯТЬ
    periodCloseMock.ts      ← НЕ УДАЛЯТЬ
    adminMock.ts            ← НЕ УДАЛЯТЬ
    planSnapshotMock.ts     ← НЕ УДАЛЯТЬ
  lib/
    finance.ts              ← НЕ УДАЛЯТЬ (остаётся как reference)
    planning.ts             ← НЕ УДАЛЯТЬ
  App.tsx                   ← добавить AuthProvider, ProtectedRoute, Login (ИЗМЕНИТЬ)
```

---

## 9. Что НЕ нужно делать

1. **НЕ удалять** файлы моков (`src/data/*.ts`, `src/lib/*.ts`)
2. **НЕ менять** shadcn/ui компоненты (`src/components/ui/*`)
3. **НЕ менять** layout компоненты (`AppLayout`, `AppSidebar`, `PageHeader`, `ModulePlaceholder`)
4. **НЕ менять** Dashboard (`Index.tsx`) — пока остаётся на моках
5. **НЕ использовать** localStorage или sessionStorage для токенов

---

## 10. Проверка работоспособности

После выполнения всех пунктов:

1. `npm run build` — должно собираться без ошибок
2. `npm run dev` — должно запускаться
3. При открытии `http://localhost:5173` — редирект на `/login`
4. Форма логина отображается корректно
5. После ввода логина/пароля — редирект на `/` (даже если API не отвечает, должна быть обработка ошибки)
6. Все страницы рендерятся без краша (данные берутся из моков, если API недоступен)
```

Now the second file:

```SPO\plan_add1.md
# План доработки Backend (для следующей сессии агента)

## Общая информация

После того как фронт (Lovable) доработает свою часть, бэкенд нужно привести в соответствие. Ниже — полный список изменений в порядке приоритетности.

**Контекст:** Бэкенд на NestJS (Clean Architecture + DDD), Prisma + PostgreSQL.
**Текущее состояние:** 347 файлов, все модули реализованы, но есть расхождения с фронтом.

---

## 1. Критические исправления (блокируют соединение)

### 1.1 Исправить Roles Guard (`@Roles()` во всех контроллерах)

**Проблема:** В контроллерах используется `@Roles('ADMIN')`, `@Roles('Директор')`, `'Бизнес-оценщик'`, `'HR'`, `'FINANCE'` — в разных форматах. В БД роли хранятся в lowercase (`admin`, `director`, `manager`, `employee`, `business`, `accountant`). Фронт тоже использует lowercase.

**Решение:** Привести все `@Roles()` к lowercase, совпадающему с БД:

| Был | Стал |
|-----|------|
| `'ADMIN'` | `'admin'` |
| `'DIRECTOR'` | `'director'` |
| `'MANAGER'` | `'manager'` |
| `'Администратор'` | `'admin'` |
| `'Директор'` | `'director'` |
| `'Менеджер'` | `'manager'` |
| `'Бизнес-оценщик'` | `'business'` |
| `'Финансы'` | `'accountant'` |
| `'HR'` | (удалить или заменить на `'admin'`) |

**Затронутые файлы:** finance.controller.ts, period-closing.controller.ts, reporting.controller.ts, workflow.controller.ts, admin.controller.ts, retention.controller.ts, notifications.controller.ts, export.controller.ts

**Оценка:** 30 минут.

### 1.2 Исправить `AccessControlService` (Domain layer)

Там тоже uppercase: `'ADMIN'`, `'DIRECTOR'`, `'HR'`, `'SUPER_HR'`, `'FINANCE'`, `'MANAGER'`. Привести к lowercase.

**Затронутые файлы:** access-control.service.ts

**Оценка:** 10 минут.

### 1.3 Добавить JWT Guard на PlanningController

**Проблема:** `PlanningController` не имеет `@UseGuards(JwtAuthGuard)` — в отличие от всех остальных контроллеров.

**Решение:** Добавить `@UseGuards(JwtAuthGuard, RolesGuard)` на контроллер или нужные методы.

**Оценка:** 5 минут.

---

## 2. Новые контроллеры (критически важные для Pilot)

### 2.1 Создать TimesheetController

Фронт ожидает полноценный CRUD для табелей. На бэке этого модуля **нет вообще**.

**Нужные эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/timesheets/mine?year=&month=` | Мой табель за период |
| GET | `/api/timesheets/team?year=&month=` | Табели подчинённых |
| PUT | `/api/timesheets/:id/rows/:rowId` | Обновить строку (часы, оценки) |
| POST | `/api/timesheets/:id/rows` | Добавить строку |
| DELETE | `/api/timesheets/:id/rows/:rowId` | Удалить строку |
| POST | `/api/timesheets/:id/submit` | Отправить на согласование |
| POST | `/api/timesheets/:id/recall` | Отозвать |
| POST | `/api/timesheets/:id/manager-approve` | Согласовать руководителем