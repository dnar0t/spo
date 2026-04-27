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

---

## 🔄 In Progress

- [ ] Part 5 — YouTrack and Hub Integration (@Agent-Integration)

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

- [ ] Реализовать LDAP/LDAPS adapter interface и mock для тестов (@Agent-Security)
- [ ] Реализовать login flow: AD bind → user lookup → JWT (@Agent-Security)
- [ ] Реализовать refresh token rotation и хранение refresh token hash (@Agent-Security)
- [ ] Реализовать logout и revoke sessions (@Agent-Security)
- [ ] Добавить rate limit и brute-force protection на `/api/auth/login` (@Agent-Security)
- [ ] Реализовать RBAC guards (@Agent-Security)
- [ ] Реализовать ABAC `PermissionService` (@Agent-Security)
- [ ] Реализовать `AuditLogger` (@Agent-Security)
- [ ] Реализовать encrypted secrets storage и masking secrets в API responses (@Agent-Security)
- [ ] Создать frontend login page и route protection (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 3 (@Agent-Orchestrator)

### Part 4 — Administration and Dictionaries

- [ ] Реализовать CRUD пользователей (@Agent-Backend-Core)
- [ ] Реализовать назначение ролей пользователю (@Agent-Security)
- [ ] Реализовать привязку сотрудник → руководитель (@Agent-Backend-Core)
- [ ] Реализовать рабочие роли: разработка, тестирование, управление, другое (@Agent-Backend-Core)
- [ ] Реализовать ставки сотрудников и историю ставок (@Agent-Finance)
- [ ] Реализовать формулы и версии формул (@Agent-Finance)
- [ ] Реализовать шкалы оценок бизнеса и руководителя (@Agent-Finance)
- [ ] Реализовать planning settings (@Agent-Planning)
- [ ] Реализовать notification settings skeleton (@Agent-Notifications)
- [ ] Создать frontend страницы пользователей, ставок, формул и audit log (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 4 (@Agent-Orchestrator)

### Part 5 — YouTrack and Hub Integration

- [ ] Реализовать IntegrationSettings API с encrypted token storage (@Agent-Integration)
- [ ] Реализовать test connection endpoint (@Agent-Integration)
- [ ] Реализовать FieldMapping API (@Agent-Integration)
- [ ] Реализовать YouTrack API base client с pagination, retry, timeout, rate limiting (@Agent-Integration)
- [ ] Реализовать sync users from YouTrack/Hub (@Agent-Integration)
- [ ] Реализовать sync dictionaries: projects, systems, types, priorities, states (@Agent-Integration)
- [ ] Реализовать sync issues by query (@Agent-Integration)
- [ ] Реализовать sync issue hierarchy (@Agent-Integration)
- [ ] Реализовать sync work items by period (@Agent-Integration)
- [ ] Реализовать reconciliation actual spent time vs work items sum (@Agent-Integration)
- [ ] Реализовать SyncRun, SyncLogEntry и BullMQ jobs для auto/manual sync (@Agent-Integration)
- [ ] Реализовать outbox events: IssuesUpdated, UsersSynced, SyncCompleted, SyncFailed (@Agent-Integration)
- [ ] Реализовать export plan to YouTrack adapter (@Agent-Integration)
- [ ] Создать frontend страницы интеграции и sync logs (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 5 (@Agent-Orchestrator)

### Part 6 — Sprint Planning

- [ ] Реализовать Period create/update/list/detail (@Agent-Planning)
- [ ] Реализовать workflow state `PLANNING` (@Agent-Planning)
- [ ] Реализовать backlog query API с фильтрами (@Agent-Planning)
- [ ] Реализовать перенос readiness из предыдущего месяца (@Agent-Planning)
- [ ] Реализовать построение дерева задач (@Agent-Planning)
- [ ] Реализовать сортировку backlog по readiness и приоритету (@Agent-Planning)
- [ ] Реализовать capacity calculator с резервом (@Agent-Planning)
- [ ] Реализовать planned task assignment API (@Agent-Planning)
- [ ] Реализовать расчёт debug/test/mgmt hours (@Agent-Planning)
- [ ] Реализовать load zones: green/yellow/red (@Agent-Planning)
- [ ] Реализовать фиксацию плана и версию плана (@Agent-Planning)
- [ ] Реализовать изменение фиксированного плана только директором с audit log (@Agent-Planning)
- [ ] Реализовать outbox event `PlanFixed` (@Agent-Planning)
- [ ] Подключить handler выгрузки плана в YouTrack (@Agent-Integration)
- [ ] Создать frontend экран планирования с таблицей, drag-and-drop и индикацией загрузки (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 6 (@Agent-Orchestrator)

### Part 7 — Period Workflow, Fact Loading, Report Recalculation

- [ ] Реализовать Period state machine (@Agent-Planning)
- [ ] Реализовать endpoint загрузки факта периода (@Agent-Integration)
- [ ] Реализовать event `FactLoaded` (@Agent-Integration)
- [ ] Реализовать `ReportRecalculationJob` (@Agent-Reporting)
- [ ] Реализовать генерацию personal report lines (@Agent-Reporting)
- [ ] Реализовать генерацию summary report lines (@Agent-Reporting)
- [ ] Реализовать признак planned/unplanned (@Agent-Reporting)
- [ ] Реализовать remaining hours и подсветку отрицательного остатка (@Agent-Reporting)
- [ ] Реализовать статистику выполнения плана (@Agent-Reporting)
- [ ] Реализовать grouping by system/project/business level (@Agent-Reporting)
- [ ] Реализовать server-side filtering/sorting/pagination (@Agent-Reporting)
- [ ] Реализовать frontend итогового и личного отчёта (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 7 (@Agent-Orchestrator)

### Part 8 — Finance, Evaluations, Cost Calculation

- [ ] Реализовать SalaryCalculator domain service (@Agent-Finance)
- [ ] Реализовать EffectiveRateCalculator (@Agent-Finance)
- [ ] Реализовать TaxCalculator по формулам (@Agent-Finance)
- [ ] Реализовать ManagerEvaluation API с ABAC (@Agent-Reporting)
- [ ] Реализовать BusinessEvaluation API с business evaluation key (@Agent-Reporting)
- [ ] Реализовать пересчёт personal reports при изменении оценок (@Agent-Reporting)
- [ ] Реализовать CostCalculator (@Agent-Finance)
- [ ] Реализовать planned cost для разработки, тестирования и управления (@Agent-Finance)
- [ ] Реализовать remaining cost calculator (@Agent-Finance)
- [ ] Реализовать freeze financial inputs for report lines (@Agent-Finance)
- [ ] Реализовать frontend оценок руководителя и бизнеса (@Agent-Frontend)
- [ ] Реализовать frontend финансовых колонок личного отчёта (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 8 (@Agent-Orchestrator)

### Part 9 — Period Closing, Snapshots, Reopen

- [ ] Реализовать close period use case (@Agent-Planning)
- [ ] Реализовать snapshot employee rates, formulas и evaluation scales (@Agent-Finance)
- [ ] Реализовать snapshot work items, issues и hierarchy (@Agent-Reporting)
- [ ] Реализовать snapshot report lines and aggregates (@Agent-Reporting)
- [ ] Реализовать read-only guards for closed periods (@Agent-Security)
- [ ] Реализовать reopen period by director (@Agent-Planning)
- [ ] Реализовать audit для close/reopen (@Agent-Security)
- [ ] Реализовать frontend close/reopen flow (@Agent-Frontend)
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
- [ ] Создать frontend notification settings/history и export actions (@Agent-Frontend)
- [ ] Обновить `context.md` после завершения Part 10 (@Agent-Orchestrator)

### Part 11 — Performance, Security, Backup, Operations

- [ ] Подготовить performance dataset (@Agent-QA)
- [ ] Провести performance tests отчётов (@Agent-QA)
- [ ] Оптимизировать индексы и запросы (@Agent-Database)
- [ ] Проверить server-side pagination/filtering/sorting (@Agent-QA)
- [ ] Провести security review auth/RBAC/ABAC/secrets (@Agent-Security)
- [ ] Реализовать backup script и restore procedure (@Agent-DevOps)
- [ ] Настроить retention logs/exports/sync logs (@Agent-DevOps)
- [ ] Подготовить deployment guide и operational runbook (@Agent-Docs)
- [ ] Провести full regression suite (@Agent-QA)
- [ ] Обновить `context.md` после завершения Part 11 (@Agent-Orchestrator)

### Part 12 — Pilot and Stabilization

- [ ] Подготовить пилотный набор проектов YouTrack (@Agent-Integration)
- [ ] Синхронизировать пользователей и задачи (@Agent-Integration)
- [ ] Создать пилотный период (@Agent-Planning)
- [ ] Сформировать и зафиксировать план (@Agent-Planning)
- [ ] Загрузить факт (@Agent-Integration)
- [ ] Выставить тестовые оценки руководителя и бизнеса (@Agent-Reporting)
- [ ] Проверить финансовые расчёты вручную на выборке (@Agent-QA)
- [ ] Закрыть период и проверить immutable snapshots (@Agent-QA)
- [ ] Проверить все экспорты (@Agent-QA)
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
