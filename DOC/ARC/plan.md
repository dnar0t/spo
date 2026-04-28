# Development Plan

**Project:** Система Планирования и Отчетности (СПО)  
**File:** `plan.md`  
**Version:** 2.0  
**Updated:** 2026-04-27  
**Execution model:** команда ИИ-агентов  
**Timeline:** не используется. Выполнение идёт по чекбоксам и зависимостям.  
**Rule:** после завершения существенного блока обновлять `context.md`.

---

## ✅ Completed

- [x] Сформировано ТЗ СПО v2 (`spo_tz_v2.md`)
- [x] Сформирована архитектура СПО v2 (`architecture_v2.md`)
- [x] Сформирована техническая спецификация СПО v2 (`specification_v2.md`)
- [x] Создан стартовый файл контекста для ИИ-агентов (`context.md`)
- [x] Проведено архитектурное ревью документов
- [x] Зафиксированы ключевые архитектурные решения: modular monolith, Clean Architecture + DDD, Transactional Outbox, immutable snapshots, materialized report tables, RBAC + ABAC, encrypted secrets storage
- [x] Зафиксирован запрет `Float` для денег, ставок, процентов и часов
- [x] Создан первичный план реализации СПО для команды ИИ-агентов
- [x] План приведён к чекбокс-формату: Completed / In Progress / TODO / Blocked / Testing Needed
- [x] Part 6 — Sprint Planning (@Agent-Planning)
- [x] Part 7 — Period Workflow, Fact Loading, Report Recalculation (@Agent-Reporting)
- [x] Part 8 — Finance, Evaluations, Cost Calculation (@Agent-Finance)
- [x] Part 9 — Period Closing, Snapshots, Reopen (@Agent-Planning)
- [x] Part 10 — Notifications and Export (@Agent-Notifications, @Agent-Export)
- [x] Part 11 — Performance, Security, Backup, Operations (@Agent-QA, @Agent-Security, @Agent-DevOps, @Agent-Docs)

---

## 🔄 In Progress

- [ ] Part 12 — Pilot and Stabilization (@Agent-Orchestrator)




---

## 📋 TODO

### ✅ Part 1 — Project Setup and Base Infrastructure

**Note:** Frontend разрабатывается отдельно пользователем. Задачи по frontend скелету исключены.

- [x] Создать структуру monorepo: `packages/backend`, `packages/shared`, `docker` (@Agent-Orchestrator)
- [x] Настроить package manager workspaces (@Agent-Orchestrator)
- [x] Создать NestJS backend skeleton (@Agent-Orchestrator)
- [x] Добавить endpoint `/api/health` (@Agent-Orchestrator)
- [x] Создать shared package для общих типов и enum (@Agent-Orchestrator)
- [x] Настроить ESLint, Prettier, TypeScript config и path aliases (@Agent-Orchestrator)
- [x] Подключить Prisma к PostgreSQL (@Agent-Orchestrator)
- [x] Настроить Docker Compose: backend, PostgreSQL, Redis, nginx placeholder (@Agent-Orchestrator)
- [x] Создать `.env.example` для всех сервисов (@Agent-Orchestrator)
- [x] Создать README с инструкцией локального запуска проекта (@Agent-Orchestrator)
- [x] Обновить `plan.md` по итогам Part 1 (@Agent-Orchestrator)

### ✅ Part 2 — Database, Migrations, System Mechanisms

- [x] Prisma-схема: все модели (users, roles, periods, youtrack issues, plans, finance, snapshots, outbox, audit) (@Agent-Orchestrator)
- [x] Value Objects: Money, Minutes, Percentage, HourlyRate (@Agent-Orchestrator)
- [x] User Entity с бизнес-правилами (@Agent-Orchestrator)
- [x] User Repository interface (@Agent-Orchestrator)
- [x] Prisma User Repository реализация (@Agent-Orchestrator)
- [x] Seed: роли, рабочие роли, admin user, формулы оценок, настройки интеграции, шаблоны уведомлений (@Agent-Orchestrator)
- [x] Prisma client генерация (@Agent-Orchestrator)
- [x] Проект компилируется (`npm run build` — без ошибок) (@Agent-Orchestrator)

### Part 3 — Security, Auth, RBAC/ABAC, Audit

- [x] Реализовать LDAP/LDAPS adapter interface (`ILdapAuthAdapter`) и mock для тестов (@Agent-Security)
- [x] Реализовать login flow: AD bind → user lookup → JWT (@Agent-Security)
- [x] Реализовать refresh token rotation и хранение refresh token hash (@Agent-Security)
- [x] Реализовать logout и revoke sessions (@Agent-Security)
- [x] Добавить rate limit и brute-force protection на `/api/auth/login` (@Agent-Security)
- [x] Реализовать RBAC guards (`JwtAuthGuard`, `RolesGuard` + `@Roles()` декоратор) (@Agent-Security)
- [x] Реализовать ABAC `AccessControlService` (canViewPersonalReport, canEditManagerEvaluation, canEditBusinessEvaluation, canViewFinance, canManageRates, canReopenPeriod, canModifyFixedPlan) (@Agent-Security)
- [x] Реализовать `AuditLogger` (через Prisma в таблицу AuditLog) (@Agent-Security)
- [x] Реализовать encrypted secrets storage (`EncryptionService` AES-256-GCM) и маскинг секретов в API (@Agent-Security)
- [x] Создать frontend login page и route protection (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 3 (@Agent-Orchestrator)

### Part 4 — Administration and Dictionaries

- [x] Реализовать CRUD пользователей (@Agent-Backend-Core)
- [x] Реализовать назначение ролей пользователю (@Agent-Security)
- [x] Реализовать привязку сотрудник → руководитель (@Agent-Backend-Core)
- [x] Реализовать рабочие роли: разработка, тестирование, управление, другое (@Agent-Backend-Core)
- [x] Реализовать ставки сотрудников и историю ставок (@Agent-Finance)
- [x] Реализовать формулы и версии формул (@Agent-Finance)
- [x] Реализовать шкалы оценок бизнеса и руководителя (@Agent-Finance)
- [x] Реализовать planning settings (@Agent-Planning)
- [ ] Реализовать notification settings skeleton (@Agent-Notifications)
- [x] Создать frontend страницы пользователей, ставок, формул и audit log (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 4 (@Agent-Orchestrator)

### ✅ Part 5 — YouTrack and Hub Integration

- [x] YouTrack API base client с pagination, retry, timeout, rate limiting (@Agent-Orchestrator)
- [x] YouTrack API response types (User, Issue, WorkItem, Project, Sprint, FieldMapping) (@Agent-Orchestrator)
- [x] YouTrack Mapper (преобразование API → domain entities) (@Agent-Orchestrator)
- [x] Sync Engine: runFullSync (users → projects → issues → workItems) (@Agent-Orchestrator)
- [x] Sync Engine: syncWorkItemsByPeriod (для загрузки факта периода) (@Agent-Orchestrator)
- [x] YouTrack Controller: GET /api/youtrack/status, POST /api/youtrack/sync, POST /api/youtrack/test-connection (@Agent-Orchestrator)
- [x] YouTrack Controller: GET /api/youtrack/sync-runs, GET /api/youtrack/sync-runs/:id (с логами) (@Agent-Orchestrator)
- [x] YouTrack Controller: GET /api/youtrack/issues (с фильтрацией и пагинацией) (@Agent-Orchestrator)
- [x] YouTrack Controller: GET /api/youtrack/stats (статистика интеграции) (@Agent-Orchestrator)
- [x] YouTrackModule подключён в AppModule (@Agent-Orchestrator)
- [x] `npm run build` — без ошибок (43 файла) (@Agent-Orchestrator)

### Part 6 — Sprint Planning

- [x] Реализовать Period create/update/list/detail (@Agent-Planning)
- [x] Реализовать workflow state `PLANNING` + PeriodState value object со стейт-машиной (@Agent-Planning)
- [x] Реализовать backlog query API с фильтрами (@Agent-Planning)
- [ ] Реализовать перенос readiness из предыдущего месяца (@Agent-Planning)
- [x] Реализовать построение дерева задач (@Agent-Planning)
- [x] Реализовать сортировку backlog по readiness и приоритету (@Agent-Planning)
- [x] Реализовать capacity calculator с резервом и load zones: green/yellow/red (@Agent-Planning)
- [x] Реализовать planned task assignment API с расчётом debug/test/mgmt hours (@Agent-Planning)
- [x] Реализовать фиксацию плана, версию плана и outbox event `PlanFixed` (@Agent-Planning)
- [ ] Реализовать изменение фиксированного плана только директором с audit log (@Agent-Planning)
- [ ] Подключить handler выгрузки плана в YouTrack (@Agent-Integration)
- [x] Создать frontend экран планирования с таблицей, drag-and-drop и индикацией загрузки (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 6 (@Agent-Orchestrator)

### Part 7 — Period Workflow, Fact Loading, Report Recalculation

- [x] Реализовать Period state machine (PeriodState + стейт-машина, @Agent-Planning)
- [x] Реализовать endpoint загрузки факта периода (LoadFactUseCase + SyncEngine, @Agent-Integration)
- [x] Реализовать event `FactLoaded` (@Agent-Integration)
- [x] Реализовать генерацию personal report lines (ReportCalculator + GeneratePersonalReportsUseCase, @Agent-Reporting)
- [x] Реализовать генерацию summary report lines (ReportCalculator + GenerateSummaryReportUseCase, @Agent-Reporting)
- [x] Реализовать признак planned/unplanned (@Agent-Reporting)
- [x] Реализовать remaining hours и подсветку отрицательного остатка (@Agent-Reporting)
- [x] Реализовать статистику выполнения плана (GetPeriodStatisticsUseCase, @Agent-Reporting)
- [x] Реализовать grouping by system/project/business level (ReportCalculator.groupReport, @Agent-Reporting)
- [x] Реализовать server-side filtering/sorting/pagination (GetSummaryReportUseCase, @Agent-Reporting)
- [x] Реализовать workflow controller: state, transition, reopen, history (@Agent-Reporting)
- [x] Реализовать reporting controller: summary, personal, evaluations, recalculate (@Agent-Reporting)
- [x] Реализовать Evaluation entities (ManagerEvaluation, BusinessEvaluation) и use cases (submit, update) (@Agent-Reporting)
- [x] Создать frontend итогового и личного отчёта (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 7 (@Agent-Orchestrator)

### Part 8 — Finance, Evaluations, Cost Calculation

- [x] Реализовать SalaryCalculator domain service (@Agent-Finance)
- [x] Реализовать EffectiveRateCalculator (@Agent-Finance)
- [x] Реализовать TaxCalculator по формулам (@Agent-Finance)
- [x] Реализовать ManagerEvaluation API с ABAC (@Agent-Reporting)
- [x] Реализовать BusinessEvaluation API с business evaluation key (@Agent-Reporting)
- [x] Реализовать пересчёт personal reports при изменении оценок (@Agent-Reporting)
- [x] Реализовать CostCalculator (@Agent-Finance)
- [x] Реализовать planned cost для разработки, тестирования и управления (@Agent-Finance)
- [x] Реализовать remaining cost calculator (@Agent-Finance)
- [x] Реализовать freeze financial inputs for report lines (@Agent-Finance)
- [x] Реализовать frontend оценок руководителя и бизнеса (@Agent-Frontend)
- [x] Реализовать frontend финансовых колонок личного отчёта (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 8 (@Agent-Orchestrator)

### Part 9 — Period Closing, Snapshots, Reopen

- [x] Реализовать close period use case (@Agent-Planning)
- [x] Реализовать snapshot employee rates, formulas и evaluation scales (@Agent-Finance)
- [x] Реализовать snapshot work items, issues и hierarchy (@Agent-Reporting)
- [x] Реализовать snapshot report lines and aggregates (@Agent-Reporting)
- [x] Реализовать read-only guards for closed periods (@Agent-Security)
- [x] Реализовать reopen period by director (@Agent-Planning)
- [x] Реализовать audit для close/reopen (@Agent-Security)
- [x] Реализовать frontend close/reopen flow (@Agent-Frontend)
- [ ] Реализовать regression tests: closed report immutability (@Agent-QA)
- [ ] Обновить `context.md` после завершения Part 9 (@Agent-Orchestrator)

### Part 10 — Notifications and Export

- [ ] Реализовать SMTP settings и encrypted credentials (@Agent-Notifications)
- [ ] Реализовать notification templates, queue и history (@Agent-Notifications)
- [ ] Реализовать события уведомлений по workflow (@Agent-Notifications)
- [ ] Реализовать Excel export plan (@Agent-Export)
- [ ] Реализовать Excel export summary report (@Agent-Export)
- [ ] Реализовать Excel/PDF export personal report (@Agent-Export)
- [ ] Реализовать Excel export audit/change logs (@Agent-Export)
- [ ] Реализовать JSON export for accounting integration (@Agent-Export)
- [ ] Реализовать async export jobs and download links (@Agent-Export)
- [x] Создать frontend notification settings/history и export actions (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 10 (@Agent-Orchestrator)

### Part 11 — Performance, Security, Backup, Operations

- [x] Подготовить performance dataset (@Agent-QA)
- [x] Провести performance tests отчётов (@Agent-QA)
- [x] Оптимизировать индексы и запросы (@Agent-Database)
- [x] Проверить server-side pagination/filtering/sorting (@Agent-QA)
- [x] Провести security review auth/RBAC/ABAC/secrets (@Agent-Security)
- [x] Реализовать backup script и restore procedure (@Agent-DevOps)
- [x] Настроить retention logs/exports/sync logs (@Agent-DevOps)
- [x] Подготовить deployment guide и operational runbook (@Agent-Docs)
- [x] Провести full regression suite (@Agent-QA)
- [x] Обновить `plan.md` после завершения Part 11 (@Agent-Orchestrator)

### Part 12 — Pilot and Stabilization

**Note:** Пилот заблокирован до подключения реального YouTrack, AD/LDAP и SMTP.
Выполнена только подготовительная часть — централизованная обработка ошибок.

- [x] Реализовать Global Exception Filter (@Agent-Orchestrator)
- [x] Реализовать Response Wrapper Interceptor (@Agent-Orchestrator)
- [x] Реализовать Request Logging Interceptor (@Agent-Orchestrator)
- [x] Реализовать Custom Validation Pipe (@Agent-Orchestrator)
- [x] Почистить контроллеры от дублированного handleError и try/catch (@Agent-Orchestrator)
- [ ] Подготовить пилотный набор проектов YouTrack (@Agent-Integration) — 🔴 блокировано
- [ ] Синхронизировать пользователей и задачи (@Agent-Integration) — 🔴 блокировано
- [ ] Создать пилотный период (@Agent-Planning) — 🔴 блокировано
- [ ] Сформировать и зафиксировать план (@Agent-Planning) — 🔴 блокировано
- [ ] Загрузить факт (@Agent-Integration) — 🔴 блокировано
- [ ] Выставить тестовые оценки руководителя и бизнеса (@Agent-Reporting) — 🔴 блокировано
- [ ] Проверить финансовые расчёты вручную на выборке (@Agent-QA) — 🔴 блокировано
- [ ] Закрыть период и проверить immutable snapshots (@Agent-QA) — 🔴 блокировано
- [ ] Проверить все экспорты (@Agent-QA) — 🔴 блокировано
- [ ] Собрать список дефектов и улучшений (@Agent-Orchestrator)
- [ ] Исправить критичные дефекты пилота (@Assigned Agent)
- [ ] Обновить `context.md` по итогам пилота (@Agent-Orchestrator)

---

## 🚫 Blocked

- [ ] Реальное подключение к продуктивному YouTrack заблокировано до получения Base URL, API token, списка проектов, query и field mapping (@Agent-Integration)
- [ ] Реальное подключение к AD/LDAPS заблокировано до получения LDAP host, base DN, bind strategy и тестовой учётной записи (@Agent-Security)
- [ ] Email-уведомления заблокированы до получения SMTP host, port, credentials, sender address и правил отправки (@Agent-Notifications)
- [ ] Финальные налоговые формулы заблокированы до подтверждения значений НДФЛ, страховых взносов и резерва отпускных (@Agent-Finance)
- [ ] Backup retention policy заблокирована до подтверждения требований по срокам хранения резервных копий (@Agent-DevOps)
- [ ] Production deployment заблокирован до выбора сервера, домена, HTTPS-сертификата и политики доступа (@Agent-DevOps)

---

## 🧪 Testing Needed

### Base Infrastructure

- [ ] Проверить `npm install`
- [ ] Проверить `npm run lint`
- [ ] Проверить `npm run typecheck`
- [ ] Проверить `npm run test`
- [ ] Проверить `docker compose up -d`
- [ ] Проверить `/api/health`

### Database

- [ ] Проверить `prisma generate`
- [ ] Проверить `prisma migrate reset`
- [ ] Проверить seed начальных справочников
- [ ] Проверить отсутствие `Float` для денег, часов, ставок и процентов
- [ ] Проверить индексы критичных таблиц

### Security

- [ ] Проверить login flow через mock LDAP
- [ ] Проверить refresh token rotation
- [ ] Проверить logout и revoke sessions
- [ ] Проверить brute-force protection
- [ ] Проверить RBAC guards
- [ ] Проверить ABAC policies
- [ ] Проверить, что секреты не возвращаются через API и не попадают в audit log

### YouTrack Integration

- [ ] Проверить test connection
- [ ] Проверить sync users, dictionaries, issues, hierarchy и work items
- [ ] Проверить reconciliation work items vs spent time
- [ ] Проверить retry/timeout/rate limiting
- [ ] Проверить sync logs
- [ ] Проверить export plan to YouTrack через mock server

### Planning

- [ ] Проверить создание периода
- [ ] Проверить расчёт доступной мощности с резервом
- [ ] Проверить перенос readiness из предыдущего месяца
- [ ] Проверить дерево задач
- [ ] Проверить фильтры backlog
- [ ] Проверить drag-and-drop назначение задач
- [ ] Проверить расчёт отладки, тестирования и управления
- [ ] Проверить load zones
- [ ] Проверить фиксацию плана и права изменения фиксированного плана

### Reporting

- [ ] Проверить загрузку факта
- [ ] Проверить генерацию personal report lines и summary report lines
- [ ] Проверить planned/unplanned признак
- [ ] Проверить remaining hours и отрицательные остатки
- [ ] Проверить статистику выполнения плана
- [ ] Проверить business grouping по уровню История
- [ ] Проверить server-side filtering/sorting/pagination

### Finance

- [ ] Проверить расчёт базовой часовой ставки
- [ ] Проверить default оценку бизнеса: `Прямая выгода — 10%`
- [ ] Проверить default оценку руководителя: `Хорошо — 20%`
- [ ] Проверить расчёт зарплаты, effective rate и налоговых формул
- [ ] Проверить плановую и фактическую себестоимость
- [ ] Проверить пересчёт отчётов после изменения оценок

### Period Closing and Snapshots

- [ ] Проверить close period
- [ ] Проверить snapshot rates, formulas, scales, work items, issues, hierarchy и report lines
- [ ] Проверить immutable closed report
- [ ] Проверить reopen period by director
- [ ] Проверить audit close/reopen

### Notifications and Export

- [ ] Проверить SMTP settings masking
- [ ] Проверить notification templates, queue и history
- [ ] Проверить Excel export plan, summary report и audit logs
- [ ] Проверить Excel/PDF export personal report
- [ ] Проверить JSON export schema

### Production Readiness

- [ ] Проверить performance dataset и performance reports
- [ ] Проверить security review
- [ ] Проверить backup/restore
- [ ] Проверить deployment guide и operational runbook
- [ ] Проверить full regression suite

---

## Notes for AI Agents

- [ ] Перед началом новой сессии читать `context.md`
- [ ] Перед выполнением задачи читать соответствующие разделы `architecture_v2.md` и `specification_v2.md`
- [ ] После завершения существенной задачи обновлять `context.md`
- [ ] Не возвращаться к завершённым частям без дефекта, блокера или архитектурного изменения
- [ ] Не использовать `Float` для финансовых и временных данных
- [ ] Не писать бизнес-логику в controllers
- [ ] Не обращаться к Prisma из controllers
- [ ] Для критичных событий использовать Transactional Outbox
- [ ] Для закрытых периодов использовать immutable snapshots
- [ ] Для отчётов использовать materialized report tables
- [ ] Все права проверять на backend
