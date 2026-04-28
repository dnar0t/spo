# План доработки Backend (для следующей сессии агента)

## Общая информация

После того как фронт (Lovable) доработает свою часть, бэкенд нужно привести в соответствие. Ниже — полный список изменений в порядке приоритетности.

**Контекст:** Бэкенд на NestJS (Clean Architecture + DDD), Prisma + PostgreSQL.
**Текущее состояние:** 347 файлов, все модули реализованы, но есть расхождения с фронтом.

**Источник требований по DTO и эндпоинтам:** фронт в `spo-front/LOVABLE_REQUIREMENTS.md` (там же все названия полей, типы, URL).

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

**Затронутые файлы:** Все контроллеры:
- `packages/backend/src/**/finance.controller.ts`
- `packages/backend/src/**/period-closing.controller.ts`
- `packages/backend/src/**/reporting.controller.ts`
- `packages/backend/src/**/workflow.controller.ts`
- `packages/backend/src/**/admin.controller.ts`
- `packages/backend/src/**/retention.controller.ts`
- `packages/backend/src/**/notifications.controller.ts`
- `packages/backend/src/**/export.controller.ts`

**Оценка:** 30 минут.

### 1.2 Исправить `AccessControlService` (Domain layer)

Там тоже uppercase: `'ADMIN'`, `'DIRECTOR'`, `'HR'`, `'SUPER_HR'`, `'FINANCE'`, `'MANAGER'`. Привести к lowercase.

**Затронутые файлы:** `packages/backend/src/**/access-control.service.ts`

**Оценка:** 10 минут.

### 1.3 Добавить JWT Guard на PlanningController

**Проблема:** `PlanningController` не имеет `@UseGuards(JwtAuthGuard)` — в отличие от всех остальных контроллеров. Любой неавторизованный может создавать периоды и назначать задачи.

**Решение:** Добавить `@UseGuards(JwtAuthGuard, RolesGuard)` на контроллер или отдельные методы.

**Оценка:** 5 минут.

---

## 2. Новые контроллеры (критически важные для Pilot)

### 2.1 Создать TimesheetController + Use Cases + Repository

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
| POST | `/api/timesheets/:id/manager-approve` | Согласовать руководителем |
| POST | `/api/timesheets/:id/director-approve` | Утвердить директором |
| POST | `/api/timesheets/:id/reject` | Отклонить (с комментарием) |
| GET | `/api/timesheets/:id/history` | История изменений статусов |

**Типы данных (согласованы с фронтом):**

```typescript
// Timesheet — из timesheetsMock.ts
interface Timesheet {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1..12
  status: 'draft' | 'submitted' | 'manager_approved' | 'approved' | 'rejected';
  rows: TimesheetRow[];
  history: TimesheetStatusTransition[];
  rowChanges: TimesheetRowChange[];
}

interface TimesheetRow {
  id: string;
  issueIdReadable: string;
  source: 'plan' | 'worklog';
  minutes: number;
  comment?: string;
  managerGrade: 'none' | 'satisfactory' | 'good' | 'excellent';
  businessGrade: 'none' | 'no_benefit' | 'direct' | 'obvious';
}

interface TimesheetStatusTransition {
  at: string; // ISO
  actorId: string;
  fromStatus: TimesheetStatus | null;
  toStatus: TimesheetStatus;
  comment?: string;
}

interface TimesheetRowChange {
  at: string;
  actorId: string;
  rowId: string;
  field: 'minutes' | 'managerGrade' | 'businessGrade';
  fromValue: string;
  toValue: string;
}
```

**Требуется создать:**
1. Prisma модель `Timesheet` (если нет) или использовать существующую
2. Domain entity: `TimesheetEntity`, `TimesheetRowEntity`
3. Repository interface: `ITimesheetRepository`
4. Prisma repository: `PrismaTimesheetRepository`
5. Use cases: `GetMyTimesheetUseCase`, `GetTeamTimesheetsUseCase`, `UpdateRowUseCase`, `AddRowUseCase`, `DeleteRowUseCase`, `SubmitTimesheetUseCase`, `RecallTimesheetUseCase`, `ManagerApproveUseCase`, `DirectorApproveUseCase`, `RejectTimesheetUseCase`
6. Controller: `TimesheetController`
7. Module: добавить в `AppModule`

**Оценка:** 4-6 часов.

### 2.2 Создать Finance Read Controller

Фронт ожидает 4 эндпоинта для чтения финансовых данных. На бэке есть только `POST /api/finance/periods/:id/freeze`.

**Нужные эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/finance/periods/:id/groups` | Группировка по историям (как `buildSprintIssueGroups`) |
| GET | `/api/finance/periods/:id/by-project` | По проектам |
| GET | `/api/finance/periods/:id/by-system` | По системам |
| GET | `/api/finance/periods/:id/totals` | Итоги периода |

**Что нужно сделать:**
1. Перенести логику из `src/lib/finance.ts` (фронт) на бэкенд в виде use cases
2. Финансовый расчёт: `computeRowFinance(minutes, salary, managerGrade, businessGrade, settings)` — формула уже есть на бэке, нужно убедиться что она совпадает с фронтовой
3. Создать `FinanceQueryController` (или расширить существующий `FinanceController`)

**Формула расчёта (фронтовая, должна совпадать с бэком):**
```
baseRateKop = (monthlyNetKop * 12) / workHoursPerYear
baseSumKop = round(hours * baseRateKop * 0.7)        // basePercent = 0.7
managerSumKop = round(hours * baseRateKop * managerPercent[])
businessSumKop = round(hours * baseRateKop * businessPercent[])
netTotalKop = baseSumKop + managerSumKop + businessSumKop
```

**Оценка:** 2-3 часа.

### 2.3 Создать DashboardController

Фронт ожидает `GET /api/dashboard/stats`. Сейчас дашборд на статических моках.

**Нужный эндпоинт:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/dashboard/stats` | KPI, проекты, активность, задачи |

**Что нужно сделать:**
1. Создать `DashboardController` с `GET /api/dashboard/stats`
2. Use case собирает данные из разных модулей (активные периоды, количество табелей, статусы и т.д.)
3. Можно сделать простую агрегацию на старте — сложные метрики потом

**Оценка:** 1-2 часа.

---

## 3. Доработка существующих контроллеров

### 3.1 PlanningController — реализовать недостающие эндпоинты

| Метод | Путь | Статус |
|-------|------|--------|
| PUT | `/api/planning/periods/:id/tasks/:taskId/sort` | ❌ throws error |
| PUT | `/api/planning/periods/:id/tasks/:taskId/readiness` | ❌ throws error |
| GET | `/api/planning/periods/:id/plan-versions` | ❌ throws error |
| DELETE | `/api/planning/periods/:id` | ❌ throws error |

**Решение:** Реализовать каждый эндпоинт, убрав заглушки.

**Оценка:** 1-2 часа.

### 3.2 FinanceController — проверить формулу расчёта

Фронт использует жёстко зашитые `DEFAULT_FINANCE_SETTINGS`, бэк использует `FormulaConfiguration` из БД. Нужно:
1. Убедиться, что при отсутствии кастомных формул используются те же дефолты, что на фронте
2. Добавить seed для `FormulaConfiguration` с дефолтными значениями

**Оценка:** 30 минут.

### 3.3 PeriodClosingController — добавить эндпоинт readiness

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/periods/:id/readiness` | Чек-лист готовности к закрытию |

**Решение:** Создать use case, который проверяет:
1. План зафиксирован?
2. Все табели отправлены?
3. Все табели согласованы руководителем?
4. Все табели утверждены директором?
5. Нет отклонённых табелей?
6. Оценки проставлены?
7. Нет финансовых расхождений?

Возвращает `PeriodReadiness` — такой же тип, как на фронте.

**Оценка:** 1-2 часа.

### 3.4 AdminController — расширить User DTO и Rate API

**Нужно добавить:**
1. В `UserDto` поля: `abacProjects`, `abacSystems`, `abacRoles`, `twoFactorEnabled`, `source`
2. `DELETE /api/admin/rates/:id` — удаление ставки
3. `GET /api/admin/rates?employeeIds=...` — батч-получение ставок для нескольких сотрудников
4. `GET /api/admin/integrations` и `PUT /api/admin/integrations/:id` — CRUD интеграций
5. `GET /api/admin/dictionaries` — расширить, чтобы возвращал projects, systems, workRoles, workTypes (сейчас возвращает только workRoles + evaluationScales)

**Оценка:** 1-2 часа.

### 3.5 AuditController — добавить эндпоинты

**Нужно добавить:**
1. `GET /api/admin/sessions` — активные сессии пользователей
2. `GET /api/admin/sensitive-changes` — изменения чувствительных данных

**Оценка:** 30 минут.

### 3.6 Settings Controller — добавить эндпоинты

**Нужно добавить:**
1. `GET /api/admin/settings/planning` — получение настроек (сейчас только PUT)

**Оценка:** 10 минут.

---

## 4. Согласование DTO (именование полей)

Фронт использует одни имена полей, бэк — другие. Нужно привести к единому стандарту.

В `LOVABLE_REQUIREMENTS.md` указаны имена, ожидаемые фронтом. Нужно, чтобы бэк возвращал именно такие.

**Ключевые расхождения:**

| Фронт | Бэк (сейчас) | Где исправить |
|-------|-------------|---------------|
| `monthlyNetRub` (рубли) | `monthlySalary` (рубли) | `CreateRateDto` |
| `workHoursPerYear` | `annualHours` | `CreateRateDto` |
| `effectiveFrom` | `effectiveFrom` ✅ | совпадает |
| проценты как float (0..1) | basis points (0-10000) в БД, но float в DTO | конвертировать в use cases |
| `reservePercent: 0.3` | `reservePercent: 3000` (bp) | конвертировать |

**Решение:** Привести DTO бэка к именам и форматам, ожидаемым фронтом. Конвертацию единиц (float ↔ basis points) делать в use cases / Prisma репозиториях.

**Оценка:** 30 минут.

---

## 5. Сводка приоритетов по очередности

### Pilot (делать в первую очередь):
1. **Roles Guard** — исправить lowercase во всех контроллерах
2. **JWT на PlanningController** — добавить
3. **AccessControlService** — исправить lowercase
4. **TimesheetController** — создать с нуля (самый объёмный)
5. **Finance Read Controller** — добавить 4 эндпоинта
6. **Period Readiness** — добавить эндпоинт

### Вторым этапом:
7. **DashboardController** — создать
8. **PlanningController** — реализовать 4 недостающих эндпоинта
9. **AdminController** — расширить DTO и Rate API
10. **Settings Controller** — добавить GET
11. **AuditController** — добавить sessions и sensitive-changes

### Третьим этапом (после соединения):
12. **DTO alignment** — проверить и исправить все имена полей
13. **Конвертация единиц** — float ↔ basis points в use cases
14. **FormulaConfiguration seed** — добавить дефолтные значения
15. **Export** — проверить что эндпоинты работают (они уже есть)

---

## 6. Ссылки

- Фронт-требования: `spo-front/LOVABLE_REQUIREMENTS.md`
- Prisma schema: `packages/backend/src/infrastructure/prisma/prisma/schema.prisma`
- Основной модуль: `packages/backend/src/app.module.ts`
- Примеры реализации (для копирования стиля): `packages/backend/src/**/period-closing.controller.ts`, `packages/backend/src/**/reporting.controller.ts`
