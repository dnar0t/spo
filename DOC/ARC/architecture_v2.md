# Архитектура СПО (Система Планирования и Отчетности)

> **Версия:** 2.0  
> **Дата:** 2026-04-26  
> **Статус:** Обновлена после архитектурного ревью  

---

## 0. История изменений v2.0

Версия 2.0 доработана по результатам архитектурного ревью. Основные изменения:

1. Зафиксирован архитектурный стиль: модульный монолит, а не микросервисы.
2. Добавлен Transactional Outbox для критичных доменных событий.
3. Добавлена snapshot-архитектура закрытого периода.
4. Добавлена стратегия materialized report tables для производительности отчётов.
5. Уточнены правила хранения денег, ставок, процентов и часов.
6. RBAC дополнен ABAC-политиками доступа.
7. Усилены требования безопасности токенов, LDAP/JWT, логов и аудита.
8. Уточнены правила работы с пользователями, секретами, экспортами и большими таблицами.

---

## 1. Архитектурный стиль и обоснование

### Выбор: Clean Architecture + Domain-Driven Design (DDD)


### Архитектурное решение v2: модульный монолит

СПО реализуется как **модульный монолит**: один backend-процесс, одна PostgreSQL-БД, единая транзакционная модель и чётко разделённые внутренние модули. Система не проектируется как набор микросервисов в первой версии.

Причины:

1. Финансовые расчёты, закрытие периода и snapshot требуют транзакционной согласованности.
2. Масштаб СПО соответствует внутреннему корпоративному порталу, для которого микросервисы создадут лишнюю эксплуатационную сложность.
3. Модульные границы нужны для AI-разработки и поддержки, но физическое разделение сервисов не требуется.
4. При необходимости отдельные модули можно вынести в сервисы позже, сохранив порты и контракты.

Границы модулей являются логическими и enforce-ятся структурой кода, тестами и запретом прямого доступа к чужим репозиториям.


Проект СПО разрабатывается **командой ИИ-агентов**, что накладывает особые требования на архитектуру:

1. **Чёткие границы модулей** — каждый агент работает в своём bounded context, не пересекаясь с другими.
2. **Единый язык (Ubiquitous Language)** — термины из ТЗ (Период, План, Факт, Оценка, Ставка) являются ключевыми понятиями в коде.
3. **Независимость фреймворков** — Domain Layer не зависит от NestJS, Prisma, Redis.
4. **Тестируемость** — бизнес-логика тестируется без поднятия инфраструктуры.

### Почему Clean Architecture + DDD

| Требование | Решение |
|---|---|
| Параллельная разработка агентами | Bounded Contexts с явными контрактами (ports/interfaces) |
| Единый язык TypeScript | Domain-сущности на TypeScript, общие типы |
| Возможность расширения | Новый модуль = новый bounded context + регистрация событий |
| Автотесты | Domain/UseCases тестируются изолированно от инфраструктуры |
| Смена БД/очереди | Адаптеры реализуют порты, ядро не меняется |

### Принципы

- **Dependency Inversion**: внешние слои зависят от внутренних, а не наоборот.
- **Domain Events**: межмодульная коммуникация через события.
- **Transactional Outbox**: критичные события фиксируются в БД в одной транзакции с бизнес-изменениями.
- **Aggregate Roots**: ReportingPeriod как главный агрегат с Invariants (нельзя изменить закрытый период, нельзя зафиксировать план без задач).
- **Value Objects**: Money, Hours, Percentage, Rate — неизменяемые объекты-значения с собственной валидацией.
- **Unit of Work**: все изменения в рамках одного use case фиксируются транзакционно.

---

## 2. Диаграмма слоёв (текстовая)

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  NestJS Controllers │ Guards (RBAC) │ Swagger │ DTOs            │
│  Next.js Pages      │ API Client    │ React   │ TanStack Table  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────┼──────────────────────────────────────┐
│                    APPLICATION LAYER                              │
│  Use Cases / Interactors  │  Ports (interfaces)  │  DTOs        │
│  ┌──────────────────────────────────────────────┐                │
│  │ PlanningUseCases     │ ReportingUseCases     │                │
│  │ FinanceUseCases      │ AdministrationUseCases│                │
│  │ NotificationUseCases │ IntegrationUseCases   │                │
│  └──────────────────────────────────────────────┘                │
│  Event Bus + Transactional Outbox + BullMQ               │
│  BullMQ Task Queues                                              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ вызов через порты
┌───────────────────────────┼──────────────────────────────────────┐
│                     DOMAIN LAYER                                  │
│  Entities │ Value Objects │ Aggregate Roots │ Domain Events      │
│  ┌──────────────────────────────────────────────┐                │
│  │ ReportingPeriod     │ PlannedTask            │                │
│  │ EmployeeProfile     │ YouTrackIssue          │                │
│  │ PersonalReport      │ PeriodSummaryReport    │                │
│  │ BusinessEvaluation  │ ManagerEvaluation      │                │
│  │ FormulaConfig       │ EmployeeRate           │                │
│  │ User                │ Role                   │                │
│  │ SprintPlan          │ SprintPlanVersion      │                │
│  └──────────────────────────────────────────────┘                │
│  Domain Services  │  Repository Interfaces  │  Factories         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ реализация
┌───────────────────────────┼──────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                            │
│  ┌──────────────────────────────────────────────┐                │
│  │ PrismaRepositories     │ YouTrackApiAdapter  │                │
│  │ LdapAuthAdapter        │ BullQueueAdapters   │                │
│  │ RedisAdapter           │ EmailAdapter        │                │
│  │ SyncEngine             │ AuditLogger         │                │
│  │ ExportAdapters         │                     │                │
│  └──────────────────────────────────────────────┘                │
│  Database (PostgreSQL)   │  Redis  │  YouTrack API  │  LDAP/AD   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Domain Layer (Ядро)

**Содержит:**
- **Entity** — сущности с уникальным ID (User, ReportingPeriod, PlannedTask)
- **Value Object** — неизменяемые объекты (Money, Hours, Percentage, Rate, PeriodState)
- **Aggregate Root** — корневые агрегаты (ReportingPeriod, User, SprintPlan)
- **Domain Event** — события предметной области (PeriodClosed, PlanFixed, EvaluationSubmitted)
- **Domain Service** — stateless сервисы с бизнес-логикой (CapacityCalculator, SalaryCalculator, CostCalculator)
- **Repository Interface** — контракты для доступа к данным

**Правила:**
- Нет зависимостей от фреймворков
- Нет импортов из `@nestjs`, `@prisma`, `ioredis`, `bullmq`
- Чистый TypeScript + zod для валидации value objects
- Тестируется без инфраструктуры (моки репозиториев)
- Все entity имеют метод `validate()` для проверки инвариантов

### 2.2 Application Layer (Приложение)

**Содержит:**
- **Use Cases (Interactors)** — оркестрация бизнес-логики
- **Application DTOs** — данные для передачи между слоями
- **Port Interfaces** — контракты, которые реализует Infrastructure
- **Event Handlers** — обработчики доменных событий

**Правила:**
- Зависит только от Domain Layer
- Координирует вызовы между domain-сервисами и инфраструктурой
- Содержит транзакционную логику (Unit of Work)
- Не содержит бизнес-правил — только оркестрация
- Каждый use case — отдельный class с единственным public методом `execute()`

### 2.3 Infrastructure Layer (Инфраструктура)

**Содержит:**
- PrismaRepositories — реализация интерфейсов репозиториев
- YouTrackApiAdapter — HTTP-клиент к YouTrack REST API (Rate limiting, Retry, Pagination)
- LdapAuthAdapter — аутентификация через LDAP/AD
- BullQueueAdapters — фоновые задачи (синхронизация, пересчёт, уведомления)
- RedisAdapter — кэш, очереди, pub/sub
- EmailAdapter — отправка email-уведомлений (SMTP)
- SyncEngine — движок синхронизации с YouTrack
- AuditLogger — журнал аудита (INSERT-only таблица)
- ExportAdapters — экспорт Excel/PDF/CSV/JSON

**Правила:**
- Реализует Ports из Application Layer
- Зависит от Domain и Application слоёв
- Содержит всё, что связано с внешними системами
- Ошибки внешних систем маппятся в доменные ошибки

### 2.4 Presentation Layer (Представление)

**Содержит:**
- NestJS Controllers — REST API endpoints
- Guards — RBAC (ролевой доступ)
- Interceptors — логирование, трансформация ответов
- Pipes — валидация входных данных (Zod/class-validator)
- Filters — обработка исключений (DomainError → HTTP status)
- Swagger/OpenAPI — документация API (декораторы)
- Next.js Pages — клиентские страницы (подключаются к API через fetch/axios)

**Правила:**
- Не содержит бизнес-логики
- Транслирует HTTP-запросы в вызовы Use Cases
- Форматирует ответы (Response DTOs)
- Никакой прямой работы с инфраструктурой (Prisma, Redis) из контроллеров

---

## 3. Модульная структура проекта

```
spo/
├── packages/
│   ├── backend/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── domain/                 # Domain Layer (общий для всех модулей)
│   │   │   │   ├── entities/           # Сущности
│   │   │   │   ├── value-objects/      # Value Objects
│   │   │   │   ├── events/             # Domain Events (базовый класс)
│   │   │   │   ├── services/           # Domain Services
│   │   │   │   ├── repositories/       # Repository Interfaces (порты)
│   │   │   │   └── errors/             # Domain Errors
│   │   │   │
│   │   │   ├── application/            # Application Layer
│   │   │   │   ├── planning/           # Bounded Context: Planning
│   │   │   │   │   ├── use-cases/      # Use Cases / Interactors
│   │   │   │   │   ├── dto/            # Application DTOs
│   │   │   │   │   ├── ports/          # Input/Output ports
│   │   │   │   │   └── handlers/       # Event Handlers
│   │   │   │   ├── reporting/          # Bounded Context: Reporting
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   ├── finance/            # Bounded Context: Finance
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   ├── administration/     # Bounded Context: Administration
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   ├── integration/        # Bounded Context: Integration
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   ├── notifications/      # Bounded Context: Notifications
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   ├── workflow/           # Bounded Context: Workflow
│   │   │   │   │   ├── use-cases/
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── ports/
│   │   │   │   │   └── handlers/
│   │   │   │   └── common/             # Shared DTOs, decorators, utils
│   │   │   │
│   │   │   ├── infrastructure/         # Infrastructure Layer
│   │   │   │   ├── prisma/             # Prisma Client + Repositories
│   │   │   │   │   ├── prisma/         # Prisma Schema + Migrations
│   │   │   │   │   │   └── schema.prisma
│   │   │   │   │   └── repositories/   # Реализации репозиториев
│   │   │   │   ├── youtrack/           # YouTrack API Adapter
│   │   │   │   │   ├── youtrack-api.adapter.ts
│   │   │   │   │   ├── youtrack-mapper.ts
│   │   │   │   │   └── sync-engine.ts
│   │   │   │   ├── auth/               # LDAP Auth Adapter
│   │   │   │   │   ├── ldap-auth.adapter.ts
│   │   │   │   │   └── strategies/
│   │   │   │   ├── queue/              # BullMQ Adapters
│   │   │   │   │   ├── sync-queue.adapter.ts
│   │   │   │   │   ├── report-queue.adapter.ts
│   │   │   │   │   └── notification-queue.adapter.ts
│   │   │   │   ├── redis/              # Redis Adapter (кэш, pub/sub)
│   │   │   │   ├── email/              # Email Adapter (Nodemailer)
│   │   │   │   ├── audit/              # Audit Logger
│   │   │   │   └── export/             # Export Adapters (Excel/PDF/CSV/JSON)
│   │   │   │
│   │   │   ├── presentation/           # Presentation Layer
│   │   │   │   ├── controllers/        # NestJS Controllers
│   │   │   │   │   ├── planning.controller.ts
│   │   │   │   │   ├── reporting.controller.ts
│   │   │   │   │   ├── finance.controller.ts
│   │   │   │   │   ├── admin.controller.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── workflow.controller.ts
│   │   │   │   │   ├── integration.controller.ts
│   │   │   │   │   └── notifications.controller.ts
│   │   │   │   ├── guards/             # RBAC Guards (@Roles decorator)
│   │   │   │   ├── interceptors/       # Logging, Transform
│   │   │   │   ├── pipes/              # Validation Pipes
│   │   │   │   ├── filters/            # Exception Filters
│   │   │   │   └── swagger/            # Swagger Decorators
│   │   │   │
│   │   │   ├── event-bus/              # Event Bus (модуль)
│   │   │   │   ├── event-bus.module.ts
│   │   │   │   ├── event-bus.service.ts
│   │   │   │   └── events/             # Типы событий (event-name → payload schema)
│   │   │   │
│   │   │   ├── config/                 # Config (NestJS ConfigService, env vars)
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── youtrack.config.ts
│   │   │   │   ├── ldap.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── email.config.ts
│   │   │   │
│   │   │   └── common/                 # Shared utilities, helpers
│   │   │
│   │   ├── test/                       # Тесты
│   │   │   ├── unit/                   # Unit Tests (domain + use cases)
│   │   │   ├── integration/            # Integration Tests (adapters)
│   │   │   └── e2e/                    # E2E Tests (API)
│   │   │
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── frontend/                       # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                    # App Router
│   │   │   ├── components/             # React Components (shadcn/ui, TanStack Table, dnd-kit)
│   │   │   ├── lib/                    # API Client (axios), Utilities
│   │   │   ├── hooks/                  # Custom Hooks (usePlanning, useReport, etc.)
│   │   │   └── types/                  # Shared Types (импорт из shared/types)
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── shared/                         # Shared types between frontend & backend
│   │   ├── types/                      # Domain types, enums, interfaces
│   │   ├── constants/                  # Константы (Role enum, PeriodState enum)
│   │   └── utils/                      # Валидаторы, хелперы
│   │
│   └── docker/
│       ├── nginx/                      # Nginx config (reverse proxy)
│       │   └── nginx.conf
│       ├── postgres/                   # PostgreSQL init scripts
│       │   └── init.sql
│       ├── backups/                    # Backup scripts
│       │   └── backup.sh
│       └── docker-compose.yml          # Root docker-compose (объединяет все сервисы)
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── .env.example
├── README.md
├── architecture.md                     # Этот файл
└── package.json                        # Root package.json (workspaces)
```

---

## 4. Модули (Bounded Contexts)

### 4.1 Planning (Планирование)

**Границы модуля:**
- Создание и настройка периода планирования
- Расчёт доступной мощности сотрудников
- Drag-and-drop распределение задач по сотрудникам
- Цветовая индикация загрузки (зелёный/жёлтый/красный)
- Фиксация плана (создание неизменяемой версии)
- Выгрузка плана в YouTrack (sprint assignment, custom fields, tag)
- Версионирование плана (SprintPlanVersion)
- Журнал изменений плана
- Фильтры бэклога (система, проект, приоритет, тип, статус, исполнитель, текст)

**Domain Entities (в контексте Planning):**
- `SprintPlan` (Aggregate Root)
- `SprintPlanVersion` (Immutable snapshot)
- `PlannedTask` (Entity)
- `EmployeeCapacity` (Value Object)
- `PlanSettings` (Value Object — проценты, резерв, пороги)

**Domain Events (испускаемые):**
- `PeriodCreated`
- `PlanFixed`
- `PlanModified`

**API Endpoints (Presentation):**
- `POST /api/planning/periods` — создать период
- `GET /api/planning/periods` — список периодов
- `GET /api/planning/periods/:id` — детали периода
- `PUT /api/planning/periods/:id` — обновить настройки периода
- `POST /api/planning/periods/:id/fix-plan` — зафиксировать план
- `GET /api/planning/periods/:id/plan-versions` — версии плана
- `GET /api/planning/periods/:id/capacity` — расчёт мощности
- `PUT /api/planning/periods/:id/tasks/:taskId` — назначить задачу на сотрудника

**Агенты:** Agent-Planning (1 разработчик)

---

### 4.2 Integration (Интеграция)

**Границы модуля:**
- Подключение к YouTrack API (Base URL, токен, проекты, query)
- Синхронизация задач (issues) — все незавершённые + задачи из плана + задачи с work items
- Маппинг custom fields (Система, Спринт, Type, Priority, State, Оценка, Затраченное время)
- Синхронизация пользователей из YouTrack/Hub
- Загрузка work items (фактических часов) за период
- Синхронизация иерархии задач (Parent/Subtask)
- Передача плана в YouTrack (sprint assignment, custom fields, tags)
- Журнал синхронизации (SyncRun, SyncLogEntry)
- Ручной и автоматический запуск синхронизации (cron через BullMQ)
- Retry policy (количество повторов, таймаут, размер пачки)
- Обработка ошибок API (логирование, уведомление администратора)

**Domain Entities (в контексте Integration):**
- `YouTrackIssue` (Entity)
- `IssueHierarchy` (Value Object)
- `WorkItem` (Entity)
- `IntegrationSettings` (Aggregate Root)
- `SyncRun` (Entity)
- `SyncLogEntry` (Entity)
- `FieldMapping` (Value Object — маппинг полей СПО ↔ YouTrack)

**Domain Events (испускаемые):**
- `SyncStarted`
- `SyncCompleted`
- `SyncFailed`
- `IssuesUpdated`
- `UsersSynced`

**API Endpoints (Presentation):**
- `GET /api/integration/settings` — настройки интеграции
- `PUT /api/integration/settings` — обновить настройки
- `POST /api/integration/sync/run` — запустить синхронизацию вручную
- `GET /api/integration/sync/runs` — история синхронизаций
- `GET /api/integration/sync/runs/:id` — детали синхронизации
- `POST /api/integration/sync/users` — синхронизировать пользователей
- `GET /api/integration/field-mapping` — маппинг полей
- `PUT /api/integration/field-mapping` — обновить маппинг

**Агенты:** Agent-Integration (1 разработчик)

---

### 4.3 Reporting (Отчётность)

**Границы модуля:**
- Итоговый отчёт периода (PeriodSummaryReport) — сводка по всем задачам
- Личный кабинет сотрудника (PersonalReport) — детализация по задачам сотрудника
- Оценки руководителя (ManagerEvaluation) с опциональным комментарием
- Оценки бизнеса (BusinessEvaluation) с опциональным комментарием
- Группировка по Системе, Проекту, Бизнес-уровню (Эпик/Фича/История/Задача)
- Статистика выполнения плана (отклонение, % выполнения, внеплановые часы)
- Экспорт в Excel/PDF/CSV/JSON
- Фильтры и сортировка по всем полям отчёта
- Сохранение пользовательских фильтров

**Domain Entities (в контексте Reporting):**
- `PeriodSummaryReport` (Aggregate Root)
- `PersonalReport` (Aggregate Root)
- `PersonalReportLine` (Entity)
- `ManagerEvaluation` (Entity)
- `BusinessEvaluation` (Entity)
- `ReportFilter` (Value Object)
- `ReportStatistics` (Value Object)

**Domain Events (испускаемые):**
- `ManagerEvaluationSubmitted`
- `BusinessEvaluationSubmitted`
- `ReportExported`

**Domain Events (обрабатываемые):**
- `FactLoaded` → актуализация отчётов
- `PeriodClosed` → заморозка отчётов

**API Endpoints (Presentation):**
- `GET /api/reporting/periods/:id/summary` — итоговый отчёт
- `GET /api/reporting/periods/:id/personal/:userId` — личный отчёт
- `POST /api/reporting/evaluations/manager` — оценка руководителя
- `POST /api/reporting/evaluations/business` — оценка бизнеса
- `PUT /api/reporting/evaluations/:id` — изменить оценку
- `GET /api/reporting/periods/:id/export/excel` — экспорт Excel
- `GET /api/reporting/periods/:id/export/pdf` — экспорт PDF
- `GET /api/reporting/periods/:id/export/json` — экспорт JSON (для бухг. системы)
- `GET /api/reporting/periods/:id/statistics` — статистика выполнения

**Агенты:** Agent-Reporting (1–2 разработчика)

---

### 4.4 Finance (Финансы)

**Границы модуля:**
- Базовая часовая ставка сотрудника (расчёт из месячной ЗП)
- История ставок (EmployeeRateHistory) — версионирование
- Расчёт зарплаты по задаче (сумма на руки = базовая + от руководителя + от бизнеса)
- Расчёт себестоимости (фактическая / плановая / оставшиеся затраты)
- Расчёт эффективной ставки (Итого на руки / Часы)
- Налоговые формулы (НДФЛ, страховые взносы, резерв отпускных)
- Настраиваемые проценты (базовый процент, проценты оценок руководителя/бизнеса)
- Конфигуратор формул (FormulaConfiguration) — безопасный, без произвольного кода
- Версионирование настроек на момент закрытия периода (FormulaConfigurationVersion)

**Domain Entities (в контексте Finance):**
- `EmployeeRate` (Value Object)
- `EmployeeRateHistory` (Entity)
- `FormulaConfiguration` (Aggregate Root)
- `FormulaConfigurationVersion` (Entity — immutable snapshot)

**Domain Services:**
- `SalaryCalculator` — расчёт зарплаты по задаче
- `CostCalculator` — расчёт себестоимости
- `TaxCalculator` — расчёт налогов
- `EffectiveRateCalculator` — расчёт эффективной ставки

**Domain Events (испускаемые):**
- `RateChanged`
- `FormulaUpdated`
- `PeriodFinancialsCalculated`

**API Endpoints (Presentation):**
- `GET /api/finance/rates/:userId` — ставки сотрудника
- `POST /api/finance/rates/:userId` — создать/обновить ставку
- `GET /api/finance/rates/:userId/history` — история ставок
- `GET /api/finance/formulas` — формулы расчёта
- `PUT /api/finance/formulas/:id` — обновить формулу
- `GET /api/finance/formulas/versions` — история версий формул
- `GET /api/finance/periods/:id/calculations` — расчёт периода
- `GET /api/finance/periods/:id/cost` — себестоимость периода

**Агенты:** Agent-Finance (1 разработчик)

---

### 4.5 Administration (Администрирование)

**Границы модуля:**
- Управление пользователями (User CRUD + soft delete)
- Управление ролями (Role, UserRole — множественные роли у пользователя)
- Справочники (WorkRole, Project, System, TaskType, Priority, Status, EvaluationScales)
- Импорт пользователей из YouTrack/Hub (с автоматическим созданием)
- Глобальные настройки системы
- Настройки планирования (проценты тестирования/отладки/управления, пороги, резерв)
- Настройки финансов (доступны Директору и Бухгалтеру)
- Настройки уведомлений
- LDAP/AD настройки (URL, порт, base DN, binding)
- Управление связкой AD-логин ↔ пользователь СПО
- Аудит действий (AuditLog — INSERT-only)
- Резервное копирование (интерфейс управления)

**Domain Entities (в контексте Administration):**
- `User` (Aggregate Root)
- `Role` (Entity)
- `UserRole` (Entity)
- `EmployeeProfile` (Entity)
- `WorkRole` (Entity)
- `SystemSettings` (Aggregate Root)
- `AuditLog` (Entity — append-only)
- `AuditEntry` (Value Object)

**Domain Events (испускаемые):**
- `UserCreated`
- `UserDeactivated`
- `UserRoleChanged`
- `SettingsUpdated`

**API Endpoints (Presentation):**
- `GET /api/admin/users` — список пользователей
- `POST /api/admin/users` — создать пользователя
- `PUT /api/admin/users/:id` — обновить пользователя
- `DELETE /api/admin/users/:id` — мягкое удаление (deactivate)
- `POST /api/admin/users/sync` — синхронизация пользователей с YouTrack
- `GET /api/admin/roles` — список ролей
- `PUT /api/admin/users/:id/roles` — назначить роли
- `GET /api/admin/dictionaries` — справочники
- `PUT /api/admin/settings` — настройки системы
- `GET /api/admin/audit-log` — журнал аудита
- `GET /api/admin/audit-log/:entity/:id` — аудит по конкретной сущности
- `GET /api/admin/backups` — управление бэкапами

**Агенты:** Agent-Administration (1 разработчик)

---

### 4.6 Notifications (Уведомления)

**Границы модуля:**
- Email-уведомления (SMTP, Nodemailer)
- Шаблоны уведомлений (NotificationTemplate) — настраиваемые через админку
- Отправка уведомлений при доменных событиях:
  - `PlanFixed` — уведомить участников планирования
  - `PeriodClosed` — уведомить руководителей / бизнес
  - `SyncFailed` — уведомить администратора
  - `EvaluationRequired` — напоминание о необходимости выставить оценки
- Напоминания (период открыт, необходимо выставить оценки, скоро дедлайн)
- Настройки уведомлений (кто получает, о каких событиях, как часто)
- Очередь отправки (BullMQ — async, retry)
- Журнал отправки (NotificationRun — статусы: sent/failed)

**Domain Entities (в контексте Notifications):**
- `NotificationTemplate` (Entity)
- `NotificationRun` (Entity)
- `NotificationSettings` (Value Object)

**Domain Events (обрабатываемые):**
- `PlanFixed` → уведомить участников
- `PeriodClosed` → уведомить руководителей / бизнес
- `PeriodCreated` → уведомить о начале планирования
- `SyncFailed` → уведомить администратора
- `ManagerEvaluationSubmitted` / `BusinessEvaluationSubmitted` → триггер reminder (если есть ещё не оценённые)

**API Endpoints (Presentation):**
- `GET /api/notifications/templates` — шаблоны
- `PUT /api/notifications/templates/:id` — обновить шаблон
- `GET /api/notifications/settings` — настройки
- `PUT /api/notifications/settings` — обновить настройки
- `GET /api/notifications/history` — история отправок
- `POST /api/notifications/test` — отправить тестовое уведомление

**Агенты:** Agent-Notifications (1 разработчик)

---

### 4.7 Workflow (Стейт-машина периода)

**Границы модуля:**
- Стейт-машина ReportingPeriod (9 состояний)
- Валидация переходов состояний (Guard conditions)
- Фиксация снапшота данных при закрытии периода (все ставки, формулы, план, факт, оценки)
- Переоткрытие периода (только роль Директор, с обязательным указанием причины)
- Журнал изменения состояний (аудит)
- Блокировка пересчёта закрытых периодов
- Версионирование всех данных на момент закрытия

**Состояния (State Machine):**

```
┌──────────────┐
│  PLANNING    │ ◄── Начальное состояние при создании периода
└──────┬───────┘
       │ [PlanFixed] — фиксация плана
       ▼
┌──────────────────┐
│  PLAN_FIXED      │
└──────┬───────────┘
       │ [MonthStarted] — авто-переход по наступлению месяца
       ▼
┌──────────────────┐
│  MONTH_IN_WORK   │
└──────┬───────────┘
       │ [FactLoaded] — загрузка work items из YouTrack
       ▼
┌──────────────────┐
│  FACT_LOADED     │
└──────┬───────────┘
       │ [ManagerEvaluationDone] — руководители выставили оценки
       ▼
┌──────────────────────────┐
│  MANAGER_EVALUATION      │
└──────┬───────────────────┘
       │ [BusinessEvaluationDone] — бизнес выставил оценки
       ▼
┌────────────────────────┐
│  BUSINESS_EVALUATION    │
└──────┬─────────────────┘
       │ [DirectorReviewDone] — директор проверил
       ▼
┌─────────────────────┐
│  DIRECTOR_REVIEW     │
└──────┬──────────────┘
       │ [PeriodConfirmed] — утверждение
       ▼
┌─────────────────────┐          ┌─────────────────────┐
│  PERIOD_CLOSED      │◄────────│  PERIOD_REOPENED    │
│  (Terminal state)   │  Reopen  │                     │
└─────────────────────┘          └──────────┬──────────┘
                                             │ Re-close
                                             ▼
                                      ┌──────────────────┐
                                      │ PERIOD_CLOSED    │
                                      └──────────────────┘
```

**Допустимые переходы (State Transitions):**

| Из | В | Условие | Роль |
|---|---|---|---|
| `PLANNING` | `PLAN_FIXED` | План утверждён, все задачи назначены | Менеджер/Директор |
| `PLAN_FIXED` | `MONTH_IN_WORK` | Наступил месяц периода (авто или вручную) | Система/Админ |
| `MONTH_IN_WORK` | `FACT_LOADED` | Work items загружены из YouTrack | Система |
| `FACT_LOADED` | `MANAGER_EVALUATION` | Факт загружен, можно оценивать | Система |
| `MANAGER_EVALUATION` | `BUSINESS_EVALUATION` | Все руководители выставили оценки | Система/Директор |
| `BUSINESS_EVALUATION` | `DIRECTOR_REVIEW` | Бизнес выставил оценки | Система/Директор |
| `DIRECTOR_REVIEW` | `PERIOD_CLOSED` | Директор подтвердил закрытие | Директор |
| `PERIOD_CLOSED` | `PERIOD_REOPENED` | Требуется корректировка (с причиной) | Директор |
| `PERIOD_REOPENED` | `FACT_LOADED` / `MANAGER_EVALUATION` / `DIRECTOR_REVIEW` | Возврат на нужный этап | Директор |
| `PERIOD_REOPENED` | `PERIOD_CLOSED` | Повторное закрытие после корректировки | Директор |

**Domain Entities:**
- `ReportingPeriod` (Aggregate Root — содержит `state: PeriodState`)
- `PeriodState` (Value Object — enum)
- `PeriodTransition` (Value Object — запись перехода: from, to, reason, timestamp, userId)

**Domain Events (испускаемые):**
- `PeriodStateChanged`
- `PeriodClosed`
- `PeriodReopened`

**Use Cases:**
- `TransitionPeriodUseCase` — выполнить переход с валидацией
- `ReopenPeriodUseCase` — переоткрыть период (только Директор)
- `GetAvailableTransitionsUseCase` — список доступных переходов
- `GetPeriodHistoryUseCase` — история переходов

**API Endpoints (Presentation):**
- `GET /api/workflow/periods/:id/state` — текущее состояние
- `POST /api/workflow/periods/:id/transition` — выполнить переход
- `GET /api/workflow/periods/:id/transitions` — список доступных переходов
- `GET /api/workflow/periods/:id/history` — история переходов
- `POST /api/workflow/periods/:id/reopen` — переоткрыть (только Директор)

**Агенты:** Agent-Workflow (1 разработчик, возможно совмещение с Agent-Planning)

---

## 5. Шина событий (Event Bus)

### Архитектура Event Bus

```
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT BUS                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NestJS EventEmitter2 (синхронные / внутрипроцессные)      │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  Используется для: реакций в рамках одного HTTP-запроса   │  │
│  │  Пример: обновление кэша, аудит, валидация                │  │
│  │  Тип: publish/subscribe (синхронно в том же процессе)     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Redis Pub/Sub (асинхронные / кросс-процессные события)    │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  Используется для: событий между репликами сервиса        │  │
│  │  Пример: при горизонтальном масштабировании backend       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BullMQ Queues (фоновые задачи)                            │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  sync-queue      — синхронизация с YouTrack               │  │
│  │  report-queue    — пересчёт отчётов                       │  │
│  │  notification-queue — отправка email-уведомлений           │  │
│  │  export-queue    — генерация экспортов                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Классификация событий

| Событие | Канал | Источник | Подписчики |
|---|---|---|---|
| `PeriodCreated` | EventEmitter2 | Planning | Workflow, Notifications |
| `PlanFixed` | EventEmitter2 + BullMQ | Planning | Integration (экспорт в YouTrack), Notifications |
| `PlanModified` | EventEmitter2 | Planning | Reporting |
| `SyncStarted` | EventEmitter2 | Integration | Notifications |
| `SyncCompleted` | EventEmitter2 | Integration | Administration, Notifications |
| `SyncFailed` | EventEmitter2 + BullMQ | Integration | Administration (email), Notifications |
| `IssuesUpdated` | EventEmitter2 | Integration | Planning, Reporting |
| `FactLoaded` | EventEmitter2 + BullMQ | Workflow | Reporting (актуализация), Finance (пересчёт) |
| `ManagerEvaluationSubmitted` | EventEmitter2 | Reporting | Finance (пересчёт), Notifications (reminder) |
| `BusinessEvaluationSubmitted` | EventEmitter2 | Reporting | Finance (пересчёт), Notifications (reminder) |
| `PeriodStateChanged` | EventEmitter2 | Workflow | All modules |
| `PeriodClosed` | EventEmitter2 + BullMQ | Workflow | Reporting (заморозка), Finance (фиксация), Notifications, Export |
| `PeriodReopened` | EventEmitter2 + BullMQ | Workflow | Reporting (разморозка), Finance |
| `RateChanged` | EventEmitter2 | Finance | Reporting |
| `FormulaUpdated` | EventEmitter2 | Finance | Reporting |
| `UserCreated` | EventEmitter2 | Administration | Notifications |
| `UserDeactivated` | EventEmitter2 | Administration | Notifications, Planning |
| `UserRoleChanged` | EventEmitter2 | Administration | All modules (обновление кэша прав) |
| `EvaluationRequired` | EventEmitter2 + BullMQ | Workflow/Scheduler | Notifications (напоминание) |

### Структура события

```typescript
// domain/events/domain-event.base.ts
export abstract class DomainEvent {
  readonly eventId: string;                     // UUID v4
  readonly eventName: string;                   // Уникальное имя события
  readonly occurredOn: Date;                    // Дата возникновения
  readonly aggregateId: string;                 // ID агрегата
  readonly aggregateType: string;               // Тип агрегата
  readonly payload: Record<string, unknown>;     // Данные события
  readonly correlationId?: string;              // Для tracing цепочки событий
  readonly causationId?: string;                // ID вызвавшего события
  readonly userId?: string;                     // Инициатор (если человек)
}

// Пример конкретного события
export class PlanFixedEvent extends DomainEvent {
  constructor(aggregateId: string, payload: PlanFixedPayload) {
    super({
      eventName: 'plan.fixed',
      aggregateId,
      aggregateType: 'SprintPlan',
      payload,
    });
  }
}

interface PlanFixedPayload {
  periodId: string;
  versionNumber: number;
  fixedAt: Date;
  totalPlannedHours: number;
  taskCount: number;
}
```

### BullMQ Queues — конфигурация

```typescript
// infrastructure/queue/queue.config.ts
export const QUEUES = {
  SYNC: {
    name: 'sync',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  REPORT: {
    name: 'report',
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
    },
  },
  NOTIFICATION: {
    name: 'notification',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },
  EXPORT: {
    name: 'export',
    defaultJobOptions: {
      attempts: 1,
    },
  },
} as const;
```

### Правила работы с событиями

1. **EventEmitter2** — для синхронных реакций в рамках одного request (обновление кэша, аудит, дополнительная валидация).
2. **BullMQ** — для асинхронных задач, которые не должны блокировать HTTP-ответ (синхронизация, пересчёт, уведомления, экспорт).
3. **Event Sourcing не используется** в первой версии — только event notification.
4. **Каждое событие** должно иметь обработчик хотя бы в одном модуле, либо быть явно intentional no-op.
5. **Ошибки в обработчиках** не должны ломать основной поток — try-catch + логирование + уведомление администратора.
6. **Correlation ID** — все события в цепочке должны иметь общий correlationId для трассировки.
7. **События не должны** содержать большие объёмы данных (>10KB payload). Вместо этого передаётся aggregateId, и подписчик загружает данные самостоятельно.
8. **BullMQ job** должен быть идемпотентным — повторная обработка не должна дублировать данные.

---

## 6. Модель данных

### 6.1 Принципы проектирования

1. **Prisma ORM** — единственный источник истины (Single Source of Truth) для схемы БД.
2. **Extensibility** — каждая таблица содержит поле `extensions` (Json?) для будущих модулей без миграций.
3. **Версионирование** — критические конфигурации (ставки, формулы, план) имеют версионные таблицы (snapshot на момент закрытия периода).
4. **Soft delete** — пользователи и сущности не удаляются физически, только помечаются `isActive = false` / `deletedAt = timestamp`.
5. **Аудит** — все изменения критичных данных фиксируются в `AuditLog` (INSERT-only таблица).
6. **Индексы** — на поля, участвующие в фильтрации, сортировке и join'ах (periodId, userId, status, system, project, assignee).
7. **Именование** — snake_case для БД, camelCase для TypeScript (Prisma `@@map` / `@map`).
8. **UUID** — первичные ключи (UUID v4), не auto-increment.

### 6.2 Prisma Schema (структура основных таблиц)

```prisma
// ──────────────────────────────
// Administration (Администрирование)
// ──────────────────────────────

model User {
  id              String   @id @default(uuid()) @map("id")
  login           String   @unique @map("login")
  email           String?  @map("email")
  fullName        String?  @map("full_name")
  youtrackLogin   String?  @map("youtrack_login")
  youtrackUserId  String?  @map("youtrack_user_id")
  adLogin         String?  @map("ad_login")
  isActive        Boolean  @default(true) @map("is_active")
  isBlocked       Boolean  @default(false) @map("is_blocked")
  employmentDate  DateTime? @map("employment_date")
  terminationDate DateTime? @map("termination_date")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  extensions      Json?    @map("extensions")  // Для будущих полей

  roles           UserRole[]
  employeeProfile EmployeeProfile?
  rateHistory     EmployeeRateHistory[]
  auditLogs       AuditLog[]
  plannedTasks    PlannedTask[]
  managerEvaluations  ManagerEvaluation[] @relation("ManagerEvaluator")
  businessEvaluations BusinessEvaluation[] @relation("BusinessEvaluator")

  @@index([isActive])
  @@index([adLogin])
  @@index([youtrackLogin])
  @@map("users")
}

model Role {
  id          String     @id @default(uuid()) @map("id")
  name        String     @unique @map("name")  // Пользователь, Руководитель, Менеджер, Директор, Бизнес, Бухгалтер, Администратор
  description String?    @map("description")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  extensions  Json?      @map("extensions")

  users       UserRole[]

  @@map("roles")
}

model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
  @@index([roleId])
  @@map("user_roles")
}

model WorkRole {
  id          String            @id @default(uuid()) @map("id")
  name        String            @unique @map("name")  // Разработка, Тестирование, Управление, Другое
  description String?           @map("description")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")
  extensions  Json?             @map("extensions")

  employees   EmployeeProfile[]

  @@map("work_roles")
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

  user          User       @relation(fields: [userId], references: [id])
  workRole      WorkRole?  @relation(fields: [workRoleId], references: [id])
  supervisor    User?      @relation("Supervision", fields: [managerId], references: [id])
  subordinates  User[]     @relation("Supervision")

  @@index([managerId])
  @@index([workRoleId])
  @@map("employee_profiles")
}

// ──────────────────────────────
// Planning (Планирование)
// ──────────────────────────────

model ReportingPeriod {
  id               String   @id @default(uuid()) @map("id")
  month            Int      @map("month")      // 1-12
  year             Int      @map("year")
  state            String   @default("PLANNING") @map("state") // PeriodState enum
  workHoursPerMonth Int?    @map("work_hours_per_month")
  reservePercent   Float?   @default(0.3) @map("reserve_percent")
  testPercent      Float?   @default(0.2) @map("test_percent")
  debugPercent     Float?   @default(0.3) @map("debug_percent")
  mgmtPercent      Float?   @default(0.1) @map("mgmt_percent")
  yellowThreshold  Float?   @default(0.8) @map("yellow_threshold")
  redThreshold     Float?   @default(1.0) @map("red_threshold")
  businessGroupingLevel String? @default("STORY") @map("business_grouping_level")
  closedAt         DateTime? @map("closed_at")
  reopenedAt       DateTime? @map("reopened_at")
  reopenReason     String?   @map("reopen_reason")
  createdById      String    @map("created_by_id")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  extensions       Json?     @map("extensions")

  createdBy        User      @relation(fields: [createdById], references: [id])
  sprintPlans      SprintPlan[]
  periodTransitions PeriodTransition[]
  summaryReports   PeriodSummaryReport[]
  personalReports  PersonalReport[]

  @@index([month, year])
  @@index([state])
  @@index([year, month, state])
  @@map("reporting_periods")
}

model PeriodTransition {
  id          String   @id @default(uuid()) @map("id")
  periodId    String   @map("period_id")
  fromState   String   @map("from_state")
  toState     String   @map("to_state")
  reason      String?  @map("reason")
  userId      String   @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  period      ReportingPeriod @relation(fields: [periodId], references: [id])

  @@index([periodId])
  @@map("period_transitions")
}

model SprintPlan {
  id           String   @id @default(uuid()) @map("id")
  periodId     String   @map("period_id")
  versionNumber Int     @default(1) @map("version_number")
  isFixed      Boolean  @default(false) @map("is_fixed")
  fixedAt      DateTime? @map("fixed_at")
  fixedBy      String?  @map("fixed_by_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  extensions   Json?    @map("extensions")

  period       ReportingPeriod @relation(fields: [periodId], references: [id])
  plannedTasks PlannedTask[]
  versions     SprintPlanVersion[]

  @@index([periodId])
  @@index([periodId, versionNumber])
  @@map("sprint_plans")
}

model SprintPlanVersion {
  id              String   @id @default(uuid()) @map("id")
  sprintPlanId    String   @map("sprint_plan_id")
  versionNumber   Int      @map("version_number")
  snapshot        Json     @map("snapshot")    // Полный снапшот плана (задачи, назначения, часы)
  createdAt       DateTime @default(now()) @map("created_at")

  sprintPlan      SprintPlan @relation(fields: [sprintPlanId], references: [id])

  @@index([sprintPlanId])
  @@map("sprint_plan_versions")
}

model PlannedTask {
  id              String   @id @default(uuid()) @map("id")
  sprintPlanId    String   @map("sprint_plan_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  assigneeId      String?  @map("assignee_id")
  plannedHours    Float    @default(0) @map("planned_hours")
  debugHours      Float    @default(0) @map("debug_hours")
  testHours       Float    @default(0) @map("test_hours")
  mgmtHours       Float    @default(0) @map("mgmt_hours")
  sortOrder       Int      @default(0) @map("sort_order")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  sprintPlan      SprintPlan @relation(fields: [sprintPlanId], references: [id])
  assignee        User?      @relation(fields: [assigneeId], references: [id])

  @@index([sprintPlanId])
  @@index([assigneeId])
  @@index([youtrackIssueId])
  @@map("planned_tasks")
}

// ──────────────────────────────
// Integration (Интеграция)
// ──────────────────────────────

model YouTrackIssue {
  id               String   @id @default(uuid()) @map("id")
  youtrackId       String   @unique @map("youtrack_id")       // ID в YouTrack
  issueNumber      String   @map("issue_number")              // idReadable: TEST-123
  summary          String   @map("summary")
  description      String?  @map("description")
  projectName      String?  @map("project_name")
  systemName       String?  @map("system_name")               // Custom field Система
  sprintName       String?  @map("sprint_name")               // Custom field Спринт
  typeName         String?  @map("type_name")                 // Custom field Type
  priorityName     String?  @map("priority_name")             // Custom field Priority
  stateName        String?  @map("state_name")                // State name
  isResolved       Boolean  @default(false) @map("is_resolved")
  reporterId       String?  @map("reporter_id")
  assigneeId       String?  @map("assignee_id")               // Первый исполнитель
  estimationMinutes Int?    @map("estimation_minutes")        // Оценка в минутах
  parentIssueId    String?  @map("parent_issue_id")           // ID родителя в СПО
  parentYtId       String?  @map("parent_yt_id")              // ID родителя в YouTrack
  lastSyncAt       DateTime? @map("last_sync_at")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  extensions       Json?    @map("extensions")

  parentIssue     YouTrackIssue? @relation("IssueHierarchy", fields: [parentIssueId], references: [id])
  childIssues     YouTrackIssue[] @relation("IssueHierarchy")
  workItems       WorkItem[]

  @@index([projectName])
  @@index([systemName])
  @@index([assigneeId])
  @@index([parentIssueId])
  @@index([isResolved])
  @@map("youtrack_issues")
}

model WorkItem {
  id              String   @id @default(uuid()) @map("id")
  issueId         String   @map("issue_id")
  youtrackWorkItemId String? @map("youtrack_work_item_id")
  authorId        String?  @map("author_id")
  durationMinutes Int      @default(0) @map("duration_minutes")
  description     String?  @map("description")
  workDate        DateTime? @map("work_date")
  workTypeName    String?  @map("work_type_name")
  periodId        String?  @map("period_id")
  createdAt       DateTime @default(now()) @map("created_at")

  issue           YouTrackIssue @relation(fields: [issueId], references: [id])

  @@index([issueId])
  @@index([periodId])
  @@index([authorId])
  @@index([periodId, authorId])
  @@map("work_items")
}

model IntegrationSettings {
  id              String   @id @default(uuid()) @map("id")
  baseUrl         String   @map("base_url")
  apiTokenEncrypted String @map("api_token_encrypted")
  projects        Json     @map("projects")                   // Список проектов
  searchQuery     String?  @map("search_query")
  agileBoardId    String?  @map("agile_board_id")
  sprintFieldId   String?  @map("sprint_field_id")
  syncInterval    String?  @default("0 */6 * * *") @map("sync_interval") // Cron
  batchSize       Int      @default(50) @map("batch_size")
  requestTimeout  Int      @default(30000) @map("request_timeout")
  retryCount      Int      @default(3) @map("retry_count")
  errorEmail      String?  @map("error_email")
  fieldMapping    Json?    @map("field_mapping")              // Маппинг полей СПО ↔ YouTrack
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  @@map("integration_settings")
}

model SyncRun {
  id              String   @id @default(uuid()) @map("id")
  triggerType     String   @map("trigger_type")               // MANUAL, SCHEDULED
  startedById     String?  @map("started_by_id")
  status          String   @default("RUNNING") @map("status") // RUNNING, SUCCESS, PARTIAL, FAILED
  totalIssues     Int      @default(0) @map("total_issues")
  createdCount    Int      @default(0) @map("created_count")
  updatedCount    Int      @default(0) @map("updated_count")
  errorCount      Int      @default(0) @map("error_count")
  errors          Json?    @map("errors")
  startedAt       DateTime @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")
  duration        Int?     @map("duration")                   // секунды
  extensions      Json?    @map("extensions")

  logs            SyncLogEntry[]

  @@index([status])
  @@index([startedAt])
  @@map("sync_runs")
}

model SyncLogEntry {
  id          String   @id @default(uuid()) @map("id")
  syncRunId   String   @map("sync_run_id")
  level       String   @map("level")                         // INFO, WARN, ERROR
  message     String   @map("message")
  entityId    String?  @map("entity_id")
  entityType  String?  @map("entity_type")
  details     Json?    @map("details")
  createdAt   DateTime @default(now()) @map("created_at")

  syncRun     SyncRun  @relation(fields: [syncRunId], references: [id])

  @@index([syncRunId])
  @@map("sync_log_entries")
}

// ──────────────────────────────
// Reporting (Отчётность)
// ──────────────────────────────

model ManagerEvaluation {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @map("period_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  userId          String   @map("user_id")                    // Кого оценивают
  evaluatedById   String   @map("evaluated_by_id")             // Руководитель
  evaluationType  String   @map("evaluation_type")            // Отлично, Хорошо, и т.д.
  comment         String?  @map("comment")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  period          ReportingPeriod @relation(fields: [periodId], references: [id])
  user            User     @relation("ManagerEvaluated", fields: [userId], references: [id])
  evaluatedBy     User     @relation("ManagerEvaluator", fields: [evaluatedById], references: [id])

  @@index([periodId])
  @@index([userId])
  @@index([periodId, userId])
  @@map("manager_evaluations")
}

model BusinessEvaluation {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @map("period_id")
  youtrackIssueId String   @map("youtrack_issue_id")
  evaluatedById   String   @map("evaluated_by_id")             // Бизнес-роль
  evaluationType  String   @map("evaluation_type")            // Прямая выгода, Польза очевидна, и т.д.
  comment         String?  @map("comment")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  period          ReportingPeriod @relation(fields: [periodId], references: [id])
  evaluatedBy     User     @relation("BusinessEvaluator", fields: [evaluatedById], references: [id])

  @@index([periodId])
  @@index([youtrackIssueId])
  @@map("business_evaluations")
}

model PersonalReport {
  id              String   @id @default(uuid()) @map("id")
  periodId        String   @map("period_id")
  userId          String   @map("user_id")
  totalBaseAmount Float    @default(0) @map("total_base_amount")
  totalManagerAmount Float @default(0) @map("total_manager_amount")
  totalBusinessAmount Float @default(0) @map("total_business_amount")
  totalOnHand     Float    @default(0) @map("total_on_hand")
  totalNdfl       Float    @default(0) @map("total_ndfl")
  totalInsurance  Float    @default(0) @map("total_insurance")
  totalReserve    Float    @default(0) @map("total_reserve")
  totalWithTax    Float    @default(0) @map("total_with_tax")
  totalHours      Float    @default(0) @map("total_hours")
  isFrozen        Boolean  @default(false) @map("is_frozen")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  extensions      Json?    @map("extensions")

  period          ReportingPeriod  @relation(fields: [periodId], references: [id])
  user            User             @relation(fields: [userId], references: [id])
  lines           PersonalReportLine[]

  @@unique([periodId, userId])
  @@index([periodId])
  @@index([userId])
  @@map("personal_reports")
}

model PersonalReportLine {
  id                  String   @id @default(uuid()) @map("id")
  personalReportId    String   @map("personal_report_id")
  youtrackIssueId     String   @map("youtrack_issue_id")
  hours               Float    @default(0) @map("hours")
  baseAmount          Float    @default(0) @map("base_amount")
  managerPercent      Float?   @map("manager_percent")
  managerAmount       Float    @default(0) @map("manager_amount")
  businessPercent     Float?   @map("business_percent")
  businessAmount      Float    @default(0) @map("business_amount")
  totalOnHand         Float    @default(0) @map("total_on_hand")
  ndfl                Float    @default(0) @map("ndfl")
  insurance           Float    @default(0) @map("insurance")
  reserveVacation     Float    @default(0) @map("reserve_vacation")
  totalWithTax        Float    @default(0) @map("total_with_tax")
  effectiveRate       Float    @default(0) @map("effective_rate")
  createdAt           DateTime @default(now()) @map("created_at")

  personalReport      PersonalReport @relation(fields: [personalReportId], references: [id])

  @@index([personalReportId])
  @@map("personal_report_lines")
}

model PeriodSummaryReport {
  id                String   @id @default(uuid()) @map("id")
  periodId          String   @unique @map("period_id")
  totalPlannedHours  Float   @default(0) @map("total_planned_hours")
  totalActualHours  Float    @default(0) @map("total_actual_hours")
  totalDeviation    Float    @default(0) @map("total_deviation")
  completionPercent Float    @default(0) @map("completion_percent")
  unplannedHours    Float    @default(0) @map("unplanned_hours")
  unplannedPercent  Float    @default(0) @map("unplanned_percent")
  remainingHours    Float    @default(0) @map("remaining_hours")
  unfinishedTasks   Int      @default(0) @map("unfinished_tasks")
  dataSnapshot      Json?    @map("data_snapshot")             // Снапшот всех данных на момент расчёта
  isFrozen          Boolean  @default(false) @map("is_frozen")
  calculatedAt      DateTime? @map("calculated_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  extensions        Json?    @map("extensions")

  period            ReportingPeriod @relation(fields: [periodId], references: [id])

  @@map("period_summary_reports")
}

// ──────────────────────────────
// Finance (Финансы)
// ──────────────────────────────

model EmployeeRateHistory {
  id                String   @id @default(uuid()) @map("id")
  userId            String   @map("user_id")
  monthlySalary     Float    @map("monthly_salary")            // ЗП на руки в месяц
  annualHours       Int      @map("annual_hours")              // Рабочих часов в году
  hourlyRate        Float    @map("hourly_rate")               // Рассчитанная часовая ставка
  effectiveFrom     DateTime @map("effective_from")
  effectiveTo       DateTime? @map("effective_to")
  changedById       String   @map("changed_by_id")
  changeReason      String?  @map("change_reason")
  createdAt         DateTime @default(now()) @map("created_at")
  extensions        Json?    @map("extensions")

  user              User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([effectiveFrom])
  @@index([userId, effectiveFrom])
  @@map("employee_rate_history")
}

model FormulaConfiguration {
  id                String   @id @default(uuid()) @map("id")
  name              String   @unique @map("name")
  formulaType       String   @map("formula_type")             // BASE_PERCENT, MANAGER_EVAL, BUSINESS_EVAL, NDFL, INSURANCE, RESERVE
  value             Float    @map("value")                    // Процент или сумма
  description       String?  @map("description")
  isActive          Boolean  @default(true) @map("is_active")
  createdById       String   @map("created_by_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  extensions        Json?    @map("extensions")

  versions          FormulaConfigurationVersion[]

  @@map("formula_configurations")
}

model FormulaConfigurationVersion {
  id                String   @id @default(uuid()) @map("id")
  formulaId         String   @map("formula_id")
  versionNumber     Int      @map("version_number")
  value             Float    @map("value")
  changedById       String   @map("changed_by_id")
  changeReason      String?  @map("change_reason")
  createdAt         DateTime @default(now()) @map("created_at")

  formula           FormulaConfiguration @relation(fields: [formulaId], references: [id])

  @@index([formulaId])
  @@map("formula_configuration_versions")
}

// ──────────────────────────────
// Notifications (Уведомления)
// ──────────────────────────────

model NotificationTemplate {
  id          String   @id @default(uuid()) @map("id")
  eventName   String   @unique @map("event_name")
  subject     String   @map("subject")                      // Шаблон subject ({{periodName}}, etc.)
  body        String   @map("body")                         // Шаблон body (HTML или text)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  extensions  Json?    @map("extensions")

  runs        NotificationRun[]

  @@map("notification_templates")
}

model NotificationRun {
  id          String   @id @default(uuid()) @map("id")
  templateId  String?  @map("template_id")
  eventName   String   @map("event_name")
  recipientId String   @map("recipient_id")
  status      String   @default("PENDING") @map("status")   // PENDING, SENT, FAILED
  error       String?  @map("error")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime @default(now()) @map("created_at")

  template    NotificationTemplate? @relation(fields: [templateId], references: [id])

  @@index([status])
  @@index([createdAt])
  @@map("notification_runs")
}

// ──────────────────────────────
// Audit (Аудит)
// ──────────────────────────────

model AuditLog {
  id          String   @id @default(uuid()) @map("id")
  entityType  String   @map("entity_type")                  // User, ReportingPeriod, SprintPlan, etc.
  entityId    String   @map("entity_id")
  action      String   @map("action")                       // CREATE, UPDATE, DELETE, FIX, CLOSE, REOPEN
  userId      String?  @map("user_id")
  changes     Json?    @map("changes")                      // { field: { old, new } }
  metadata    Json?    @map("metadata")                     // IP, user-agent, etc.
  createdAt   DateTime @default(now()) @map("created_at")

  user        User?    @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([userId])
  @@map("audit_logs")
}
```

### 6.3 ER-связи (ключевые)

```
User (1) ──< (N) UserRole (N) >── (1) Role
User (1) ──< (1) EmployeeProfile
EmployeeProfile (N) >── (1) WorkRole
EmployeeProfile (N) >── (1) User (supervisor)

ReportingPeriod (1) ──< (N) SprintPlan
SprintPlan (1) ──< (N) SprintPlanVersion
SprintPlan (1) ──< (N) PlannedTask
PlannedTask (N) >── (1) User (assignee)

ReportingPeriod (1) ──< (N) PeriodTransition
ReportingPeriod (1) ──< (N) PeriodSummaryReport
ReportingPeriod (1) ──< (N) PersonalReport
PersonalReport (1) ──< (N) PersonalReportLine

YouTrackIssue (1) ──< (N) WorkItem
YouTrackIssue (1) ──< (N) YouTrackIssue (parent-child)

SyncRun (1) ──< (N) SyncLogEntry

EmployeeRateHistory (N) >── (1) User
FormulaConfiguration (1) ──< (N) FormulaConfigurationVersion

NotificationTemplate (1) ──< (N) NotificationRun

AuditLog (N) >── (1) User
```

---

## 7. CI/CD Pipeline

### 7.1 Этапы pipeline

```
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│    Lint    │ → │  Typecheck │ → │ Unit Tests │ → │  Integr.   │ → │   Build    │ → │    Push    │ → │   Deploy   │
│  (ESLint)  │   │ (tsc)      │   │  (Vitest)  │   │   Tests    │   │ (Docker)   │   │  (Registry)│   │ (Docker   )│
└────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
                                                                                                           │
                                                                                                    ┌─────┴─────┐
                                                                                                    │  Smoke     │
                                                                                                    │  Tests     │
                                                                                                    └───────────┘
```

### 7.2 Детали этапов

| Этап | Инструмент | Команда | Ожидание |
|---|---|---|---|
| Lint | ESLint + Prettier | `npm run lint` | No errors |
| Typecheck | TypeScript (tsc) | `npm run typecheck` | No type errors |
| Unit Tests | Vitest | `npm run test:unit` | 100% pass, coverage ≥ 80% |
| Integration Tests | Vitest + Testcontainers | `npm run test:integration` | 100% pass |
| Build | Docker Buildx | `docker build -t spo-backend .` | Build succeeds |
| Push | Docker Registry | `docker push registry/spo-backend:tag` | Push succeeds |
| Deploy | Docker Compose | `docker compose -f docker-compose.yml up -d` | All services healthy |
| Smoke Tests | Vitest / Supertest | `npm run test:smoke` | Critical endpoints respond |

### 7.3 `.github/workflows/ci-cd.yml` (структура)

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: spo_test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t spo-backend:latest ./packages/backend
      - run: docker build -t spo-frontend:latest ./packages/frontend

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          docker compose -f packages/docker/docker-compose.yml pull
          docker compose -f packages/docker/docker-compose.yml up -d
      - run: npm run test:smoke
```

### 7.4 Docker Compose (сервисы)

| Сервис | Образ | Порты | Зависимости |
|---|---|---|---|
| `nginx` | nginx:latest | 80, 443 | backend, frontend |
| `backend` | spo-backend:latest | 3000 | postgres, redis |
| `frontend` | spo-frontend:latest | 3001 | — |
| `postgres` | postgres:16 | 5432 | — |
| `redis` | redis:7 | 6379 | — |
| `backup` | postgres:16 | — | postgres |

### 7.5 Окружения

| Окружение | Назначение | URL |
|---|---|---|
| `development` | Локальная разработка | `http://localhost:3000` |
| `staging` | Интеграционное тестирование | `https://spo-staging.company.local` |
| `production` | Продуктив | `https://spo.company.local` |

---

## 8. Тестирование

### 8.1 Стратегия тестирования

```
                    ┌──────────────┐
                    │   E2E Tests  │  ← Playwright / Supertest
                   ┌┴──────────────┴┐
                   │ Integration    │  ← Testcontainers (PostgreSQL, Redis)
                  ┌┴────────────────┴┐
                  │   Unit Tests     │  ← Vitest (mocks)
                 ┌┴──────────────────┴┐
                 │    Static Analysis  │  ← ESLint, tsc, Prettier
                 └────────────────────┘
```

### 8.2 Unit Tests

**Что тестируем:**
- **Domain Layer**: все Entities, Value Objects, Domain Services, Domain Events.
- **Application Layer**: Use Cases (с моками репозиториев и портов).

**Пример:**

```typescript
// test/unit/domain/services/capacity-calculator.spec.ts
describe('CapacityCalculator', () => {
  it('should calculate available hours with reserve', () => {
    const result = CapacityCalculator.calculate({
      workHoursPerMonth: 168,
      reservePercent: 0.3,
    });
    expect(result.availableHours).toBe(117.6);
  });

  it('should detect overload with yellow threshold', () => {
    const capacity = new EmployeeCapacity({ available: 100, planned: 85 });
    expect(capacity.zone).toBe('YELLOW'); // 85% > 80% yellow threshold
  });
});
```

```typescript
// test/unit/application/planning/fix-plan-use-case.spec.ts
describe('FixPlanUseCase', () => {
  it('should fix plan and emit PlanFixedEvent', async () => {
    const mockRepo = mock<SprintPlanRepository>();
    const useCase = new FixPlanUseCase(mockRepo, mockEventBus);
    const result = await useCase.execute({ planId: 'plan-1' });
    expect(result.isFixed).toBe(true);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'plan.fixed' }),
    );
  });
});
```

### 8.3 Integration Tests

**Что тестируем:**
- **PrismaRepositories**: реальные запросы к PostgreSQL (через Testcontainers).
- **YouTrackApiAdapter**: с WireMock или nock для эмуляции YouTrack API.
- **LdapAuthAdapter**: с эмуляцией LDAP-сервера.
- **BullMQ Adapters**: с реальным Redis.
- **EmailAdapter**: с Mailpit или ethereal.email.

**Пример:**

```typescript
// test/integration/prisma/repositories/user.repository.spec.ts
describe('PrismaUserRepository (integration)', () => {
  beforeAll(async () => {
    // Поднять PostgreSQL через Testcontainers
    postgres = await new PostgreSqlContainer('postgres:16')
      .withDatabase('spo_test')
      .start();
    prisma = new PrismaClient({
      datasources: { db: { url: postgres.getConnectionUri() } },
    });
    await prisma.$executeRawUnsafe('RUN prisma migrate deploy');
  });

  it('should create and find user', async () => {
    const repo = new PrismaUserRepository(prisma);
    const user = await repo.save(User.create({ login: 'testuser', ... }));
    const found = await repo.findById(user.id);
    expect(found?.login).toBe('testuser');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await postgres.stop();
  });
});
```

### 8.4 E2E Tests

**Что тестируем:**
- Полные API-сценарии (create period → add tasks → fix plan → load facts → evaluate → close).
- Аутентификация и RBAC.
- Экспорт отчётов.

**Пример:**

```typescript
// test/e2e/planning/period-lifecycle.spec.ts
describe('Period lifecycle (E2E)', () => {
  it('should complete full period workflow', async () => {
    // 1. Аутентификация
    const token = await auth.login('admin', 'password');

    // 2. Создать период
    const period = await api.post('/api/planning/periods', {
      month: 1, year: 2025, workHoursPerMonth: 168,
    }).auth(token);

    // 3. Назначить задачи
    await api.put(`/api/planning/periods/${period.id}/tasks/task-1`, {
      assigneeId: 'user-1',
    }).auth(token);

    // 4. Зафиксировать план
    await api.post(`/api/planning/periods/${period.id}/fix-plan`).auth(token);

    // 5. Проверить состояние
    const state = await api.get(`/api/workflow/periods/${period.id}/state`).auth(token);
    expect(state.body.state).toBe('PLAN_FIXED');

    // ... и так далее по цепочке
  });
});
```

### 8.5 Coverage goals

| Тип | Покрытие | Критические пакеты |
|---|---|---|
| Domain Layer | ≥ 95% | Все entity, value objects, domain services |
| Application Layer | ≥ 85% | Все use cases |
| Infrastructure Layer | ≥ 70% | Репозитории, адаптеры |
| Presentation Layer | ≥ 60% | Контроллеры (через E2E) |

---

## 9. Принципы Extensibility

### 9.1 Как добавить новый модуль (Bounded Context)

Процесс добавления нового модуля (например, **CRM-интеграция** или **Бухгалтерская система**):

```
Шаг 1: Определить Bounded Context
  └── Создать папку application/<new-module>/
      ├── use-cases/
      ├── dto/
      ├── ports/
      └── handlers/

Шаг 2: Определить Domain Entities
  └── Добавить сущности в domain/entities/ и domain/value-objects/

Шаг 3: Создать Repository Interface
  └── Добавить порт в application/<new-module>/ports/

Шаг 4: Реализовать Infrastructure
  └── Создать адаптеры в infrastructure/
  └── Добавить модели в prisma/schema.prisma + миграция

Шаг 5: Создать Controller
  └── Добавить контроллер в presentation/controllers/

Шаг 6: Зарегистрировать события
  └── Если модуль испускает события → добавить в event-bus/events/
  └── Если модуль реагирует на события → добавить handler

Шаг 7: Зарегистрировать модуль в DI
  └── Добавить @Module({...}) в NestJS
  └── Импортировать в корневой AppModule

Шаг 8: Написать тесты
  └── Unit tests для use cases
  └── Integration tests для адаптеров
  └── E2E tests для API
```

### 9.2 Контракты модулей

Каждый модуль обязан реализовать:

```typescript
// Каждый модуль экспортирует:
export interface ModuleContract {
  name: string;                    // Уникальное имя модуля
  dependencies: string[];          // Имена модулей-зависимостей
  eventsProduced: string[];        // Какие события испускает
  eventsConsumed: string[];        // На какие события подписан
  getModule(): DynamicModule;      // NestJS DynamicModule
}
```

### 9.3 Расширение модели данных

```prisma
// Каждая таблица содержит поле extensions для будущих полей:
model AnyTable {
  // ... стандартные поля
  extensions Json?  @map("extensions")
}

// Новый модуль может использовать extensions для хранения своих данных
// без миграции схемы. При необходимости — полноценная миграция.
```

### 9.4 Точки расширения (Extension Points)

| Точка расширения | Механизм | Пример |
|---|---|---|
| Новый bounded context | Модуль NestJS + своя папка в application/ | CRM-модуль |
| Новый тип события | Добавить в event-bus/events/ + обработчик | OrderCreated |
| Новый адаптер внешней системы | Реализовать порт в infrastructure/ | Биллинг API |
| Новая формула расчёта | FormulaConfiguration + FormulaConfigurationVersion | Новый налог |
| Новый тип отчёта | Reporting use cases + export adapter | Отчёт для бухгалтерии |
| Новый тип уведомления | NotificationTemplate + event handler | SMS-уведомление |
| Новая интеграция | Integration use case + adapter | GitLab интеграция |

### 9.5 Правила для ИИ-агентов

1. **Не нарушать границы модулей** — Agent-Planning не пишет код в папке `application/finance/`.
2. **Не менять чужие порты** без согласования с владельцем модуля.
3. **Все cross-module вызовы** — только через Event Bus или общие порты в `domain/repositories/`.
4. **Каждый модуль** имеет свою папку `test/unit/` и `test/integration/`.
5. **Prisma Schema** — единый файл, изменения коммитятся с миграцией.
6. **API-контракты** — фиксируются в Swagger/OpenAPI, breaking changes только с новой версией API.
7. **Каждый агент** отвечает за документацию своего модуля в `/docs/<module>.md`.

---

## 10. Production Architecture v2

### 10.1 Transactional Outbox

Критичные доменные события не публикуются напрямую в Redis Pub/Sub как единственный источник доставки. Каждый use case, который меняет состояние периода, плана, факта, оценок, ставок, формул или отчётов, в той же транзакции записывает событие в таблицу `outbox_events`.

Поток обработки:

```text
UseCase → DB transaction: business changes + outbox_events row
OutboxWorker → reads PENDING events → executes handler → marks PROCESSED
```

Требования:

1. Все обработчики outbox-событий идемпотентны.
2. Для каждого события хранится `eventName`, `aggregateType`, `aggregateId`, `payload`, `attempts`, `status`, `error`.
3. Повторная обработка не создаёт дубли в YouTrack, отчётах, уведомлениях и экспортах.
4. Redis Pub/Sub может использоваться только как ускоритель уведомления worker-а, но не как durable storage события.

### 10.2 Snapshot закрытого периода

Закрытый период является immutable. После закрытия отчёты читаются из snapshot/materialized tables, а не пересчитываются из текущих справочников или актуального YouTrack.

Snapshot закрытого периода содержит:

- план и версию плана;
- фактические work items;
- задачи, статусы, проект, систему, тип, приоритет и иерархию;
- ставки, формулы, проценты и шкалы оценок;
- оценки руководителей и бизнеса;
- строки личных отчётов;
- строки итогового отчёта;
- итоговые суммы и статистику;
- контрольную сумму snapshot.

Переоткрытие периода директором не изменяет старый snapshot, а создаёт новую версию после повторного закрытия.

### 10.3 Materialized report tables

Reporting-модуль хранит подготовленные строки отчётов:

- `personal_reports`
- `personal_report_lines`
- `period_summary_reports`
- `period_summary_report_lines`

Сырые данные YouTrack и work items используются для пересчёта, но не для каждого открытия отчёта. После загрузки факта и после изменения оценок запускается асинхронный пересчёт через BullMQ/Outbox.

Для UI обязательны:

1. Серверная пагинация.
2. Серверная сортировка.
3. Серверная фильтрация.
4. Расчёт итогов на backend по текущему фильтру.
5. Virtual scrolling для больших таблиц.

### 10.4 Типы данных для денег, часов и процентов

В домене используются Value Objects:

```text
Money
Hours
Minutes
Percentage
Rate
```

В БД:

- деньги: `Decimal(18,2)` или копейки в `BigInt`;
- ставки: `Decimal(18,6)`;
- длительность из YouTrack: минуты `Int`;
- проценты: `Decimal(6,4)` или basis points `Int`.

`Float` запрещён для финансовых данных и длительностей, которые участвуют в расчётах.

### 10.5 Безопасность

Обязательные меры безопасности:

1. HTTPS only.
2. LDAPS для связи с Active Directory.
3. Refresh token rotation и хранение refresh token только в виде хеша.
4. Rate limit и brute-force protection для `/api/auth/login`.
5. YouTrack/Hub/SMTP/LDAP credentials хранятся зашифрованно.
6. Секреты маскируются в UI и никогда не возвращаются через GET API.
7. Секреты не попадают в audit, sync logs, application logs и export.
8. Backend-level проверки прав обязательны; UI не является границей безопасности.
9. Финансовые отчёты логируют факт просмотра и экспорта.
10. Backup БД шифруется и регулярно проверяется восстановлением на тестовом окружении.

### 10.6 RBAC + ABAC

RBAC остаётся базовой матрицей ролей, но поверх него вводится `AccessPolicyService`.

Примеры ABAC-проверок:

```typescript
canViewPersonalReport(viewer, employeeId, periodId)
canEditManagerEvaluation(viewer, employeeId, periodId)
canEditBusinessEvaluation(viewer, periodId)
canViewFinance(viewer, scope)
canManageRates(viewer, employeeId)
canReopenPeriod(viewer, periodId)
```

Это нужно, потому что роль `Руководитель` не даёт доступ ко всем личным отчётам, а только к своим подчинённым; роль `Администратор` управляет системой, но не получает финансовые данные без дополнительной роли.

### 10.7 Пользователи и удаление

Физическое удаление пользователя допустимо только если у него нет исторических данных. Если пользователь участвовал в планах, work items, отчётах, ставках или закрытых периодах, применяется soft delete. Закрытые отчёты хранят snapshot ФИО, логина, роли, руководителя и ставки.

### 10.8 Интеграция с YouTrack

Work items являются источником факта для личных отчётов и себестоимости. Агрегированное поле `Затраченное время` из YouTrack может использоваться только как контрольная сумма. Синхронизация выполняется пакетами, с ограничением параллельности, retry policy и отдельным журналом ошибок.

---

## 11. Приложение

### 11.1 Глоссарий ключевых терминов

| Термин | Определение |
|---|---|
| **ReportingPeriod** | Отчётный период (календарный месяц), агрегат, содержащий план, факт, оценки |
| **SprintPlan** | План на период, содержит список назначенных задач с часами |
| **PlannedTask** | Задача, назначенная на сотрудника в рамках плана |
| **YouTrackIssue** | Задача из YouTrack, синхронизированная в СПО |
| **WorkItem** | Списание времени (fact) по задаче из YouTrack |
| **EmployeeRate** | Часовая ставка сотрудника, рассчитанная из месячной ЗП |
| **FormulaConfiguration** | Настраиваемая формула (процент или конфигурация) |
| **PeriodState** | Состояние периода в стейт-машине |
| **Domain Event** | Событие предметной области, важное для других модулей |
| **Bounded Context** | Модуль с чёткими границами и собственным ubiquitous language |

### 11.2 RBAC Matrix

| Ресурс \ Роль | Пользователь | Руководитель | Менеджер | Директор | Бизнес | Бухгалтер | Администратор |
|---|---|---|---|---|---|---|---|
| Личный отчёт | R | R (свои + подчинённые) | R | R | – | – | – |
| Отчёты других | – | R (подчинённые) | R | R | R (итоговый) | – | – |
| Итоговый отчёт | – | R | R | R | R | – | – |
| Планирование | – | – | CRUD | CRUD | – | – | – |
| Фиксация плана | – | – | CRUD | CRUD | – | – | – |
| Оценка руководителя | – | CRUD (подчинённые) | – | CRUD | – | – | – |
| Оценка бизнеса | – | – | – | CRUD | CRUD | – | – |
| Ставки сотрудников | R | R (подчинённые) | CRUD | CRUD | – | – | – |
| Формулы расчёта | – | – | – | CRUD | – | CRUD | – |
| Пользователи/Роли | – | – | – | – | – | – | CRUD |
| Справочники | – | – | – | – | – | – | CRUD |
| Настройки интеграции | – | – | – | – | – | – | CRUD |
| Журнал аудита | – | – | – | R | – | – | R |
| Закрытие периода | – | – | – | CRUD | – | – | – |
| Переоткрытие периода | – | – | – | CRUD | – | – | – |
| Настройки LDAP/AD | – | – | – | – | – | – | CRUD |
| Экспорт данных | R | R | R | R | R | R | – |

> **R** = Read, **CRUD** = Full access (Create, Read, Update, Delete), **–** = No access

### 11.3 Технические решения (ADR-style)

| ID | Решение | Обоснование |
|---|---|---|
| ADR-001 | UUID v4 для всех PK | Избегаем коллизий при распределённой разработке; не раскрываем количество записей |
| ADR-002 | Одно поле `extensions Json?` для каждой таблицы | Позволяет добавлять поля без миграций; будущие модули используют это поле |
| ADR-003 | Event Notification вместо Event Sourcing | MVP не требует полного event sourcing; значительно проще в реализации |
| ADR-004 | Один Prisma schema файл | Проще управлять миграциями; все модули видят полную модель данных |
| ADR-005 | RBAC + ABAC | RBAC задаёт базовые роли, ABAC ограничивает доступ по контексту: подчинённые, период, тип отчёта, финансовая область |
| ADR-006 | REST API, не GraphQL | REST проще для ИИ-агентов; Swagger автодокументация; TanStack Table хорошо работает с REST |
| ADR-007 | Transactional Outbox + BullMQ, Redis Pub/Sub только как ускоритель | Критичные события должны переживать падения процесса и доставляться идемпотентно; Redis Pub/Sub не является durable storage |
| ADR-008 | Версионирование через таблицы + ClosedPeriodSnapshot | Необходимо для immutable отчётов после закрытия периода и воспроизводимости расчётов |
| ADR-009 | Frontend через API (Lovable) | Дизайн генерируется Lovable → подключается к REST API; Next.js только как клиент |
| ADR-010 | Модульный монолит | Один backend и одна БД обеспечивают транзакционность финансовых процессов; логические модули сохраняют независимость разработки |
| ADR-011 | Materialized report tables | Большие отчёты читаются быстро и фильтруются сервером без пересчёта из сырых work items при каждом открытии |
| ADR-012 | Decimal/Minutes вместо Float | Исключаются ошибки округления в зарплате, себестоимости и статистике |

---

*Конец документа. Версия 2.0.*
