# Спецификация СПО (Система Планирования и Отчетности)

> **Версия:** 2.0  
> **Дата:** 2026-04-26  
> **Статус:** Обновлена после архитектурного ревью  
> **Назначение:** Техническая спецификация для ИИ-агентов-разработчиков

---


## 0. История изменений v2.0

Версия 2.0 доработана по результатам архитектурного ревью. В документ добавлены и уточнены:

1. Правила хранения денежных, часовых и процентных значений без использования `Float`.
2. Механизм immutable snapshots для закрытых периодов.
3. Transactional Outbox для критичных доменных событий.
4. Требования к materialized report tables для итоговых и личных отчётов.
5. Усиленные требования к безопасности секретов, LDAP/JWT и финансовых данных.
6. ABAC-проверки поверх RBAC для руководителей, менеджеров, бизнеса, бухгалтера и администратора.
7. Правила физического удаления пользователей.
8. Правила расчёта плановой себестоимости направлений тестирования и управления.
9. Производительные серверные фильтры, сортировки, пагинация и virtual scrolling для больших таблиц.
10. Контрольные требования к финансовым тестам и воспроизводимости закрытых отчётов.

---

## 1. Введение

### 1.1 Назначение документа

Настоящий документ является **исполняемой спецификацией** для агентов-разработчиков системы СПО. Каждый агент, используя свою часть документа, может реализовать закреплённый за ним модуль без необходимости задавать дополнительные вопросы.

Документ содержит:
- полную REST API-спецификацию всех модулей;
- Prisma-схему базы данных;
- описание интеграции с YouTrack;
- стейт-машину периода;
- RBAC-матрицу;
- все формулы расчёта;
- спецификацию уведомлений;
- спецификацию экспорта;
- CI/CD Pipeline;
- стратегию тестирования;
- карту приоритетов реализации;
- требования к безопасности, immutable snapshots, transactional outbox и производительности отчётов.

### 1.2 Краткое описание системы СПО

**СПО** (Система Планирования и Отчетности) — веб-портал для:
1. Планирования месячного спринта на основе задач из **YouTrack**.
2. Расчёта доступной мощности сотрудников с учётом резерва.
3. Drag-and-drop распределения задач с цветовой индикацией загрузки.
4. Фиксации плана с версионированием и выгрузкой признаков в YouTrack.
5. Загрузки фактических часов (work items) из YouTrack.
6. Формирования итогового отчёта периода с план/факт анализом.
7. Выставления оценок руководителя и бизнеса.
8. Расчёта зарплаты, эффективной ставки и себестоимости.
9. Закрытия/переоткрытия периода через стейт-машину.
10. Email-уведомлений и экспорта в Excel/PDF.

**Технологический стек:** NestJS + Next.js + PostgreSQL (Prisma) + Redis (BullMQ) + LDAP/AD + Docker Compose. Архитектурный стиль реализации: модульный монолит с Clean Architecture/DDD, Transactional Outbox для критичных событий и материализованными таблицами отчётов.

---

## 2. API Specification

### 2.1 Аутентификация

#### 2.1.1 LDAP + JWT

```
POST /api/auth/login
```

**Body:**
```json
{
  "login": "ivanov",
  "password": "secret"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "login": "ivanov",
    "fullName": "Иванов Иван",
    "email": "ivanov@company.local",
    "roles": ["Пользователь", "Руководитель"]
  }
}
```

**Схема:**
1. Клиент отправляет `login` + `password`.
2. Backend выполняет LDAP-bind к AD (`ldap[s]://ad.company.local:636`).
3. При успехе — поиск пользователя в БД по `adLogin`.
4. Если найден — генерация JWT (access 15min, refresh 7d).
5. Если не найден — ошибка 401.

**Защита эндпоинтов:**
```typescript
// Guard проверяет JWT, загружает роли пользователя из БД (кэш Redis, TTL 5min)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Директор', 'Менеджер')
```

**Refresh:**
```
POST /api/auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string, refreshToken: string }
```

#### 2.1.2 Требования безопасности аутентификации v2

1. Вся авторизация выполняется только через HTTPS.
2. Подключение к Active Directory выполняется только через LDAPS, если инфраструктура AD это поддерживает. Нешифрованный LDAP допустим только на изолированном стенде разработки.
3. Пароль пользователя никогда не сохраняется в СПО и не логируется.
4. `refreshToken` хранится на backend только в виде криптографического хеша. Сырой refresh token возвращается клиенту только один раз при выдаче/ротации.
5. Refresh token rotation обязательна: каждый успешный вызов `/api/auth/refresh` инвалидирует старый refresh token и выдаёт новый.
6. Для `/api/auth/login` включается rate limit и защита от brute-force: лимит по IP и по AD login.
7. После N неуспешных попыток входа подряд учётная запись в СПО временно блокируется для входа, без блокировки пользователя в AD.
8. Access token живёт не более 15 минут. Refresh token живёт не более 7 дней, если в настройках безопасности не задан меньший срок.
9. JWT должен содержать только минимальный набор claims: `sub`, `login`, `sessionId`, `iat`, `exp`. Роли и права загружаются сервером из БД/Redis, чтобы отзыв роли начинал действовать без ожидания истечения JWT.
10. Если refresh token хранится в cookie, cookie должна быть `HttpOnly`, `Secure`, `SameSite=Lax` или `Strict`; для небезопасных методов API включается CSRF-защита.


---

### 2.2 Модуль: Planning (Планирование)

**Привязка к ТЗ:** Раздел 9, 10, 11

#### 2.2.1 Периоды

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `POST` | `/api/planning/periods` | Создать период | 9.2 |
| `GET` | `/api/planning/periods` | Список периодов | 9.2 |
| `GET` | `/api/planning/periods/:id` | Детали периода | 9.2 |
| `PUT` | `/api/planning/periods/:id` | Обновить настройки периода | 9.2 |
| `DELETE` | `/api/planning/periods/:id` | Удалить период (только PLANNING) | 9.2 |

**POST /api/planning/periods**

```json
{
  "month": 5,
  "year": 2025,
  "workHoursPerMonth": 168,
  "reservePercent": 0.3,
  "testPercent": 0.2,
  "debugPercent": 0.3,
  "mgmtPercent": 0.1,
  "yellowThreshold": 0.8,
  "redThreshold": 1.0,
  "businessGroupingLevel": "STORY",
  "employeeIds": ["uuid-1", "uuid-2"],
  "projectFilter": ["CLOUD", "MOBILE"],
  "priorityFilter": ["Blocker", "High", "Medium", "Low"]
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "month": 5,
  "year": 2025,
  "state": "PLANNING",
  "workHoursPerMonth": 168,
  "reservePercent": 0.3,
  "createdAt": "2025-01-18T10:00:00Z"
}
```

#### 2.2.2 Бэклог и мощность

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/planning/periods/:id/backlog` | Бэклог задач для периода | 9.4, 9.5 |
| `GET` | `/api/planning/periods/:id/capacity` | Мощность сотрудников | 9.3 |

**GET /api/planning/periods/:id/backlog?system=CLOUD&priority=High&search=LOGIN**

**Query params:** `system`, `project`, `priority`, `type`, `status`, `assignee`, `reporter`, `isPlanned`, `readinessMin`, `readinessMax`, `search`

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "youtrackId": "CLOUD-123",
      "issueNumber": "CLOUD-123",
      "summary": "Реализовать логин через SSO",
      "projectName": "Cloud",
      "systemName": "Аутентификация",
      "typeName": "Story",
      "priorityName": "High",
      "stateName": "In Progress",
      "estimationHours": 10,
      "readinessPercent": 0,
      "parentIssueNumber": "CLOUD-100",
      "isPlanned": false,
      "children": [
        {
          "id": "uuid-2",
          "issueNumber": "CLOUD-124",
          "summary": "Разработка UI логина",
          "typeName": "Task",
          "estimationHours": 6
        }
      ]
    }
  ],
  "total": 150
}
```

**GET /api/planning/periods/:id/capacity**

**Response:**
```json
{
  "employees": [
    {
      "userId": "uuid",
      "fullName": "Иванов Иван",
      "workRole": "РАЗРАБОТКА",
      "workHoursPerMonth": 168,
      "reservePercent": 0.3,
      "availableHours": 117.6,
      "plannedHours": 85,
      "loadPercent": 72.3,
      "loadZone": "GREEN",
      "plannedTasks": 5
    }
  ],
  "summary": {
    "totalAvailable": 500,
    "totalPlanned": 350,
    "totalLoadPercent": 70
  }
}
```

#### 2.2.3 Управление задачами в плане

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `PUT` | `/api/planning/periods/:id/tasks/:taskId` | Назначить задачу на сотрудника | 9.6 |
| `DELETE` | `/api/planning/periods/:id/tasks/:taskId` | Снять задачу с сотрудника | 9.6 |
| `PUT` | `/api/planning/periods/:id/tasks/:taskId/sort` | Изменить порядок задачи | 9.4 |
| `PUT` | `/api/planning/periods/:id/tasks/:taskId/readiness` | Обновить % готовности | 9.4 |

**PUT /api/planning/periods/:id/tasks/:taskId**

**Body:**
```json
{
  "assigneeId": "user-uuid",
  "plannedHours": 13,
  "debugHours": 3,
  "testHours": 2,
  "mgmtHours": 1
}
```

**Response 200:**
```json
{
  "id": "task-uuid",
  "assigneeId": "user-uuid",
  "plannedHours": 13,
  "debugHours": 3,
  "testHours": 2,
  "mgmtHours": 1,
  "sortOrder": 1
}
```

#### 2.2.4 Фиксация плана

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `POST` | `/api/planning/periods/:id/fix-plan` | Зафиксировать план | 9.9 |
| `GET` | `/api/planning/periods/:id/plan-versions` | Список версий плана | 9.9 |

**POST /api/planning/periods/:id/fix-plan**

**Response 200:**
```json
{
  "versionNumber": 1,
  "isFixed": true,
  "fixedAt": "2025-01-18T12:00:00Z",
  "fixedBy": "user-uuid",
  "totalPlannedHours": 350,
  "taskCount": 25
}
```

**Событие (Domain Event):** `PlanFixed` → Integration (выгрузка в YouTrack), Notifications.

---

### 2.3 Модуль: Integration (Интеграция)

**Привязка к ТЗ:** Раздел 6, 25

#### 2.3.1 Настройки интеграции

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/integration/settings` | Настройки интеграции | 6.2 |
| `PUT` | `/api/integration/settings` | Обновить настройки | 6.2 |
| `GET` | `/api/integration/field-mapping` | Маппинг полей | 6.3 |
| `PUT` | `/api/integration/field-mapping` | Обновить маппинг | 6.3 |

**PUT /api/integration/settings**

```json
{
  "baseUrl": "https://youtrack.company.local",
  "apiToken": "perm:Y291cmRlcg==.dG9rZW4=",
  "projects": ["CLOUD", "MOBILE"],
  "searchQuery": "state: -{Archived} has: -{Done}",
  "agileBoardId": "board-uuid",
  "sprintFieldId": "field-uuid",
  "syncInterval": "0 */6 * * *",
  "batchSize": 50,
  "requestTimeout": 30000,
  "retryCount": 3,
  "errorEmail": "admin@company.local"
}
```

#### 2.3.2 Синхронизация

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `POST` | `/api/integration/sync/run` | Запустить синхронизацию | 6.2 |
| `GET` | `/api/integration/sync/runs` | История синхронизаций | 6.6 |
| `GET` | `/api/integration/sync/runs/:id` | Детали синхронизации | 6.6 |
| `POST` | `/api/integration/sync/users` | Синхронизировать пользователей | 7.1 |

**POST /api/integration/sync/run**

**Response 202:**
```json
{
  "syncRunId": "uuid",
  "status": "RUNNING",
  "triggerType": "MANUAL",
  "startedAt": "2025-01-18T12:00:00Z"
}
```

**GET /api/integration/sync/runs/:id**

**Response 200:**
```json
{
  "id": "uuid",
  "triggerType": "MANUAL",
  "startedById": "user-uuid",
  "status": "SUCCESS",
  "totalIssues": 150,
  "createdCount": 10,
  "updatedCount": 140,
  "errorCount": 0,
  "startedAt": "2025-01-18T12:00:00Z",
  "completedAt": "2025-01-18T12:00:45Z",
  "duration": 45
}
```

---

### 2.4 Модуль: Reporting (Отчётность)

**Привязка к ТЗ:** Раздел 12, 13, 16

#### 2.4.0 Правила бизнес-группировки и оценок v2

1. Итоговый бизнес-отчёт может отображаться на уровне `Эпик`, `Фича`, `История` или `Задача`.
2. Если выбран уровень `История`, то технические задачи и ошибки, вложенные в историю, агрегируются в строку истории. Бизнес-оценка ставится на отображаемую строку истории и транслируется на все дочерние work items этой строки.
3. Если выбран уровень `Фича`, бизнес-оценка ставится на фичу и транслируется на все вложенные истории, задачи и ошибки.
4. Если у задачи/ошибки нет родителя нужного уровня, она отображается как самостоятельная бизнес-строка.
5. Ключ бизнес-оценки: `periodId + displayedIssueId + groupingLevel`. Это исключает конфликт оценок при переключении уровня группировки.
6. Для личных отчётов сотрудника бизнес-оценка определяется через бизнес-строку, в которую попала задача по выбранному и зафиксированному уровню группировки периода.


#### 2.4.1 Итоговый отчёт

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/reporting/periods/:id/summary` | Итоговый отчёт периода | 12.1-12.6 |
| `GET` | `/api/reporting/periods/:id/statistics` | Статистика выполнения плана | 12.6 |

**GET /api/reporting/periods/:id/summary?system=CLOUD&groupBy=STORY&isPlanned=true**

**Query params:** `system`, `project`, `priority`, `type`, `status`, `isPlanned`, `groupBy` (EPIC|FEATURE|STORY|TASK), `search`, `sortField`, `sortOrder`

**Response 200:**
```json
{
  "period": {
    "id": "uuid",
    "month": 5,
    "year": 2025,
    "state": "FACT_LOADED"
  },
  "statistics": {
    "totalPlannedHours": 350,
    "totalActualHours": 320,
    "deviation": -30,
    "completionPercent": 91.4,
    "unplannedHours": 15,
    "unplannedPercent": 4.7,
    "remainingHours": 45,
    "unfinishedTasks": 3
  },
  "groups": [
    {
      "systemName": "Аутентификация",
      "plannedHours": 120,
      "actualHours": 110,
      "items": [
        {
          "issueNumber": "CLOUD-123",
          "summary": "Реализовать логин через SSO",
          "projectName": "Cloud",
          "systemName": "Аутентификация",
          "typeName": "Story",
          "priorityName": "High",
          "stateName": "In Progress",
          "assigneeName": "Иванов Иван",
          "isPlanned": true,
          "plannedDevHours": 13,
          "plannedTestHours": 2,
          "plannedMgmtHours": 1,
          "actualDevHours": 10,
          "actualTestHours": 1.5,
          "actualMgmtHours": 0.5,
          "remainingHours": 3,
          "readinessPercent": 80,
          "plannedCost": 5000,
          "actualCost": 4200,
          "remainingCost": 1200,
          "businessEvaluation": "Прямая выгода",
          "managerEvaluationType": "Хорошо",
          "managerComment": "Хорошая работа"
        }
      ]
    }
  ]
}
```

#### 2.4.2 Личный отчёт

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/reporting/periods/:id/personal/:userId` | Личный отчёт сотрудника | 16.2 |
| `GET` | `/api/reporting/periods/:id/personal/me` | Мой личный отчёт | 16.2 |

**GET /api/reporting/periods/:id/personal/:userId**

**Response 200:**
```json
{
  "userId": "uuid",
  "fullName": "Иванов Иван",
  "periodId": "uuid",
  "lines": [
    {
      "issueNumber": "CLOUD-123",
      "summary": "Реализовать логин через SSO",
      "stateName": "In Progress",
      "parentIssueNumber": "CLOUD-100",
      "estimationHours": 10,
      "actualHours": 10,
      "baseAmount": 7000,
      "managerPercent": 20,
      "managerAmount": 2000,
      "businessPercent": 10,
      "businessAmount": 1000,
      "totalOnHand": 10000,
      "ndfl": 1300,
      "insurance": 3000,
      "reserveVacation": 800,
      "totalWithTax": 15100,
      "effectiveRate": 1000
    }
  ],
  "totals": {
    "totalBaseAmount": 70000,
    "totalManagerAmount": 15000,
    "totalBusinessAmount": 10000,
    "totalOnHand": 95000,
    "totalNdfl": 12350,
    "totalInsurance": 28500,
    "totalReserve": 7600,
    "totalWithTax": 143450,
    "totalHours": 100
  }
}
```

#### 2.4.3 Оценки

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `POST` | `/api/reporting/evaluations/manager` | Выставить оценку руководителя | 13.1 |
| `POST` | `/api/reporting/evaluations/business` | Выставить оценку бизнеса | 13.2 |
| `PUT` | `/api/reporting/evaluations/manager/:id` | Изменить оценку руководителя | 13.4 |
| `PUT` | `/api/reporting/evaluations/business/:id` | Изменить оценку бизнеса | 13.4 |

**POST /api/reporting/evaluations/manager**

```json
{
  "periodId": "uuid",
  "youtrackIssueId": "CLOUD-123",
  "userId": "employee-uuid",
  "evaluationType": "Хорошо",
  "comment": "Хорошо справился с задачей"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "evaluationType": "Хорошо",
  "percent": 20,
  "comment": "Хорошо справился с задачей"
}
```

**POST /api/reporting/evaluations/business**

```json
{
  "periodId": "uuid",
  "youtrackIssueId": "CLOUD-123",
  "evaluationType": "Прямая выгода",
  "comment": "Важная задача для бизнеса"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "evaluationType": "Прямая выгода",
  "percent": 10,
  "comment": "Важная задача для бизнеса"
}
```

---

### 2.5 Модуль: Finance (Финансы)

**Привязка к ТЗ:** Раздел 14, 15

#### 2.5.0 Правила плановой себестоимости v2

1. Для разработки плановая себестоимость считается по ставке сотрудника, на которого запланирована задача, и оценкам по умолчанию: руководитель — `Хорошо`, бизнес — `Прямая выгода`.
2. Для отладки применяется ставка того же разработчика, на которого запланирована задача.
3. Для тестирования и управления на этапе планирования конкретный исполнитель неизвестен. Плановая себестоимость направления считается по средней активной эффективной ставке сотрудников соответствующей рабочей роли за период.
4. Средняя ставка направления рассчитывается как средневзвешенная по доступной мощности сотрудников роли в месяце.
5. Фактическая себестоимость всегда считается по конкретным work items и ставкам конкретных сотрудников.
6. Если в роли направления нет активных сотрудников со ставкой, система должна показать предупреждение в плане и не считать плановую себестоимость направления до заполнения ставок.


| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/finance/rates/:userId` | Текущая ставка сотрудника | 14.1 |
| `POST` | `/api/finance/rates/:userId` | Создать/обновить ставку | 14.2 |
| `GET` | `/api/finance/rates/:userId/history` | История ставок | 14.2 |
| `GET` | `/api/finance/formulas` | Список формул | 14.4 |
| `PUT` | `/api/finance/formulas/:id` | Обновить формулу | 14.4 |
| `GET` | `/api/finance/formulas/versions` | История версий формул | 14.4 |
| `GET` | `/api/finance/periods/:id/calculations` | Финансовый расчёт периода | 14.5 |
| `GET` | `/api/finance/periods/:id/cost` | Себестоимость периода | 15 |

**POST /api/finance/rates/:userId**

```json
{
  "monthlySalary": 150000,
  "annualHours": 1976,
  "effectiveFrom": "2025-01-01",
  "changeReason": "Индексация ЗП"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "monthlySalary": 150000,
  "annualHours": 1976,
  "hourlyRate": 910.93,
  "effectiveFrom": "2025-01-01",
  "effectiveTo": null
}
```

**PUT /api/finance/formulas/:id**

```json
{
  "value": 13,
  "changeReason": "Изменение ставки НДФЛ"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "НДФЛ",
  "formulaType": "NDFL",
  "value": 13,
  "isActive": true
}
```

---

### 2.6 Модуль: Administration (Администрирование)

**Привязка к ТЗ:** Раздел 5, 7, 8, 19

#### 2.6.1 Пользователи

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/admin/users` | Список пользователей | 7.2, 19.1 |
| `POST` | `/api/admin/users` | Создать пользователя | 19.1 |
| `PUT` | `/api/admin/users/:id` | Обновить пользователя | 19.1 |
| `DELETE` | `/api/admin/users/:id` | Мягкое удаление (deactivate) | 19.2 |
| `POST` | `/api/admin/users/sync` | Синхронизировать с YouTrack | 7.1 |
| `PUT` | `/api/admin/users/:id/roles` | Назначить роли | 5.1 |

**PUT /api/admin/users/:id/roles**

```json
{
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}
```

**Response 200:**
```json
{
  "userId": "uuid",
  "roles": ["Пользователь", "Руководитель"]
}
```

#### 2.6.2 Справочники и настройки

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/admin/dictionaries` | Все справочники | 8.1 |
| `GET` | `/api/admin/dictionaries/:type` | Справочник по типу | 8.1 |
| `PUT` | `/api/admin/settings/planning` | Настройки планирования | 8.2 |
| `PUT` | `/api/admin/settings/finance` | Финансовые настройки | 8.3 |
| `GET` | `/api/admin/audit-log` | Журнал аудита | 10 |
| `GET` | `/api/admin/audit-log/:entity/:id` | Аудит по сущности | 10 |

**GET /api/admin/dictionaries**

**Response:**
```json
{
  "workRoles": [
    { "id": "uuid", "name": "Разработка" },
    { "id": "uuid", "name": "Тестирование" },
    { "id": "uuid", "name": "Управление" },
    { "id": "uuid", "name": "Другое" }
  ],
  "evaluationScales": {
    "manager": [
      { "name": "Плохо", "percent": 0 },
      { "name": "Удовлетворительно", "percent": 10 },
      { "name": "Хорошо", "percent": 20, "isDefault": true },
      { "name": "Отлично", "percent": 30 }
    ],
    "business": [
      { "name": "Нет пользы", "percent": 0 },
      { "name": "Прямая выгода", "percent": 10, "isDefault": true },
      { "name": "Польза очевидна", "percent": 20 }
    ]
  }
}
```

**PUT /api/admin/settings/planning**

```json
{
  "workHoursPerMonth": 168,
  "reservePercent": 0.3,
  "testPercent": 0.2,
  "debugPercent": 0.3,
  "mgmtPercent": 0.1,
  "yellowThreshold": 0.8,
  "redThreshold": 1.0,
  "businessGroupingLevel": "STORY"
}
```

#### 2.6.3 Управление периодами

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/admin/periods` | Все периоды (админ. доступ) | 19.1 |

---

### 2.7 Модуль: Notifications (Уведомления)

**Привязка к ТЗ:** Раздел 20

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/notifications/templates` | Шаблоны уведомлений | 20.3 |
| `PUT` | `/api/notifications/templates/:id` | Обновить шаблон | 20.3 |
| `GET` | `/api/notifications/settings` | Настройки уведомлений | 20.3 |
| `PUT` | `/api/notifications/settings` | Обновить настройки | 20.3 |
| `GET` | `/api/notifications/history` | История отправок | 20.2 |
| `POST` | `/api/notifications/test` | Тестовое уведомление | 20.2 |

**PUT /api/notifications/templates/:id**

```json
{
  "subject": "План зафиксирован: {{periodName}}",
  "body": "<h1>План на {{periodName}} зафиксирован</h1><p>Всего задач: {{taskCount}}</p>",
  "isActive": true
}
```

**GET /api/notifications/history?status=FAILED&limit=10**

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "eventName": "sync.failed",
      "recipientName": "Администратор",
      "status": "SENT",
      "sentAt": "2025-01-18T12:00:00Z"
    }
  ]
}
```

---

### 2.8 Модуль: Workflow (Стейт-машина)

**Привязка к ТЗ:** Раздел 17

| Метод | Path | Описание | ТЗ |
|---|---|---|---|
| `GET` | `/api/workflow/periods/:id/state` | Текущее состояние | 17 |
| `POST` | `/api/workflow/periods/:id/transition` | Выполнить переход | 17.1 |
| `GET` | `/api/workflow/periods/:id/transitions` | Доступные переходы | 17 |
| `GET` | `/api/workflow/periods/:id/history` | История переходов | 17 |
| `POST` | `/api/workflow/periods/:id/reopen` | Переоткрыть период | 17.2 |

**POST /api/workflow/periods/:id/transition**

```json
{
  "transition": "FIX_PLAN"
}
```

**Response 200:**
```json
{
  "periodId": "uuid",
  "fromState": "PLANNING",
  "toState": "PLAN_FIXED",
  "transitionedAt": "2025-01-18T12:00:00Z"
}
```

**POST /api/workflow/periods/:id/reopen**

```json
{
  "reason": "Обнаружена ошибка в расчёте",
  "targetState": "FACT_LOADED"
}
```

**Response 200:**
```json
{
  "periodId": "uuid",
  "fromState": "PERIOD_CLOSED",
  "toState": "PERIOD_REOPENED",
  "targetState": "FACT_LOADED",
  "reason": "Обнаружена ошибка в расчёте"
}
```

---

### 2.9 Экспорт

**Привязка к ТЗ:** Раздел 21

| Метод | Path | Описание | Формат |
|---|---|---|---|
| `GET` | `/api/reporting/periods/:id/export/excel` | Итоговый отчёт | Excel (.xlsx) |
| `GET` | `/api/reporting/periods/:id/personal/:userId/export/excel` | Личный отчёт | Excel (.xlsx) |
| `GET` | `/api/reporting/periods/:id/personal/:userId/export/pdf` | Личный отчёт | PDF |
| `GET` | `/api/reporting/periods/:id/export/changelog/excel` | Журнал изменений | Excel (.xlsx) |
| `GET` | `/api/reporting/periods/:id/export/plan/excel` | План спринта | Excel (.xlsx) |

**Query params (все экспорты):** `?system=CLOUD&project=CLOUD&isPlanned=true` — фильтры применяются к экспорту.

**Response:** Content-Disposition: attachment, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet



### 2.9 Access Policy v2: RBAC + ABAC

RBAC определяет базовые возможности роли, но каждый финансовый и отчётный endpoint дополнительно проверяет контекст доступа через `AccessPolicyService`.

Обязательные policy-методы backend:

```typescript
canViewPersonalReport(viewer, employeeId, periodId): boolean
canEditManagerEvaluation(viewer, employeeId, periodId): boolean
canEditBusinessEvaluation(viewer, periodId): boolean
canEditReadinessPercent(viewer, periodId): boolean
canViewFinance(viewer, scope): boolean
canManageRates(viewer, employeeId): boolean
canReopenPeriod(viewer, periodId): boolean
canExportReport(viewer, reportType, scope): boolean
```

Правила применяются на backend независимо от состояния UI. Запрещено фильтровать данные только на frontend.

### 2.10 Требования к таблицам API v2

Все endpoints, возвращающие списки задач, отчётов и строк личных отчётов, должны поддерживать серверную пагинацию, сортировку и фильтрацию. Запрещено отдавать на frontend полный отчёт с тысячами строк для последующей фильтрации только в браузере.

Обязательные query-параметры для табличных endpoints:

```text
page, pageSize, sortField, sortOrder, filters, search
```

Ответ должен содержать:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 50,
  "total": 1234,
  "totals": {},
  "appliedFilters": {}
}
```

`totals` рассчитываются на backend по текущему фильтру, а не по текущей странице.

---

## 3. База данных (Prisma Schema)


### 3.0 Правила хранения числовых и финансовых данных v2

В СПО запрещено использовать `Float` для хранения денег, ставок, процентов и часов в БД.

| Тип значения | Способ хранения | Обоснование |
|---|---|---|
| Денежные суммы | `Decimal @db.Decimal(18,2)` или целые копейки `BigInt` | Исключить ошибки округления в зарплате, налогах и себестоимости. |
| Ставки | `Decimal @db.Decimal(18,6)` | Ставка может содержать дробную часть и участвует в расчётах. |
| Проценты | `Decimal @db.Decimal(6,4)` для долей 0.3000 или `Int basis points` для процентов 3000 = 30% | Единый и точный формат расчёта. |
| Длительности YouTrack | `Int` в минутах | YouTrack отдаёт длительность в минутах; это источник истины. |
| Отображаемые часы | вычисляются как `minutes / 60` | UI показывает часы, БД хранит минуты. |

Правило для API: во внешних DTO допускается передавать часы и проценты в человекочитаемом виде, но на boundary backend они конвертируются во внутренний точный формат.

### 3.1 Полная Prisma-схема

Все модели, поля, типы, связи, индексы и маппинг имён.

```prisma
// ──────────────────────────────────────────────────────────────────
// Источник истины: specification.md
// Согласовано с: architecture.md
// База: PostgreSQL 16
// Стратегия: Один schema.prisma файл, миграции через prisma migrate
// v2: деньги/ставки/проценты/часы не хранятся через Float; используется Decimal или минуты Int
// ──────────────────────────────────────────────────────────────────

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ══════════════════════════════════════════════════════════════════
// Administration (Администрирование)
// ТЗ: Разделы 5, 7, 8, 19
// ══════════════════════════════════════════════════════════════════

model User {
  id              String    @id @default(uuid()) @map("id")
  login           String    @unique @map("login")
  email           String?   @map("email")
  fullName        String?   @map("full_name")
  youtrackLogin   String?   @map("youtrack_login")
  youtrackUserId  String?   @map("youtrack_user_id")
  adLogin         String?   @map("ad_login")
  isActive        Boolean   @default(true) @map("is_active")
  isBlocked       Boolean   @default(false) @map("is_blocked")
  employmentDate  DateTime? @map("employment_date")
  terminationDate DateTime? @map("termination_date")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  extensions      Json?     @map("extensions")

  roles                 UserRole[]
  employeeProfile       EmployeeProfile?
  rateHistory           EmployeeRateHistory[]
  auditLogs             AuditLog[]
  refreshSessions       RefreshSession[]
  plannedTasks          PlannedTask[]
  managerEvaluations    ManagerEvaluation[]     @relation("ManagerEvaluator")
  businessEvaluations   BusinessEvaluation[]    @relation("BusinessEvaluator")
  supervisedEmployees   EmployeeProfile[]       @relation("Supervision")
  createdPeriods        ReportingPeriod[]       @relation("PeriodCreator")
  fixedPlans            SprintPlan[]            @relation("PlanFixer")

  @@index([isActive])
  @@index([adLogin])
  @@index([youtrackLogin])
  @@index([youtrackUserId])
  @@map("users")
}

model Role {
  id          String   @id @default(uuid()) @map("id")
  name        String   @unique @map("name")
  description String?  @map("description")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  extensions  Json?    @map("extensions")

  users UserRole[]

  @@map("roles")
}

model UserRole {
  userId    String   @map("user_id")
  roleId    String   @map("role_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
  @@map("user_roles")
}


model RefreshSession {
  id               String    @id @default(uuid()) @map("id")
  userId           String    @map("user_id")
  refreshTokenHash String    @map("refresh_token_hash")
  userAgent        String?   @map("user_agent")
  ipAddress        String?   @map("ip_address")
  expiresAt        DateTime  @map("expires_at")
  revokedAt        DateTime? @map("revoked_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  lastUsedAt       DateTime? @map("last_used_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("refresh_sessions")
}

model WorkRole {
  id          String            @id @default(uuid()) @map("id")
  name        String            @unique @map("name")
  description String?           @map("description")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")
  extensions  Json?             @map("extensions")

  employees   EmployeeProfile[]

  @@map("work_roles")
}

model EvaluationScale {
  id          String   @id @default(uuid()) @map("id")
  scaleType   String   @map("scale_type")     // MANAGER | BUSINESS
  name        String   @map("name")
  percent     Decimal    @map("percent") @db.Decimal(8,4)
  isDefault   Boolean  @default(false) @map("is_default")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  extensions  Json?    @map("extensions")

  @@unique([scaleType, name])
  @@index([scaleType])
  @@map("evaluation_scales")
}

model EmployeeProfile {
  id                  String   @id @default(uuid()) @map("id")
  userId              String   @unique @map("user_id")
  workRoleId          String?  @map("work_role_id")
  managerId           String?  @map("manager_id")
  plannedHoursPerYear Int?     @map("planned_hours_per_year")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  extensions          Json?    @map("extensions")

  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  workRole    WorkRole?  @relation(fields: [workRoleId], references: [id])
  supervisor  User?      @relation("Supervision", fields: [managerId], references: [id])

  @@index([managerId])
  @@index([workRoleId])
  @@map("employee_profiles")
}

// ══════════════════════════════════════════════════════════════════
// Planning (Планирование)
// ТЗ: Разделы 9, 10, 11
// ══════════════════════════════════════════════════════════════════

model ReportingPeriod {
  id                  String    @id @default(uuid()) @map("id")
  month               Int       @map("month")
  year                Int       @map("year")
  state               String    @default("PLANNING") @map("state")
  workHoursPerMonth   Int?      @map("work_hours_per_month")
  reservePercent      Decimal?    @default(0.3) @map("reserve_percent") @db.Decimal(8,4)
  testPercent         Decimal?    @default(0.2) @map("test_percent") @db.Decimal(8,4)
  debugPercent        Decimal?    @default(0.3) @map("debug_percent") @db.Decimal(8,4)
  mgmtPercent         Decimal?    @default(0.1) @map("mgmt_percent") @db.Decimal(8,4)
  yellowThreshold     Decimal?    @default(0.8) @map("yellow_threshold") @db.Decimal(8,4)
  redThreshold        Decimal?    @default(1.0) @map("red_threshold") @db.Decimal(8,4)
  businessGroupingLevel String? @default("STORY") @map("business_grouping_level")
  employeeFilter      Json?     @map("employee_filter")
  projectFilter       Json?     @map("project_filter")
  priorityFilter      Json?     @map("priority_filter")
  closedAt            DateTime? @map("closed_at")
  reopenedAt          DateTime? @map("reopened_at")
  reopenReason        String?   @map("reopen_reason")
  createdById         String    @map("created_by_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  extensions          Json?     @map("extensions")

  createdBy           User                  @relation("PeriodCreator", fields: [createdById], references: [id])
  sprintPlans         SprintPlan[]
  periodTransitions   PeriodTransition[]
  summaryReports      PeriodSummaryReport[]
  personalReports     PersonalReport[]
  managerEvaluations  ManagerEvaluation[]
  businessEvaluations BusinessEvaluation[]

  @@unique([month, year])
  @@index([state])
  @@index([year, month, state])
  @@map("reporting_periods")
}

model PeriodTransition {
  id        String   @id @default(uuid()) @map("id")
  periodId  String   @map("period_id")
  fromState String   @map("from_state")
  toState   String   @map("to_state")
  reason    String?  @map("reason")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  period ReportingPeriod @relation(fields: [periodId], references: [id])

  @@index([periodId])
  @@map("period_transitions")
}

model SprintPlan {
  id            String    @id @default(uuid()) @map("id")
  periodId      String    @map("period_id")
  versionNumber Int       @default(1) @map("version_number")
  isFixed       Boolean   @default(false) @map("is_fixed")
  fixedAt       DateTime? @map("fixed_at")
  fixedById     String?   @map("fixed_by_id")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  extensions    Json?     @map("extensions")

  period       ReportingPeriod @relation(fields: [periodId], references: [id])
  fixedBy      User?           @relation("PlanFixer", fields: [fixedById], references: [id])
  plannedTasks PlannedTask[]

  @@index([periodId])
  @@index([periodId, versionNumber])
  @@map("sprint_plans")
}

model PlannedTask {
  id              String   @id @default(uuid()) @map("id")
  sprintPlanId    String   @map("sprint_plan_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  assigneeId      String?  @map("assignee_id")
  plannedHours    Decimal    @default(0) @map("planned_hours") @db.Decimal(12,2)
  debugHours      Decimal    @default(0) @map("debug_hours") @db.Decimal(12,2)
  testHours       Decimal    @default(0) @map("test_hours") @db.Decimal(12,2)
  mgmtHours       Decimal    @default(0) @map("mgmt_hours") @db.Decimal(12,2)
  sortOrder       Int      @default(0) @map("sort_order")
  readinessPercent Decimal?  @default(0) @map("readiness_percent") @db.Decimal(8,4)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  sprintPlan SprintPlan @relation(fields: [sprintPlanId], references: [id], onDelete: Cascade)
  assignee   User?      @relation(fields: [assigneeId], references: [id])

  @@unique([sprintPlanId, youtrackIssueId])
  @@index([sprintPlanId])
  @@index([assigneeId])
  @@index([youtrackIssueId])
  @@map("planned_tasks")
}

// ══════════════════════════════════════════════════════════════════
// Integration (Интеграция)
// ТЗ: Разделы 6, 25
// ══════════════════════════════════════════════════════════════════

model YouTrackIssue {
  id                String    @id @default(uuid()) @map("id")
  youtrackId        String    @unique @map("youtrack_id")
  issueNumber       String    @map("issue_number")
  summary           String    @map("summary")
  description       String?   @map("description")
  projectName       String?   @map("project_name")
  systemName        String?   @map("system_name")
  sprintName        String?   @map("sprint_name")
  typeName          String?   @map("type_name")
  priorityName      String?   @map("priority_name")
  stateName         String?   @map("state_name")
  isResolved        Boolean   @default(false) @map("is_resolved")
  reporterId        String?   @map("reporter_id")
  assigneeId        String?   @map("assignee_id")
  estimationMinutes Int?      @map("estimation_minutes")
  parentIssueId     String?   @map("parent_issue_id")
  parentYtId        String?   @map("parent_yt_id")
  lastSyncAt        DateTime? @map("last_sync_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  extensions        Json?     @map("extensions")

  parentIssue YouTrackIssue? @relation("IssueHierarchy", fields: [parentIssueId], references: [id])
  childIssues YouTrackIssue[] @relation("IssueHierarchy")
  workItems   WorkItem[]

  @@index([projectName])
  @@index([systemName])
  @@index([assigneeId])
  @@index([parentIssueId])
  @@index([isResolved])
  @@index([issueNumber])
  @@map("youtrack_issues")
}

model WorkItem {
  id                String    @id @default(uuid()) @map("id")
  issueId           String    @map("issue_id")
  youtrackWorkItemId String?  @map("youtrack_work_item_id")
  authorId          String?   @map("author_id")
  durationMinutes   Int       @default(0) @map("duration_minutes")
  description       String?   @map("description")
  workDate          DateTime? @map("work_date")
  workTypeName      String?   @map("work_type_name")
  periodId          String?   @map("period_id")
  createdAt         DateTime  @default(now()) @map("created_at")

  issue YouTrackIssue @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@index([issueId])
  @@index([periodId])
  @@index([authorId])
  @@index([periodId, authorId])
  @@map("work_items")
}

model IntegrationSettings {
  id                String   @id @default(uuid()) @map("id")
  baseUrl           String   @map("base_url")
  apiTokenEncrypted String   @map("api_token_encrypted")
  projects          Json     @map("projects")
  searchQuery       String?  @map("search_query")
  agileBoardId      String?  @map("agile_board_id")
  sprintFieldId     String?  @map("sprint_field_id")
  syncInterval      String?  @default("0 */6 * * *") @map("sync_interval")
  batchSize         Int      @default(50) @map("batch_size")
  requestTimeout    Int      @default(30000) @map("request_timeout")
  retryCount        Int      @default(3) @map("retry_count")
  errorEmail        String?  @map("error_email")
  fieldMapping      Json?    @map("field_mapping")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  extensions        Json?    @map("extensions")

  @@map("integration_settings")
}

model SyncRun {
  id          String    @id @default(uuid()) @map("id")
  triggerType String    @map("trigger_type")
  startedById String?   @map("started_by_id")
  status      String    @default("RUNNING") @map("status")
  totalIssues Int       @default(0) @map("total_issues")
  createdCount Int      @default(0) @map("created_count")
  updatedCount Int      @default(0) @map("updated_count")
  errorCount  Int       @default(0) @map("error_count")
  errors      Json?     @map("errors")
  startedAt   DateTime  @default(now()) @map("started_at")
  completedAt DateTime? @map("completed_at")
  duration    Int?      @map("duration")
  extensions  Json?     @map("extensions")

  logs SyncLogEntry[]

  @@index([status])
  @@index([startedAt])
  @@map("sync_runs")
}

model SyncLogEntry {
  id         String   @id @default(uuid()) @map("id")
  syncRunId  String   @map("sync_run_id")
  level      String   @map("level")
  message    String   @map("message")
  entityId   String?  @map("entity_id")
  entityType String?  @map("entity_type")
  details    Json?    @map("details")
  createdAt  DateTime @default(now()) @map("created_at")

  syncRun SyncRun @relation(fields: [syncRunId], references: [id], onDelete: Cascade)

  @@index([syncRunId])
  @@map("sync_log_entries")
}

// ══════════════════════════════════════════════════════════════════
// Reporting (Отчётность)
// ТЗ: Разделы 12, 13, 16
// ══════════════════════════════════════════════════════════════════

model ManagerEvaluation {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @map("period_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  userId          String   @map("user_id")
  evaluatedById   String   @map("evaluated_by_id")
  evaluationType  String   @map("evaluation_type")
  percent         Decimal    @default(20) @map("percent") @db.Decimal(8,4)
  comment         String?  @map("comment")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  period      ReportingPeriod @relation(fields: [periodId], references: [id])
  user        User            @relation("ManagerEvaluated", fields: [userId], references: [id])
  evaluatedBy User            @relation("ManagerEvaluator", fields: [evaluatedById], references: [id])

  @@unique([periodId, youtrackIssueId, userId])
  @@index([periodId])
  @@index([userId])
  @@index([periodId, userId])
  @@map("manager_evaluations")
}

model BusinessEvaluation {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @map("period_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  evaluatedById   String   @map("evaluated_by_id")
  evaluationType  String   @map("evaluation_type")
  percent         Decimal    @default(10) @map("percent") @db.Decimal(8,4)
  comment         String?  @map("comment")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  period      ReportingPeriod @relation(fields: [periodId], references: [id])
  evaluatedBy User            @relation("BusinessEvaluator", fields: [evaluatedById], references: [id])

  @@unique([periodId, youtrackIssueId])
  @@index([periodId])
  @@index([youtrackIssueId])
  @@map("business_evaluations")
}

model PersonalReport {
  id                 String   @id @default(uuid()) @map("id")
  periodId           String   @map("period_id")
  userId             String   @map("user_id")
  totalBaseAmount    Decimal    @default(0) @map("total_base_amount") @db.Decimal(18,2)
  totalManagerAmount Decimal    @default(0) @map("total_manager_amount") @db.Decimal(18,2)
  totalBusinessAmount Decimal   @default(0) @map("total_business_amount") @db.Decimal(18,2)
  totalOnHand        Decimal    @default(0) @map("total_on_hand") @db.Decimal(18,2)
  totalNdfl          Decimal    @default(0) @map("total_ndfl") @db.Decimal(18,2)
  totalInsurance     Decimal    @default(0) @map("total_insurance") @db.Decimal(18,2)
  totalReserve       Decimal    @default(0) @map("total_reserve") @db.Decimal(18,2)
  totalWithTax       Decimal    @default(0) @map("total_with_tax") @db.Decimal(18,2)
  totalHours         Decimal    @default(0) @map("total_hours") @db.Decimal(12,2)
  isFrozen           Boolean  @default(false) @map("is_frozen")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  extensions         Json?    @map("extensions")

  period ReportingPeriod      @relation(fields: [periodId], references: [id])
  user   User                 @relation(fields: [userId], references: [id])
  lines  PersonalReportLine[]

  @@unique([periodId, userId])
  @@index([periodId])
  @@index([userId])
  @@map("personal_reports")
}

model PersonalReportLine {
  id              String   @id @default(uuid()) @map("id")
  personalReportId String  @map("personal_report_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  hours           Decimal    @default(0) @map("hours") @db.Decimal(12,2)
  baseAmount      Decimal    @default(0) @map("base_amount") @db.Decimal(18,2)
  managerPercent  Decimal?   @map("manager_percent") @db.Decimal(8,4)
  managerAmount   Decimal    @default(0) @map("manager_amount") @db.Decimal(18,2)
  businessPercent  Decimal?  @map("business_percent") @db.Decimal(8,4)
  businessAmount  Decimal    @default(0) @map("business_amount") @db.Decimal(18,2)
  totalOnHand     Decimal    @default(0) @map("total_on_hand") @db.Decimal(18,2)
  ndfl            Decimal    @default(0) @map("ndfl") @db.Decimal(18,2)
  insurance       Decimal    @default(0) @map("insurance") @db.Decimal(18,2)
  reserveVacation Decimal    @default(0) @map("reserve_vacation") @db.Decimal(18,2)
  totalWithTax    Decimal    @default(0) @map("total_with_tax") @db.Decimal(18,2)
  effectiveRate   Decimal    @default(0) @map("effective_rate") @db.Decimal(18,6)
  createdAt       DateTime @default(now()) @map("created_at")

  personalReport PersonalReport @relation(fields: [personalReportId], references: [id], onDelete: Cascade)

  @@index([personalReportId])
  @@map("personal_report_lines")
}

model PeriodSummaryReport {
  id               String    @id @default(uuid()) @map("id")
  periodId         String    @unique @map("period_id")
  totalPlannedHours  Decimal   @default(0) @map("total_planned_hours") @db.Decimal(12,2)
  totalActualHours Decimal     @default(0) @map("total_actual_hours") @db.Decimal(12,2)
  totalDeviation   Decimal     @default(0) @map("total_deviation") @db.Decimal(12,2)
  completionPercent Decimal    @default(0) @map("completion_percent") @db.Decimal(8,4)
  unplannedHours   Decimal     @default(0) @map("unplanned_hours") @db.Decimal(12,2)
  unplannedPercent  Decimal    @default(0) @map("unplanned_percent") @db.Decimal(8,4)
  remainingHours   Decimal     @default(0) @map("remaining_hours") @db.Decimal(12,2)
  unfinishedTasks  Int       @default(0) @map("unfinished_tasks")
  dataSnapshot     Json?     @map("data_snapshot")
  isFrozen         Boolean   @default(false) @map("is_frozen")
  calculatedAt     DateTime? @map("calculated_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  extensions       Json?     @map("extensions")

  period ReportingPeriod @relation(fields: [periodId], references: [id])
  lines  PeriodSummaryReportLine[]

  @@map("period_summary_reports")
}


model PeriodSummaryReportLine {
  id                   String   @id @default(uuid()) @map("id")
  periodId             String   @map("period_id")
  reportId             String   @map("report_id")
  groupingLevel        String   @map("grouping_level")
  displayedIssueId     String   @map("displayed_issue_id")
  displayedIssueNumber String   @map("displayed_issue_number")
  displayedSummary     String   @map("displayed_summary")
  projectName          String?  @map("project_name")
  systemName           String?  @map("system_name")
  typeName             String?  @map("type_name")
  priorityName         String?  @map("priority_name")
  stateName            String?  @map("state_name")
  isPlanned            Boolean  @default(false) @map("is_planned")
  plannedMinutes       Int      @default(0) @map("planned_minutes")
  actualMinutes        Int      @default(0) @map("actual_minutes")
  remainingMinutes     Int      @default(0) @map("remaining_minutes")
  plannedCost          Decimal  @default(0) @map("planned_cost") @db.Decimal(18,2)
  actualCost           Decimal  @default(0) @map("actual_cost") @db.Decimal(18,2)
  remainingCost        Decimal  @default(0) @map("remaining_cost") @db.Decimal(18,2)
  readinessPercent     Decimal? @default(0) @map("readiness_percent") @db.Decimal(8,4)
  businessEvaluation   String?  @map("business_evaluation")
  lineSnapshot         Json?    @map("line_snapshot")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  period ReportingPeriod     @relation(fields: [periodId], references: [id])
  report PeriodSummaryReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([periodId])
  @@index([reportId])
  @@index([periodId, systemName])
  @@index([periodId, projectName])
  @@index([periodId, priorityName])
  @@index([periodId, isPlanned])
  @@index([periodId, groupingLevel])
  @@map("period_summary_report_lines")
}

model ClosedPeriodSnapshot {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @unique @map("period_id")
  snapshotVersion Int      @default(1) @map("snapshot_version")
  createdById     String   @map("created_by_id")
  createdAt       DateTime @default(now()) @map("created_at")
  payload          Json     @map("payload")
  checksum         String?  @map("checksum")

  period ReportingPeriod @relation(fields: [periodId], references: [id])

  @@index([createdAt])
  @@map("closed_period_snapshots")
}

// ══════════════════════════════════════════════════════════════════
// Finance (Финансы)
// ТЗ: Разделы 14, 15
// ══════════════════════════════════════════════════════════════════

model EmployeeRateHistory {
  id            String    @id @default(uuid()) @map("id")
  userId        String    @map("user_id")
  monthlySalary Decimal     @map("monthly_salary") @db.Decimal(18,2)
  annualHours   Int       @map("annual_hours")
  hourlyRate    Decimal     @map("hourly_rate") @db.Decimal(18,6)
  effectiveFrom DateTime  @map("effective_from")
  effectiveTo   DateTime? @map("effective_to")
  changedById   String    @map("changed_by_id")
  changeReason  String?   @map("change_reason")
  createdAt     DateTime  @default(now()) @map("created_at")
  extensions    Json?     @map("extensions")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([effectiveFrom])
  @@index([userId, effectiveFrom])
  @@map("employee_rate_history")
}

model FormulaConfiguration {
  id          String   @id @default(uuid()) @map("id")
  name        String   @unique @map("name")
  formulaType String   @map("formula_type")
  value       Decimal    @map("value") @db.Decimal(8,4)
  description String?  @map("description")
  isActive    Boolean  @default(true) @map("is_active")
  createdById String   @map("created_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  extensions  Json?    @map("extensions")

  versions FormulaConfigurationVersion[]

  @@map("formula_configurations")
}

model FormulaConfigurationVersion {
  id           String   @id @default(uuid()) @map("id")
  formulaId    String   @map("formula_id")
  versionNumber Int     @map("version_number")
  value        Decimal    @map("value") @db.Decimal(8,4)
  changedById  String   @map("changed_by_id")
  changeReason String?  @map("change_reason")
  createdAt    DateTime @default(now()) @map("created_at")

  formula FormulaConfiguration @relation(fields: [formulaId], references: [id])

  @@index([formulaId])
  @@map("formula_configuration_versions")
}

// ══════════════════════════════════════════════════════════════════
// Notifications (Уведомления)
// ТЗ: Раздел 20
// ══════════════════════════════════════════════════════════════════

model NotificationTemplate {
  id        String   @id @default(uuid()) @map("id")
  eventName String   @unique @map("event_name")
  subject   String   @map("subject")
  body      String   @map("body")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  extensions Json?   @map("extensions")

  runs NotificationRun[]

  @@map("notification_templates")
}

model NotificationRun {
  id          String    @id @default(uuid()) @map("id")
  templateId  String?   @map("template_id")
  eventName   String    @map("event_name")
  recipientId String    @map("recipient_id")
  status      String    @default("PENDING") @map("status")
  error       String?   @map("error")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  template NotificationTemplate? @relation(fields: [templateId], references: [id])

  @@index([status])
  @@index([createdAt])
  @@map("notification_runs")
}

// ══════════════════════════════════════════════════════════════════
// Transactional Outbox (надёжные доменные события)
// ══════════════════════════════════════════════════════════════════

model OutboxEvent {
  id             String    @id @default(uuid()) @map("id")
  eventName      String    @map("event_name")
  aggregateType  String    @map("aggregate_type")
  aggregateId    String    @map("aggregate_id")
  payload        Json      @map("payload")
  status         String    @default("PENDING") @map("status")
  attempts       Int       @default(0) @map("attempts")
  nextAttemptAt  DateTime? @map("next_attempt_at")
  processedAt    DateTime? @map("processed_at")
  error          String?   @map("error")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@index([status, nextAttemptAt])
  @@index([aggregateType, aggregateId])
  @@index([eventName])
  @@map("outbox_events")
}

// ══════════════════════════════════════════════════════════════════
// Audit (Аудит)
// ТЗ: Раздел 10
// ══════════════════════════════════════════════════════════════════

model AuditLog {
  id         String   @id @default(uuid()) @map("id")
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  action     String   @map("action")
  userId     String?  @map("user_id")
  changes    Json?    @map("changes")
  metadata   Json?    @map("metadata")
  createdAt  DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([userId])
  @@map("audit_logs")
}

```

### 3.2 Миграционная стратегия

| Правило | Описание |
|---|---|
| **Формат миграций** | SQL (сгенерированный Prisma) — `prisma migrate dev` / `prisma migrate deploy` |
| **Именование** | `YYYYMMDD_HHMMSS_description` (авто, Prisma) |
| **CI/CD** | `prisma migrate deploy` — выполняется в контейнере при старте backend'а |
| **Откат** | `prisma migrate diff` — генерация SQL для ручного отката. Авто-откат не используется |
| **Breaking changes без downtime** | 1. Создать новую колонку nullable; 2. Заполнить данные; 3. Сделать NOT NULL; 4. Удалить старую |

**Правила работы с миграциями:**

1. Каждая миграция — отдельный коммит.
2. Миграции **не редактируются** после коммита (только новая миграция).
3. На staging — `prisma migrate deploy` перед тестами.
4. На production — `prisma migrate deploy` в рамках деплоя (не в runtime).
5. Новый модуль добавляет поля через `extensions Json?` — без миграции. При необходимости — полноценная миграция.

**Стратегия для таблиц с extensions:**

```typescript
// Пример чтения данных из extensions
const user = await prisma.user.findUnique({ where: { id } });
const customField = (user.extensions as Record<string, unknown>)?.['customField'];
```


## 3.3 Immutable snapshots закрытого периода v2

При закрытии периода СПО формирует неизменяемый снимок данных, достаточный для воспроизведения отчёта без обращения к актуальному состоянию YouTrack и текущим настройкам системы.

В snapshot закрытого периода обязательно входят:

1. Ставки сотрудников и активные формулы на момент расчёта.
2. Проценты базовой/премиальной части, оценки руководителя, оценки бизнеса, налоговые формулы.
3. Work items периода: автор, задача, дата, длительность, роль сотрудника на момент расчёта.
4. Задачи и их атрибуты: номер, название, проект, система, тип, приоритет, статус, родительские связи, ссылка YouTrack.
5. План периода: назначенные задачи, плановые часы, отладка, тестирование, управление, версия плана.
6. Готовность задач, оценки руководителя и бизнеса.
7. Рассчитанные строки личных отчётов и итогового отчёта.
8. Итоги, статистика выполнения плана и суммы по фильтрам/группировкам.

После закрытия периода UI читает отчёт из snapshot/materialized report tables, а не пересчитывает его из текущих справочников. Переоткрытие периода директором создаёт новую версию snapshot после повторного закрытия.

## 3.4 Materialized report tables v2

Тяжёлые отчёты не должны строиться на лету из сырых задач и work items при каждом открытии страницы. После загрузки факта и после изменения оценок система асинхронно пересчитывает:

1. `personal_reports` и `personal_report_lines`.
2. `period_summary_reports` и `period_summary_report_lines`.
3. Агрегаты статистики по периоду.

API отчётов читает подготовленные строки и применяет серверные фильтры, сортировку и пагинацию. Для больших таблиц frontend использует virtual scrolling.

## 3.5 Transactional Outbox v2

Для критичных событий запрещено полагаться только на in-memory EventEmitter или Redis Pub/Sub. Use case должен в одной транзакции записать бизнес-изменения и запись в `outbox_events`.

Критичные события:

- `PlanFixed`
- `PlanModified`
- `FactLoaded`
- `ManagerEvaluationSubmitted`
- `BusinessEvaluationSubmitted`
- `ReportsRecalculated`
- `PeriodClosed`
- `PeriodReopened`
- `RateChanged`
- `FormulaChanged`

Outbox worker обрабатывает события идемпотентно, с retry policy и логированием ошибок. Повторная обработка одного события не должна приводить к повторному начислению денег, дублированию уведомлений без deduplication key или повторной выгрузке в YouTrack без проверки состояния.

## 3.6 Индексы и производительность БД v2

Обязательные индексы для производительности:

- `work_items(period_id, author_id)`
- `work_items(issue_id)`
- `youtrack_issues(issue_number)`
- `youtrack_issues(project_name)`
- `youtrack_issues(system_name)`
- `planned_tasks(sprint_plan_id, assignee_id)`
- `manager_evaluations(period_id, user_id)`
- `business_evaluations(period_id, youtrack_issue_id)`
- `personal_report_lines(personal_report_id)`
- `period_summary_report_lines(period_id, system_name)`
- `period_summary_report_lines(period_id, project_name)`
- `period_summary_report_lines(period_id, is_planned)`

Для строковых фильтров по названию задачи допускается PostgreSQL full-text search или trigram index.

## 3.7 Правила физического удаления пользователей v2

Администратор может выполнить физическое удаление пользователя только если у пользователя нет связанных ставок, work items, плановых задач, оценок, личных отчётов и закрытых snapshot. Если связанные данные есть, выполняется только мягкое удаление: `isActive=false`, `deletedAt`, статус `Удалён вручную`.

Закрытые отчёты должны хранить snapshot ФИО, логина, роли, руководителя и ставки сотрудника, чтобы история не зависела от текущей карточки пользователя.

---

## 4. Интеграция с YouTrack

**Привязка к ТЗ:** Раздел 6, 25

### 4.1 API-эндпоинты YouTrack

| Эндпоинт | Назначение | Параметры | ТЗ |
|---|---|---|---|
| `GET /api/issues?fields=...` | Получение задач | `search`, `$top`, `$skip`, `fields` | 6.4 |
| `GET /api/issues/{id}?fields=...` | Детали задачи | `fields` | 6.3 |
| `GET /api/admin/projects?fields=...` | Проекты и их custom fields | `fields` | 25 |
| `GET /api/admin/projects/{id}/customFields/{fieldId}` | Значения enum-полей | `fields` | 25 |
| `GET /api/users?fields=...` | Пользователи | `fields` | 7.1 |
| `GET /api/agiles?fields=...` | Доски и спринты | `fields` | 25 |
| `GET /api/agiles/{id}/sprints` | Спринты доски | `fields` | 25 |
| `GET /api/issues/{id}/timeTracking` | Work items задачи | `fields` | 6.3 |
| `POST /api/issues/{id}/fields` | Обновление полей задачи | — | 6.5 |
| `POST /api/issues/{id}/sprints` | Привязка к спринту | — | 6.5 |

### 4.2 Формат запросов/ответов

**Пример запроса получения задачи:**

```
GET /api/issues/CLOUD-123?fields=idReadable,summary,customFields(id,name,value($type,name,login,minutes,presentation)),reporter(login,fullName),assignee(login,fullName),parent( idReadable,summary ),project(name),links(linkType(name),issues(idReadable,summary))
```

**Пример ответа YouTrack (сокращён):**

```json
{
  "id": "2-123",
  "idReadable": "CLOUD-123",
  "summary": "Реализовать логин через SSO",
  "project": { "name": "Cloud" },
  "reporter": { "login": "ivanov", "fullName": "Иван Иванов" },
  "assignee": [{ "login": "petrov", "fullName": "Пётр Петров" }],
  "customFields": [
    {
      "id": "cf-1",
      "name": "Система",
      "value": { "$type": "SingleEnumIssueCustomField", "name": "Аутентификация" }
    },
    {
      "id": "cf-2",
      "name": "Priority",
      "value": { "$type": "SingleEnumIssueCustomField", "name": "High" }
    },
    {
      "id": "cf-3",
      "name": "Оценка",
      "value": { "$type": "PeriodProjectCustomField", "minutes": 600, "presentation": "10ч" }
    },
    {
      "id": "cf-4",
      "name": "Затраченное время",
      "value": { "$type": "PeriodProjectCustomField", "minutes": 480, "presentation": "8ч" }
    }
  ],
  "parent": { "idReadable": "CLOUD-100", "summary": "SSO Module" },
  "links": [
    {
      "linkType": { "name": "Parent for" },
      "issues": [{ "idReadable": "CLOUD-124", "summary": "UI Login" }]
    }
  ]
}
```

### 4.3 Маппинг полей (СПО ↔ YouTrack)

| Поле СПО | YouTrack поле/путь | Конвертация |
|---|---|---|
| `issueNumber` | `idReadable` | прямое |
| `summary` | `summary` | прямое |
| `projectName` | `project.name` | прямое |
| `systemName` | custom field `Система` → `value.name` | прямое |
| `sprintName` | custom field `Спринт` → `value.name` | прямое |
| `typeName` | custom field `Type` → `value.name` | прямое |
| `priorityName` | custom field `Priority` → `value.name` | **английские**: Blocker, High, Medium, Low |
| `stateName` | `state.name` (или custom field `State`) | прямое |
| `isResolved` | `resolved` | `true` если задача решена |
| `reporterId` | `reporter.login` | маппинг на `User.youtrackLogin` |
| `assigneeId` | `assignee[0].login` | первый исполнитель из Multi-user |
| `estimationMinutes` | custom field `Оценка` → `value.minutes` | `minutes` → `hours`: `minutes / 60` |
| `actualMinutes` | custom field `Затраченное время` → `value.minutes` | `minutes` → `hours`: `minutes / 60` |
| `parentIssueId` | `parent.idReadable` | поиск по `YouTrackIssue.issueNumber` |

### 4.4 Стратегия кэширования

| Данные | TTL кэша (Redis) | Инвалидация |
|---|---|---|
| Пользователи YouTrack | 1 час | При ручной синхронизации пользователей |
| Проекты и custom fields | 24 часа | При изменении настроек интеграции |
| Спринты (Agile) | 1 час | При запуске синхронизации |
| Статусы (State bundle) | 24 часа | При изменении маппинга |
| Задачи (issues) | Не кэшируются | — |
| Work items | Не кэшируются | — |

### 4.5 Стратегия Retry и Pagination

**Retry policy:**

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  backoff: { type: 'exponential', delay: 2000 },  // 2s, 4s, 8s
  timeout: 30000,                                    // 30s per request
};

// Идемпотентность: upsert по youtrackId / youtrackWorkItemId
```

**Pagination:**

- Использовать `$top` (batchSize) и `$skip` для пагинации YouTrack API.
- Параллельная загрузка: до 3 параллельных запросов (Semaphore).
- При ошибке пагинации — retry для конкретной страницы.

**Алгоритм синхронизации:**

```
1. GET issues (незавершённые + из плана + с work items)
2. Для каждой задачи:
   a. Upsert YouTrackIssue (по youtrackId)
   b. Загрузить work items за период
   c. Upsert WorkItem (по youtrackWorkItemId)
3. Построить иерархию (parentIssueId → childIssues)
4. Завершить: обновить SyncRun (status, counts, duration)
```

---

## 5. Workflow периода (Стейт-машина)

**Привязка к ТЗ:** Раздел 17

### 5.1 Состояния (enum)

```typescript
enum PeriodState {
  PLANNING            = 'PLANNING',
  PLAN_FIXED          = 'PLAN_FIXED',
  MONTH_IN_WORK       = 'MONTH_IN_WORK',
  FACT_LOADED         = 'FACT_LOADED',
  MANAGER_EVALUATION  = 'MANAGER_EVALUATION',
  BUSINESS_EVALUATION = 'BUSINESS_EVALUATION',
  DIRECTOR_REVIEW     = 'DIRECTOR_REVIEW',
  PERIOD_CLOSED       = 'PERIOD_CLOSED',
  PERIOD_REOPENED     = 'PERIOD_REOPENED',
}
```

### 5.2 Диаграмма переходов

```
PLANNING ──[FIX_PLAN]──→ PLAN_FIXED ──[START_MONTH]──→ MONTH_IN_WORK
MONTH_IN_WORK ──[LOAD_FACT]──→ FACT_LOADED
FACT_LOADED ──[MANAGER_DONE]──→ MANAGER_EVALUATION
MANAGER_EVALUATION ──[BUSINESS_DONE]──→ BUSINESS_EVALUATION
BUSINESS_EVALUATION ──[DIRECTOR_REVIEW]──→ DIRECTOR_REVIEW
DIRECTOR_REVIEW ──[CLOSE_PERIOD]──→ PERIOD_CLOSED (TERMINAL)
PERIOD_CLOSED ──[REOPEN(targetState)]──→ PERIOD_REOPENED
PERIOD_REOPENED ──[RETURN_TO_STATE]──→ (FACT_LOADED | MANAGER_EVALUATION | DIRECTOR_REVIEW)
PERIOD_REOPENED ──[CLOSE_PERIOD]──→ PERIOD_CLOSED
```

### 5.3 Таблица переходов

| # | From → To | Trigger | Роль | Валидации | Событие |
|---|---|---|---|---|---|
| 1 | `PLANNING` → `PLAN_FIXED` | `FIX_PLAN` | Менеджер, Директор | 1. План не пустой (≥1 задача); 2. Все задачи имеют assignee; 3. Нет перегрузок > 100% | `PlanFixed` |
| 2 | `PLAN_FIXED` → `MONTH_IN_WORK` | `START_MONTH` | Система (cron) / Директор | 1. Наступил месяц периода; 2. План зафиксирован | — |
| 3 | `MONTH_IN_WORK` → `FACT_LOADED` | `LOAD_FACT` | Система (cron) / Директор | 1. Work items загружены; 2. Месяц завершён или принудительно | `FactLoaded` |
| 4 | `FACT_LOADED` → `MANAGER_EVALUATION` | `MANAGER_DONE` | Система / Директор | — | — |
| 5 | `MANAGER_EVALUATION` → `BUSINESS_EVALUATION` | `BUSINESS_DONE` | Система / Директор | 1. Все руководители выставили оценки по всем задачам подчинённых | `ManagerEvaluationSubmitted` |
| 6 | `BUSINESS_EVALUATION` → `DIRECTOR_REVIEW` | `DIRECTOR_REVIEW` | Система / Директор | 1. Все оценки бизнеса проставлены | `BusinessEvaluationSubmitted` |
| 7 | `DIRECTOR_REVIEW` → `PERIOD_CLOSED` | `CLOSE_PERIOD` | Директор | 1. Директор подтвердил закрытие | `PeriodClosed` |
| 8 | `PERIOD_CLOSED` → `PERIOD_REOPENED` | `REOPEN(reason, targetState)` | Директор | 1. Причина указана; 2. targetState — один из: `FACT_LOADED`, `MANAGER_EVALUATION`, `DIRECTOR_REVIEW` | `PeriodReopened` |
| 9 | `PERIOD_REOPENED` → (targetState) | `RETURN_TO_STATE` | Система | 1. targetState из шага 8 | — |
| 10 | `PERIOD_REOPENED` → `PERIOD_CLOSED` | `CLOSE_PERIOD` | Директор | 1. Все корректировки завершены | `PeriodClosed` |

### 5.4 Бизнес-правила для каждого перехода

```typescript
// domain/workflow/period-workflow.ts
const WORKFLOW_TRANSITIONS: Record<string, TransitionDefinition> = {
  FIX_PLAN: {
    from: ['PLANNING'],
    to: 'PLAN_FIXED',
    allowedRoles: ['Менеджер', 'Директор'],
    validate: async (period: ReportingPeriod, services: DomainServices) => {
      // 1. План не пустой
      const plan = await services.planRepo.findByPeriodId(period.id);
      if (plan.plannedTasks.length === 0) throw new DomainError('PLAN_EMPTY');
      // 2. Все задачи имеют assignee
      const unassigned = plan.plannedTasks.filter(t => !t.assigneeId);
      if (unassigned.length > 0) throw new DomainError('UNASSIGNED_TASKS');
      // 3. Нет перегрузок
      for (const task of plan.plannedTasks) {
        const capacity = await services.capacity.calculate(period, task.assigneeId!);
        if (capacity.totalPlannedHours > capacity.availableHours) {
          throw new DomainError('OVERLOAD_DETECTED');
        }
      }
    },
    onSuccess: async (period, services) => {
      await services.eventBus.emit(new PlanFixedEvent(period.id, { ... }));
      await services.syncQueue.add('export-plan', { periodId: period.id });
    },
  },
  // ... остальные переходы
};
```

---

## 6. RBAC Matrix

**Привязка к ТЗ:** Раздел 5

### 6.1 Роли

| Роль | Описание |
|---|---|
| `Пользователь` | Базовый доступ: личный отчёт, свои ставки |
| `Руководитель` | Всё что пользователь + отчёты подчинённых + оценка руководителя |
| `Менеджер` | Всё что руководитель + управление планом + ставки сотрудников |
| `Директор` | Полный доступ: все отчёты, ставки, формулы, закрытие/переоткрытие периодов |
| `Бизнес` | Итоговый отчёт + оценка бизнеса |
| `Бухгалтер` | Финансовые/налоговые формулы, без доступа к операционным данным |
| `Администратор` | Управление системой: пользователи, роли, настройки интеграции, без доступа к финансам |

### 6.2 Матрица: Роли × Ресурсы × Права

**Легенда:** `C` — Create, `R` — Read, `U` — Update, `D` — Delete, `—` — нет доступа.
**Доступ к своим данным** обозначен `R(self)`, к подчинённым — `R(sub)`.

| Ресурс | Пользователь | Руководитель | Менеджер | Директор | Бизнес | Бухгалтер | Администратор |
|---|---|---|---|---|---|---|---|
| **Периоды** | — | — | CRUD | CRUD | — | — | R |
| **План (до фиксации)** | — | — | CRUD | CRUD | — | — | — |
| **Фиксация плана** | — | — | U | U | — | — | — |
| **Бэклог (задачи)** | — | R | R | R | R | — | — |
| **Итоговый отчёт периода** | — | R | R | R | R | — | — |
| **Личный отчёт (свой)** | R | R | R | R | — | — | — |
| **Личный отчёт (чужой)** | — | R(sub) | R | R | — | — | — |
| **Ставки сотрудников** | R(self) | R(sub) | CRUD | CRUD | — | — | — |
| **Оценка руководителя** | — | CRUD(sub) | — | CRUD | — | — | — |
| **Оценка бизнеса** | — | — | — | CRUD | CRUD | — | — |
| **% готовности задачи** | — | — | U | U | — | — | — |
| **Формулы расчёта (финансы)** | — | — | — | CRUD | — | CRUD | — |
| **Проценты планирования** | — | — | — | CRUD | — | — | CRUD |
| **Пользователи / Роли** | — | — | — | — | — | — | CRUD |
| **Настройки интеграции** | — | — | — | — | — | — | CRUD |
| **Маппинг полей** | — | — | — | — | — | — | CRUD |
| **Шаблоны уведомлений** | — | — | — | — | — | — | CRUD |
| **Журнал аудита** | — | — | — | R | — | — | R |
| **Журнал синхронизации** | — | — | R | R | — | — | R |
| **Закрытие периода** | — | — | — | U | — | — | — |
| **Переоткрытие периода** | — | — | — | U | — | — | — |
| **Экспорт отчётов** | R(self) | R | R | R | R | R | — |

### 6.3 Доступ к экранам

| Экран | Пользователь | Руководитель | Менеджер | Директор | Бизнес | Бухгалтер | Администратор |
|---|---|---|---|---|---|---|---|
| Dashboard | + | + | + | + | + | + | + |
| Планирование | — | — | + | + | — | — | — |
| Итоговый отчёт | — | + | + | + | + | — | — |
| Личный кабинет | + | + | + | + | — | — | — |
| Оценки руководителя | — | + | — | + | — | — | — |
| Оценки бизнеса | — | — | — | + | + | — | — |
| Финансовые отчёты | R(self) | R(sub) | R | R | — | R(налоговые) | — |
| Администрирование | — | — | — | — | — | — | + |
| Настройки планирования | — | — | — | + | — | — | + |
| Настройки финансов | — | — | — | + | — | + | — |
| Настройки уведомлений | — | — | — | — | — | — | + |
| Управление периодами | — | — | + | + | — | — | + |

---

## 7. Формулы расчёта

**Привязка к ТЗ:** Разделы 9.3, 9.6, 12.3, 12.6, 13, 14, 15

### 7.1 Доступная мощность сотрудника

```text
Доступные часы = Рабочие часы месяца × (1 - Резерв на внеплановые задачи)
```

**Пример:**
```
workHoursPerMonth = 168
reservePercent = 0.3 (30%)
Доступные часы = 168 × (1 - 0.3) = 117.6
```

**Загрузка сотрудника (%):**
```text
Загрузка (%) = Сумма плановых часов сотрудника / Доступные часы × 100%
```

**Цветовая зона:**
```
GREEN  = loadPercent <= yellowThreshold  (≤ 80%)
YELLOW = yellowThreshold < loadPercent <= redThreshold  (80% < x ≤ 100%)
RED    = loadPercent > redThreshold  (> 100%)
```

### 7.2 Часы при планировании задачи

**Для разработчика:**
```text
Часы разработчика = Оценка задачи (часы) + Часы отладки
Часы отладки = Оценка задачи (часы) × % отладки
```

**Для тестирования (отдельный столбец):**
```text
Часы тестирования = Оценка задачи (часы) × % тестирования
```

**Для управления (отдельный столбец):**
```text
Часы управления = Оценка задачи (часы) × % управления
```

**Пример:**
```
Оценка задачи = 10 часов
debugPercent = 0.3 (30%)
testPercent = 0.2 (20%)
mgmtPercent = 0.1 (10%)

Часы разработчика = 10 + (10 × 0.3) = 13 часов
Часы тестирования = 10 × 0.2 = 2 часа
Часы управления = 10 × 0.1 = 1 час
```

### 7.3 Оставшиеся часы

```text
Осталось часов = Плановая оценка (часы) - Фактически потрачено (часы)
```

**Правила:**
- Если `Осталось часов < 0`:
  - Значение подсвечивается (красный)
  - В строке задачи отображается отрицательное отклонение
  - В итоговых суммах отрицательные часы учитываются как **0**

### 7.4 Сумма на руки по задаче

**Базовая часть:**
```text
Сумма базовая = Часы × Базовая часовая ставка × Базовый процент
```

**Премия от руководителя:**
```text
Сумма от руководителя = Часы × Базовая часовая ставка × Процент оценки руководителя
```

**Премия от бизнеса:**
```text
Сумма от бизнеса = Часы × Базовая часовая ставка × Процент оценки бизнеса
```

**Итого:**
```text
Итого на руки = Сумма базовая + Сумма от руководителя + Сумма от бизнеса
```

**Пример (стандартный):**
```
Часы = 10
Базовая часовая ставка = 1000 руб/час
Базовый процент = 70%
Оценка руководителя = Хорошо = 20%
Оценка бизнеса = Прямая выгода = 10%

Сумма базовая = 10 × 1000 × 0.7 = 7000 руб
Сумма от руководителя = 10 × 1000 × 0.2 = 2000 руб
Сумма от бизнеса = 10 × 1000 × 0.1 = 1000 руб
Итого на руки = 7000 + 2000 + 1000 = 10000 руб
```

**Пример (максимальные оценки):**
```
Базовый процент = 70%
Оценка руководителя = Отлично = 30%
Оценка бизнеса = Польза очевидна = 20%

Сумма базовая = 10 × 1000 × 0.7 = 7000 руб
Сумма от руководителя = 10 × 1000 × 0.3 = 3000 руб
Сумма от бизнеса = 10 × 1000 × 0.2 = 2000 руб
Итого на руки = 7000 + 3000 + 2000 = 12000 руб  // +20% премия
```

**Правила:**
- Если оценки не проставлены → соответствующие суммы = 0
- Никаких значений по умолчанию для расчёта сумм (только для отображения)

## 7.5 Налоги и начисления

```text
НДФЛ = Итого на руки × Ставка НДФЛ (по умолчанию 13%)
Страховые взносы = Итого на руки × Ставка страховых взносов (по умолчанию 30%)
Резерв отпускных = Итого на руки × Ставка резерва отпускных (по умолчанию 8%)
Итого с налогами = Итого на руки + НДФЛ + Страховые взносы + Резерв отпускных
```

### 7.6 Базовая часовая ставка

```text
Годовой доход на руки = ЗП на руки в месяц × 12
Базовая часовая ставка = Годовой доход на руки / Количество рабочих часов в году
```

**Пример:**
```
ЗП на руки в месяц = 150000 руб
Рабочих часов в году = 1976 (247 дней × 8 часов)

Годовой доход на руки = 150000 × 12 = 1800000 руб
Базовая часовая ставка = 1800000 / 1976 = 910.93 руб/час
```

### 7.7 Эффективная ставка

```text
Эффективная ставка = Итого на руки по задаче / Часы по задаче
```

**Пример:**
```
Итого на руки по задаче = 10000 руб
Часы по задаче = 10
Эффективная ставка = 10000 / 10 = 1000 руб/час
```

### 7.8 Себестоимость

**Фактическая себестоимость задачи:**
```text
Фактическая себестоимость = Σ(Эффективная ставка_сотрудника × Фактические часы_сотрудника) + Налоги
```
где Σ — суммирование по всем сотрудникам, работавшим по задаче.

**Плановая себестоимость задачи:**
```text
Плановая эффективная ставка = Базовая часовая ставка × (Базовый процент + %_руководитель_умолч + %_бизнес_умолч)
Плановая себестоимость = Плановая эффективная ставка × Плановые часы
```
где оценки по умолчанию:
- Бизнес: `Прямая выгода` = 10%
- Руководитель: `Хорошо` = 20%

**Оставшиеся затраты:**
```text
Оставшиеся затраты = Положительные оставшиеся часы × Плановая эффективная ставка
```
где если оставшиеся часы отрицательные → учитываются как 0.

### 7.9 Статистика выполнения плана

```text
Плановые часы = Σ(плановые часы по всем задачам, прошедшим фильтр)
Фактические часы = Σ(фактические часы по всем задачам, прошедшим фильтр)
Отклонение часов = Фактические часы - Плановые часы
% выполнения плана = (Фактические часы / Плановые часы) × 100%
Часы вне плана = Σ(фактические часы по незапланированным задачам в фильтре)
% внеплановой нагрузки = (Внеплановые часы / Все фактические часы) × 100%
Оставшиеся часы = Σ(положительных значений остатка часов)
Незавершённые плановые задачи = Количество плановых задач со статусом isResolved = false
```

---

## 8. Уведомления

**Привязка к ТЗ:** Раздел 20

### 8.1 Типы уведомлений (шаблоны)

| Событие | Триггер | Получатели | Шаблон subject |
|---|---|---|---|
| `sync.failed` | BullMQ sync-queue ошибка | Администратор | `⚠️ Ошибка синхронизации YouTrack: {{errorCount}} ошибок` |
| `plan.fixed` | `PlanFixedEvent` | Директор, Менеджеры, Руководители | `✅ План на {{periodName}} зафиксирован` |
| `fact.loaded` | `FactLoadedEvent` | Директор, Менеджеры, Руководители | `📊 Факт загружен: {{periodName}}` |
| `evaluation.manager.required` | Период в `MANAGER_EVALUATION` | Руководители (у кого есть подчинённые с незаполненными оценками) | `✏️ Требуется выставить оценки руководителя: {{periodName}}` |
| `evaluation.business.required` | Период в `BUSINESS_EVALUATION` | Бизнес (у кого есть незаполненные оценки) | `✏️ Требуется выставить оценки бизнеса: {{periodName}}` |
| `period.ready.to.close` | Период в `DIRECTOR_REVIEW` | Директор | `🔔 Период {{periodName}} готов к закрытию` |
| `period.closed` | `PeriodClosedEvent` | Все заинтересованные роли | `🔒 Период {{periodName}} закрыт` |
| `report.personal.ready` | `FactLoadedEvent` | Сотрудники (у кого есть задачи) | `📄 Личный отчёт за {{periodName}} доступен` |
| `period.reopened` | `PeriodReopenedEvent` | Директор, Администратор | `🔓 Период {{periodName}} переоткрыт: {{reason}}` |

### 8.2 Шаблоны по умолчанию

```json
{
  "plan.fixed": {
    "subject": "✅ План на {{periodName}} зафиксирован",
    "body": "<h1>План на {{periodName}} зафиксирован</h1><p>Всего задач: {{taskCount}}<br>Всего часов: {{totalHours}}<br>Зафиксировал: {{fixedBy}}</p>"
  },
  "period.closed": {
    "subject": "🔒 Период {{periodName}} закрыт",
    "body": "<h1>Период {{periodName}} закрыт</h1><p>Дата закрытия: {{closedAt}}<br>Всего часов по плану: {{plannedHours}}<br>Фактически отработано: {{actualHours}}<br>% выполнения: {{completionPercent}}%</p>"
  }
}
```

### 8.3 Настройки уведомлений

```json
{
  "plan.fixed": { "enabled": true, "roleIds": ["role-manager", "role-director"], "ccEmails": [] },
  "sync.failed": { "enabled": true, "emails": ["admin@company.local"], "reminderInterval": "0 */1 * * *" }
}
```

---

## 9. Экспорт

**Привязка к ТЗ:** Раздел 21

### 9.1 Форматы

| Формат | Библиотека | MIME-тип |
|---|---|---|
| Excel (.xlsx) | ExcelJS / SheetJS | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PDF | Puppeteer / PDFKit | `application/pdf` |

### 9.2 Спецификация отчётов

**Итоговый отчёт периода (Excel):**
- Лист 1: "Итоговый отчёт" — полные данные (таблица с фильтрами)
- Лист 2: "Статистика" — сводные показатели
- Колонки: все поля из раздела 12.2 ТЗ
- Группировка: по Системе с подведением промежуточных итогов

**Личный отчёт сотрудника (Excel, PDF):**
- Заголовок: ФИО, период, дата формирования
- Таблица: номер задачи, название, статус, часы, суммы (базовая, руководитель, бизнес, итого), налоги, эффективная ставка
- Итоги: суммирующие по каждому числовому столбцу

**Журнал изменений (Excel):**
- Дата/время, пользователь, сущность, старые данные, новые данные, причина

**План спринта (Excel):**
- Задачи, назначенные на сотрудников, с разбивкой по направлениям (разработка, тестирование, управление)

### 9.3 Техническая реализация

```typescript
// infrastructure/export/export.service.ts
export class ExportService {
  async exportSummaryReport(periodId: string, filters: ReportFilters): Promise<Buffer> {
    const data = await this.reportService.getSummaryReport(periodId, filters);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Итоговый отчёт');
    // Формирование колонок, стилей, группировок
    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  async exportPersonalReport(periodId: string, userId: string, format: 'xlsx' | 'pdf'): Promise<Buffer> {
    const data = await this.reportService.getPersonalReport(periodId, userId);
    if (format === 'xlsx') return this.generateExcel(data);
    return this.generatePdf(data);  // генерация PDF через Puppeteer (HTML → PDF)
  }
}
```

---

## 10. CI/CD Pipeline Specification

**Привязка к ТЗ:** Раздел 4.6

### 10.1 Этапы

```
┌─────────┐    ┌───────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐
│   Lint   │ →  │ Typecheck │ →  │   Unit   │ →  │ Integration│ →  │  Build  │ →  │  Deploy  │
│ (ESLint) │    │   (tsc)   │    │  (Vitest)│    │   (Vitest) │    │ (Docker)│    │ (Compose)│
└─────────┘    └───────────┘    └──────────┘    └────────────┘    └─────────┘    └──────────┘
                                                                                     │
                                                                              ┌──────┴──────┐
                                                                              │   Smoke     │
                                                                              │   Tests     │
                                                                              └─────────────┘
```

### 10.2 Инструменты

| Инструмент | Назначение | Версия |
|---|---|---|
| Node.js | Runtime | 20 LTS |
| pnpm | Package manager | 9+ |
| ESLint | Линтер | 8.x |
| Prettier | Форматтер | 3.x |
| TypeScript (tsc) | Проверка типов | 5.x |
| Vitest | Тестирование | 1.x |
| Testcontainers | Интеграционные тесты | 10.x |
| Docker Buildx | Сборка образов | latest |
| Docker Compose | Развёртывание | 2.x |

### 10.3 Правила для коммитов

**Формат коммита (Conventional Commits):**

```
<type>(<module>): <description>

[optional body]
[optional footer]
```

**Типы:**
| Type | Описание |
|---|---|
| `feat` | Новая функциональность |
| `fix` | Исправление ошибки |
| `refactor` | Рефакторинг без изменения поведения |
| `test` | Добавление/изменение тестов |
| `docs` | Документация |
| `chore` | Настройки, CI/CD, зависимости |
| `db` | Миграция БД |

**Примеры:**
```
feat(planning): add period creation endpoint
fix(integration): handle YouTrack pagination correctly
db(admin): add evaluation_scales table
test(finance): add salary calculator unit tests
```

**Правила:**
1. Ветка `main` — защищена, только через PR.
2. Ветка `develop` — рабочая интеграционная ветка.
3. Каждый PR должен проходить CI/CD.
4. `feat` и `fix` коммиты в `develop` → автоматический deploy на staging.
5. `main` → deploy на production.

---

## 11. Тестирование

**Привязка к ТЗ:** Раздел 24

### 11.1 Стратегия

```
                    ┌──────────────┐
                    │   E2E Tests  │  ← Supertest (API)
                   ┌┴──────────────┴┐
                   │ Integration    │  ← Testcontainers (PostgreSQL, Redis)
                  ┌┴────────────────┴┐
                  │   Unit Tests     │  ← Vitest (mocks)
                 ┌┴──────────────────┴┐
                 │    Static Analysis  │  ← ESLint, tsc, Prettier
                 └────────────────────┘
```

### 11.2 Unit-тесты (по модулям)

| Модуль | Что тестировать | Файл теста |
|---|---|---|
| **Domain (общее)** | Все Value Objects (Money, Hours, PeriodState, Percentage, Rate) | `test/unit/domain/value-objects/*.spec.ts` |
| **Domain (общее)** | Domain Events (базовый класс, сериализация) | `test/unit/domain/events/*.spec.ts` |
| **Domain (общее)** | Domain Errors (создание, маппинг) | `test/unit/domain/errors/*.spec.ts` |
| **Planning** | `CapacityCalculator.calculate()` | `test/unit/planning/capacity-calculator.spec.ts` |
| **Planning** | `FixPlanUseCase.execute()` | `test/unit/planning/fix-plan-use-case.spec.ts` |
| **Planning** | `CreatePeriodUseCase.execute()` | `test/unit/planning/create-period-use-case.spec.ts` |
| **Planning** | `AssignTaskUseCase.execute()` | `test/unit/planning/assign-task-use-case.spec.ts` |
| **Planning** | `ColorZoneService.getZone()` | `test/unit/planning/color-zone-service.spec.ts` |
| **Reporting** | `SummaryReportCalculator.calculate()` | `test/unit/reporting/summary-calculator.spec.ts` |
| **Reporting** | `PersonalReportCalculator.calculate()` | `test/unit/reporting/personal-report-calculator.spec.ts` |
| **Reporting** | `ManagerEvaluationUseCase.execute()` | `test/unit/reporting/manager-evaluation-use-case.spec.ts` |
| **Reporting** | `BusinessEvaluationUseCase.execute()` | `test/unit/reporting/business-evaluation-use-case.spec.ts` |
| **Finance** | `SalaryCalculator.calculate()` | `test/unit/finance/salary-calculator.spec.ts` |
| **Finance** | `CostCalculator.calculateActual()` | `test/unit/finance/cost-calculator.spec.ts` |
| **Finance** | `CostCalculator.calculatePlanned()` | `test/unit/finance/cost-calculator.spec.ts` |
| **Finance** | `EffectiveRateCalculator.calculate()` | `test/unit/finance/effective-rate-calculator.spec.ts` |
| **Finance** | `TaxCalculator.calculate()` | `test/unit/finance/tax-calculator.spec.ts` |
| **Finance** | `RateService.createRate()` | `test/unit/finance/rate-service.spec.ts` |
| **Workflow** | `PeriodStateMachine.transition()` | `test/unit/workflow/state-machine.spec.ts` |
| **Workflow** | `TransitionGuard.validate()` (все 10 переходов) | `test/unit/workflow/transition-guard.spec.ts` |
| **Workflow** | `ReopenPeriodUseCase.execute()` | `test/unit/workflow/reopen-period-use-case.spec.ts` |
| **Notifications** | `NotificationService.send()` | `test/unit/notifications/notification-service.spec.ts` |
| **Notifications** | `TemplateRenderer.render()` | `test/unit/notifications/template-renderer.spec.ts` |
| **Integration** | `YouTrackMapper.map()` (все поля маппинга) | `test/unit/integration/youtrack-mapper.spec.ts` |
| **Integration** | `SyncEngine.aggregate()` | `test/unit/integration/sync-engine.spec.ts` |
| **Administration** | `UserService.create()` | `test/unit/admin/user-service.spec.ts` |
| **Administration** | `RoleService.assignRoles()` | `test/unit/admin/role-service.spec.ts` |

### 11.3 Integration-тесты

| Сценарий | Модуль | Описание |
|---|---|---|
| `PrismaUserRepository` создаёт и находит пользователя | Administration | PostgreSQL через Testcontainers |
| `PrismaReportingPeriodRepository` создаёт период | Planning | PostgreSQL |
| `PrismaSprintPlanRepository` фиксирует план | Planning | PostgreSQL |
| `YouTrackApiAdapter` возвращает issues | Integration | WireMock эмуляция YouTrack |
| `YouTrackApiAdapter` обрабатывает 429/503 | Integration | WireMock rate limit |
| `LdapAuthAdapter` валидные/невалидные credentials | Auth | Эмуляция LDAP (ldapjs) |
| `BullQueueAdapter` добавляет и обрабатывает job | Queue | Redis через Testcontainers |
| `EmailAdapter` отправляет email | Notifications | Mailpit / ethereal.email |
| `NotificationQueueAdapter` retry при ошибке | Notifications | Redis |

### 11.4 E2E-тесты (полные сценарии)

**Сценарий 1: Полный lifecycle периода**
```
1. POST /api/auth/login → token
2. POST /api/planning/periods → period
3. GET /api/planning/periods/:id/backlog → tasks
4. PUT /api/planning/periods/:id/tasks/:taskId → assign
5. GET /api/planning/periods/:id/capacity → verify load
6. POST /api/planning/periods/:id/fix-plan → fixed
7. GET /api/workflow/periods/:id/state → PLAN_FIXED
8. POST /api/workflow/periods/:id/transition → MONTH_IN_WORK
9. POST /api/workflow/periods/:id/transition → FACT_LOADED
10. POST /api/reporting/evaluations/manager → manager eval
11. POST /api/reporting/evaluations/business → business eval
12. POST /api/workflow/periods/:id/transition → DIRECTOR_REVIEW
13. POST /api/workflow/periods/:id/transition → PERIOD_CLOSED
14. GET /api/reporting/periods/:id/summary → verify report
15. GET /api/reporting/periods/:id/personal/:userId → verify personal
```

**Сценарий 2: RBAC — отказ доступа**
```
1. POST /api/auth/login (Пользователь) → token
2. POST /api/planning/periods → 403 Forbidden
3. PUT /api/finance/formulas/:id → 403
4. POST /api/workflow/periods/:id/reopen → 403
```

**Сценарий 3: Переоткрытие периода**
```
1. POST /api/workflow/periods/:id/reopen (Директор) → PERIOD_REOPENED
2. POST /api/reporting/evaluations/manager → update eval
3. POST /api/workflow/periods/:id/transition → PERIOD_CLOSED
4. Проверить журнал аудита
```

**Сценарий 4: Экспорт**
```
1. GET /api/reporting/periods/:id/export/excel → 200, Content-Type: xlsx
2. GET /api/reporting/periods/:id/personal/:userId/export/pdf → 200, Content-Type: pdf
```

### 11.5 Требования к покрытию

| Слой | Минимальное покрытие | Критические модули |
|---|---|---|
| Domain Layer | ≥ 95% | Value Objects, Domain Services, Entities |
| Application Layer | ≥ 85% | Use Cases (все модули) |
| Infrastructure Layer | ≥ 70% | Репозитории, Адаптеры (YouTrack, LDAP, Email) |
| Presentation Layer | ≥ 60% | Контроллеры (через E2E) |

**Общее покрытие проекта:** ≥ 80%

**Запрещено:**
- Снижать покрытие ниже лимита без явного approve.
- Игнорировать тесты для критических формул (раздел 7).
- Тестировать через E2E то, что можно протестировать unit-тестом.

---

## 12. Приоритеты реализации (Roadmap)

### 12.1 Зависимости между модулями

```
                    ┌──────────────────────┐
                    │ Administration       │ ← Нет зависимостей (можно первой)
                    │ (Users, Roles, AD)   │
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │ Integration           │ ← Зависит от: Users (для маппинга)
                    │ (YouTrack sync)       │
                    └─────────┬────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼────────┐ ┌───────▼────────┐ ┌────────▼────────┐
│ Planning         │ │ Auth           │ │ Notifications   │
│ (Periods, Plan,  │ │ (LDAP + JWT)   │ │ (Templates,     │
│  Capacity, Fix)  │ │                │ │  Email sending) │
└─────────┬────────┘ └────────────────┘ └────────┬────────┘
          │                                      │
          └───────────────────┬──────────────────┘
                              │
                    ┌─────────▼────────────┐
                    │ Workflow              │
                    │ (State machine)       │
                    └─────────┬────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼────────┐ ┌───────▼────────┐ ┌────────▼────────┐
│ Reporting        │ │ Finance         │ │ Export          │
│ (Summary,        │ │ (Rates,        │ │ (Excel, PDF)    │
│  Personal,       │ │  Formulas,     │ │                 │
│  Evaluations)    │ │  Calculations) │ │                 │
└──────────────────┘ └────────────────┘ └─────────────────┘
```

### 12.2 Очередь 1 (MVP Foundation) — 2-3 недели

| # | Модуль | Ключевые элементы | Зависимости |
|---|---|---|---|
| 1.1 | **Infrastructure** | PostgreSQL + Prisma schema, Redis, Docker Compose | — |
| 1.2 | **Administration** | User CRUD, Role CRUD, UserRole, EmployeeProfile, WorkRole | 1.1 |
| 1.3 | **Auth** | LDAP bind, JWT generation, JwtAuthGuard, RolesGuard | 1.2 |
| 1.4 | **Integration** | YouTrack API adapter, Sync Engine, Field Mapping | 1.1 |
| 1.5 | **Planning** | Period CRUD, Backlog, Capacity calculation, Assign task, Fix plan | 1.2, 1.4 |

**Результат:** Можно создать период, загрузить задачи из YouTrack, распределить по сотрудникам, зафиксировать план.

### 12.3 Очередь 2 (Core Reporting) — 2-3 недели

| # | Модуль | Ключевые элементы | Зависимости |
|---|---|---|---|
| 2.1 | **Workflow** | State machine (все 9 состояний, 10 переходов), Transition validation | 1.5 |
| 2.2 | **Fact Loading** | Work items sync, classification by work role, fact calculation | 1.4, 2.1 |
| 2.3 | **Reporting** | Summary report, Personal report, Grouping, Statistics | 1.5, 2.2 |
| 2.4 | **Evaluations** | Manager evaluation, Business evaluation, Evaluation scales | 2.3 |

**Результат:** Полный цикл периода: создание → план → факт → оценки → закрытие.

### 12.4 Очередь 3 (Finance & Polish) — 2-3 недели

| # | Модуль | Ключевые элементы | Зависимости |
|---|---|---|---|
| 3.1 | **Finance** | Employee rates, Salary calculation, Tax calculation, Cost calculation | 2.3, 2.4 |
| 3.2 | **Notifications** | Email templates, Notification settings, Event handlers | 2.1, 2.4 |
| 3.3 | **Export** | Excel generation, PDF generation, All report formats | 2.3, 3.1 |
| 3.4 | **Frontend** | All screens integration with API | Все |

**Результат:** Полностью функциональная система СПО.

### 12.5 Критерии готовности очереди

**Очередь 1 готова, когда:**
- [ ] Администратор может подключить YouTrack и выполнить синхронизацию
- [ ] В СПО отображаются незавершённые задачи из YouTrack
- [ ] Можно создать период и распределить задачи по сотрудникам
- [ ] Цветовая индикация загрузки работает
- [ ] План фиксируется и выгружается в YouTrack
- [ ] Аутентификация через LDAP работает

**Очередь 2 готова, когда:**
- [ ] Work item'ы загружаются из YouTrack
- [ ] Итоговый отчёт показывает план/факт
- [ ] Статистика выполнения плана корректна
- [ ] Оценки руководителя и бизнеса выставляются
- [ ] Период можно закрыть и переоткрыть

**Очередь 3 готова, когда:**
- [ ] Личный отчёт сотрудника содержит финансовые расчёты
- [ ] Себестоимость рассчитывается корректно
- [ ] Email-уведомления отправляются при событиях
- [ ] Экспорт в Excel/PDF работает
- [ ] Все экраны интерфейса интегрированы

---

*Конец документа. Версия 2.0.*

