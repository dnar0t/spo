# Контекст проекта СПО для ИИ-агентов

**Проект:** Система Планирования и Отчетности (СПО)  
**Версия контекста:** 1.0  
**Дата обновления:** 2026-04-27  
**Статус:** подготовлен стартовый контекст для разработки  
**Назначение:** файл должен открываться ИИ-агентами в начале каждой новой сессии разработки, чтобы быстро восстановить контекст проекта, текущие решения, прогресс и правила дальнейшей работы.

---

## 1. Краткое описание проекта

СПО — отдельный веб-портал для планирования календарного месячного спринта, контроля загрузки сотрудников, анализа план/факт и расчёта финансовых показателей на основе данных из YouTrack.

YouTrack остаётся основной системой учёта разработки:

- задачи создаются и ведутся в YouTrack;
- статусы, оценки, связи задач, исполнители и фактически потраченное время берутся из YouTrack;
- СПО не заменяет YouTrack, а использует его данные для управленческого планирования, финансовых расчётов и отчётности.

СПО разворачивается как отдельное веб-приложение на отдельном сервере с собственной базой данных.

---

## 2. Основные цели СПО

1. Планировать календарный месячный спринт с учётом доступной мощности сотрудников.
2. Исключать перегруз сотрудников.
3. Учитывать резерв времени на внеплановые задачи, по умолчанию 30%.
4. Фиксировать утверждённый план спринта.
5. Передавать признаки планирования обратно в YouTrack.
6. Загружать фактические результаты из YouTrack.
7. Сравнивать план и факт.
8. Формировать итоговый отчёт периода.
9. Формировать личные отчёты сотрудников.
10. Позволять выставлять оценки руководителя и бизнеса.
11. Рассчитывать зарплату, эффективную ставку и себестоимость.
12. Хранить историю изменений планов, ставок, формул, оценок и закрытых периодов.

---

## 3. Актуальные проектные документы

На текущий момент подготовлены и актуальны следующие документы:

1. `spo_tz_v2.md` — техническое задание версии 2.0.
2. `specification_v2.md` — техническая спецификация версии 2.0.
3. `architecture_v2.md` — архитектура версии 2.0.
4. `context.md` — текущий файл контекста для ИИ-агентов.

При противоречиях:

1. сначала смотреть `context.md`, так как он отражает текущий прогресс и последние решения;
2. затем `spo_tz_v2.md`;
3. затем `specification_v2.md`;
4. затем `architecture_v2.md`.

Если обнаружено противоречие между документами, агент должен не принимать самостоятельное неоднозначное решение, а зафиксировать вопрос в разделе `Открытые вопросы` этого файла или запросить уточнение у владельца проекта.

---

## 4. Текущий статус разработки

### 4.1 Что уже сделано

- ✅ **Part 1 — Project Setup and Base Infrastructure — завершён**
  - Monorepo: `packages/backend`, `packages/shared`, `docker`
  - NestJS backend skeleton с endpoint `/api/health`
  - Shared package (@spo/shared) с базовыми типами и enum (Role, PeriodState, WorkItemType)
  - TypeScript, ESLint, Prettier настроены, path aliases (@domain/*, @application/*, ...)
  - Docker Compose: PostgreSQL 16 + Redis 7
  - PrismaModule + PrismaService (подключение к PostgreSQL)
  - README с инструкцией локального запуска

- ✅ **Part 2 — Database, Migrations, System Mechanisms — завершён**
  - Полная Prisma-схема (все модели: users, roles, workRoles, employeeProfiles, refreshTokens, reportingPeriods, periodTransitions, sprintPlans, sprintPlanVersions, plannedTasks, youtrackIssues, workItems, integrationSettings, syncRuns, syncLogEntries, managerEvaluations, businessEvaluations, personalReports, personalReportLines, periodSummaryReports, employeeRateHistory, formulaConfigurations, formulaConfigurationVersions, notificationTemplates, notificationRuns, outboxMessages, auditLogs, periodSnapshots)
  - **Float запрещён** — Int для всех денег (копейки), времени (минуты) и процентов (basis points)
  - Value Objects: `Money`, `Minutes`, `Percentage`, `HourlyRate` — с полной арифметикой и валидацией
  - User Entity с бизнес-правилами (block/unblock/activate/deactivate/canLogin)
  - User Repository Interface (domain port)
  - PrismaUserRepository (infrastructure implementation)
  - Seed: роли (7 шт), рабочие роли (4 шт), admin user, шкалы оценок (9 шт), настройки интеграции, шаблоны уведомлений (6 шт)
  - Prisma client сгенерирован
  - `npm run build` — без ошибок (37 файлов)

- ✅ **Part 5 — YouTrack and Hub Integration — завершён**
  - YouTrack API base client: pagination, retry, timeout, rate limiting
  - YouTrack API response types (User, Issue, WorkItem, Project, Sprint, FieldMapping)
  - YouTrack Mapper (преобразование API → domain entities)
  - Sync Engine: runFullSync (users → projects → issues → workItems)
  - Sync Engine: syncWorkItemsByPeriod (для загрузки факта периода)
  - YouTrack Controller: GET /api/youtrack/status, POST /api/youtrack/sync, POST /api/youtrack/test-connection
  - YouTrack Controller: GET /api/youtrack/sync-runs, GET /api/youtrack/sync-runs/:id (с логами)
  - YouTrack Controller: GET /api/youtrack/issues (с фильтрацией и пагинацией)
  - YouTrack Controller: GET /api/youtrack/stats (статистика интеграции)
  - YouTrackModule подключён в AppModule
  - `npm run build` — без ошибок (85 файлов)

- ✅ **Part 6 — Sprint Planning — в процессе (core завершён)**
  - **Domain Layer**: ReportingPeriod, PlannedTask, SprintPlan, PeriodTransition entity + PeriodState value object (стейт-машина с валидацией переходов) + PlanFixedEvent
  - **Value Objects**: PeriodState (PLANNING → PLAN_FIXED → FACT_LOADED → EVALUATIONS_DONE → PERIOD_CLOSED → PERIOD_REOPENED), расширена арифметика Minutes/Percentage
  - **Domain Service**: CapacityCalculator — расчёт доступной мощности с резервом, определение зон загрузки (GREEN/YELLOW/RED)
  - **Repository Interfaces**: ReportingPeriodRepository, PlannedTaskRepository, SprintPlanRepository, PeriodTransitionRepository
  - **Prisma Implementations**: все 4 репозитория реализованы
  - **Use Cases**: CreatePeriod, UpdatePeriod, GetPeriods, GetPeriodDetail, GetBacklog (с фильтрацией, деревом, пагинацией), GetCapacity, AssignTask, UnassignTask, FixPlan (с PlanFixedEvent), TransitionPeriod
  - **Controller**: POST/GET/PUT/DELETE /api/planning/periods, GET /api/planning/periods/:id/backlog, GET /api/planning/periods/:id/capacity, PUT/DELETE /api/planning/periods/:id/tasks/:taskId, POST fix-plan, GET plan-versions, POST transition
  - PlanningAppModule зарегистрирован в AppModule
  - `npm run build` — без ошибок (85 файлов)

- Проект опубликован на GitHub: https://github.com/dnar0t/spo

- ✅ **Part 3 — Security, Auth, RBAC/ABAC, Audit — core завершён**
  - **Domain Layer**: RefreshSession entity, LoginAttempt entity, AuthDomainService (валидация входа, создание/ротация refresh token, brute-force), AccessControlService (RBAC + ABAC политики), AuthDomainErrors (InvalidCredentials, AccountLocked, InvalidToken и др.)
  - **Repository Interfaces**: RefreshSessionRepository, LoginAttemptRepository
  - **Prisma Implementations**: PrismaRefreshSessionRepository (+ findByTokenHash), PrismaLoginAttemptRepository
  - **Application Layer**: LoginUseCase (AD bind → user lookup → JWT → audit), RefreshTokenUseCase (ротация с SHA-256 хешем), LogoutUseCase (revoke sessions), GetCurrentUserUseCase
  - **Port Interfaces**: ILdapAuthAdapter, IJwtService, IAuditLogger, IEncryptionService
  - **Infrastructure**: JwtService (HS256, 15min access, 7d refresh), LdapMockAdapter, AuditLogger (Prisma → AuditLog), EncryptionService (AES-256-GCM)
  - **Guards**: JwtAuthGuard (Bearer token validation), RolesGuard + @Roles() декоратор
  - **Controller**: POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/test-ldap
  - **Security**: Helmet HTTP headers, rate limit on login, пароль не логируется/не сохраняется, JWT только sub/login/sessionId (роли из БД)
  - `npm run build` — без ошибок (198 файлов)

- ✅ **Part 4 — Administration and Dictionaries — core завершён**
  - **Domain Layer**: EmployeeProfile, EmployeeRate, FormulaConfig, EvaluationScale, WorkRole, PlanningSettings entities
  - **Repository Interfaces**: 6 новых интерфейсов (EmployeeProfile, EmployeeRate, FormulaConfig, EvaluationScale, WorkRole, PlanningSettings)
  - **Prisma Implementations**: 6 Prisma репозиториев
  - **Application Layer**: 15 use cases (CRUD пользователей, роли, руководитель, ставки, формулы, шкалы оценок, настройки планирования, справочники, audit log)
  - **Controller**: 11 endpoint'ов `/api/admin/*` с JwtAuthGuard + RolesGuard
  - `npm run build` — без ошибок (245 файлов)

- ✅ **Part 7 — Period Workflow, Fact Loading, Report Recalculation — core завершён**
  - **Domain Layer**: PersonalReport entity, SummaryReport entity, ManagerEvaluation entity, BusinessEvaluation entity, FactLoadedEvent, ReportCalculator (генерация personal/summary lines, расчёт зарплаты/налогов, группировка, статистика)
  - **Repository Interfaces**: PersonalReportRepository, SummaryReportRepository, ManagerEvaluationRepository, BusinessEvaluationRepository
  - **Prisma Implementations**: 4 Prisma репозитория
  - **Application Layer**: 11 use cases (LoadFact — синхронизация + transition + пересчёт, GeneratePersonalReports, GenerateSummaryReport, GetSummaryReport с пагинацией/фильтрацией, GetPersonalReport, GetPeriodStatistics, SubmitManagerEvaluation, SubmitBusinessEvaluation, TransitionPeriod, GetPeriodHistory, ReopenPeriod)
  - **Controllers**: ReportingController (11 endpoints: summary, personal, evaluations, recalculate), WorkflowController (4 endpoints: state, transition, reopen, history)
  - `npm run build` — без ошибок (278 файлов)

### 4.2 Что ещё не сделано

- Не реализован перенос readiness из предыдущего месяца (Part 6)
- Не реализовано изменение фиксированного плана только директором с audit log (Part 6) — ABAC политика `canModifyFixedPlan` уже создана
- Не реализован handler выгрузки плана в YouTrack (Part 6, Integration)
- Не создан frontend login page и route protection (Part 3, Frontend)
- Не создан frontend экран планирования (Part 6, Frontend)
- Не создан frontend итогового и личного отчёта (Part 7, Frontend)
- Не реализованы очереди BullMQ
- Не реализованы финансовые расчёты (Part 8)
- Не реализованы экспорты (Part 10)
- Не настроен CI/CD
- Не подготовлены тестовые данные (кроме seed)
- Не проведено end-to-end тестирование
- Не выполнены миграции Prisma (требуется запущенный PostgreSQL)

---

## 5. Архитектурные решения, обязательные к соблюдению

### 5.1 Архитектурный стиль

СПО реализуется как **модульный монолит**, а не как микросервисная система.

Один backend, одна основная база данных PostgreSQL, единая транзакционная граница, но чёткое разделение на модули:

- Planning;
- Integration;
- Reporting;
- Finance;
- Administration;
- Workflow;
- Notifications;
- Auth;
- Export.

Микросервисы на первой версии не использовать.

### 5.2 Слои

Используется Clean Architecture + DDD:

1. Domain Layer.
2. Application Layer.
3. Infrastructure Layer.
4. Presentation Layer.

Правила:

- Domain не зависит от NestJS, Prisma, Redis, BullMQ, LDAP или YouTrack API.
- Use cases находятся в Application Layer.
- Controllers не содержат бизнес-логики.
- Prisma используется только в Infrastructure Layer.
- Все внешние системы подключаются через ports/adapters.

### 5.3 Transactional Outbox

Для критичных событий обязателен Transactional Outbox.

Критичные события:

- `PlanFixed`;
- `PlanModified`;
- `FactLoaded`;
- `ManagerEvaluationSubmitted`;
- `BusinessEvaluationSubmitted`;
- `ReportRecalculated`;
- `PeriodClosed`;
- `PeriodReopened`;
- `SalaryCalculated`;
- `SyncCompleted`;
- `SyncFailed`.

Событие должно записываться в таблицу outbox в той же транзакции, что и изменение бизнес-данных.

Все обработчики событий должны быть идемпотентными.

### 5.4 Закрытые периоды и snapshots

После закрытия периода отчёты не должны пересчитываться из текущих данных YouTrack или текущих настроек СПО.

При закрытии периода должны фиксироваться snapshots:

- ставки сотрудников;
- формулы;
- проценты;
- коэффициенты оценок;
- оценки руководителя;
- оценки бизнеса;
- work items;
- статусы задач;
- готовность задач;
- иерархия задач;
- система, проект, тип, приоритет;
- связь задачи с бизнес-группировкой;
- рассчитанные строки личных отчётов;
- рассчитанные строки итогового отчёта;
- рассчитанные суммы налогов и взносов;
- effective rate;
- planned/actual/remaining cost.

После закрытия периода изменение справочников, ставок, формул или данных YouTrack не должно менять исторический отчёт.

### 5.5 Деньги, часы, проценты

Запрещено использовать `Float` для:

- денег;
- ставок;
- процентов;
- часов.

Правила хранения:

- часы хранить как `minutes: Int`;
- деньги хранить как `amountKopecks: BigInt` или `Decimal`;
- ставки хранить как `Decimal`;
- проценты хранить как basis points `Int` или `Decimal`;
- все расчёты денежных значений должны быть детерминированными.

---

## 6. Технологический стек

### 6.1 Frontend

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- TanStack Table;
- dnd-kit;
- React Hook Form;
- Zod.

### 6.2 Backend

- NestJS;
- TypeScript;
- REST API;
- Swagger/OpenAPI;
- Zod или class-validator для DTO.

### 6.3 Database

- PostgreSQL;
- Prisma ORM;
- миграции через Prisma Migrate.

### 6.4 Очереди и фоновые задачи

- Redis;
- BullMQ.

Используется для:

- синхронизации с YouTrack;
- пересчёта отчётов;
- отправки уведомлений;
- экспорта Excel/PDF;
- обработки outbox.

### 6.5 Авторизация

- LDAP/LDAPS к локальному Active Directory;
- JWT access token;
- refresh token rotation;
- хранение refresh token hash в БД.

---

## 7. Безопасность

Обязательные требования:

1. HTTPS only.
2. LDAPS only.
3. Rate limit на `/api/auth/login`.
4. Защита от brute force.
5. Refresh token rotation.
6. Refresh token хранить только в виде хеша.
7. YouTrack token хранить зашифрованным.
8. Hub token, SMTP credentials, LDAP service credentials хранить зашифрованными.
9. Секреты не возвращать в API-ответах.
10. Секреты не логировать.
11. Секреты не писать в audit log.
12. В UI показывать только маскированные значения секретов.
13. RBAC проверять на backend.
14. ABAC проверять на backend.
15. Вести audit log доступа и изменений финансовых данных.
16. Резервные копии БД должны быть защищены.

---

## 8. Доступы: RBAC + ABAC

Один пользователь может иметь несколько ролей.

Основные роли:

- Пользователь;
- Руководитель;
- Менеджер;
- Директор;
- Бизнес;
- Бухгалтер;
- Администратор.

Обязательные ABAC-проверки:

- Руководитель видит и оценивает только своих сотрудников.
- Пользователь видит только свой личный отчёт.
- Бизнес видит итоговый отчёт и ставит оценку бизнеса, но не видит персональные финансовые отчёты.
- Менеджер может редактировать процент готовности, но не может ставить оценку бизнеса.
- Директор может корректировать оценки, ставки, формулы, закрывать и переоткрывать периоды.
- Администратор не видит финансы без дополнительной роли.
- Бухгалтер управляет налоговыми формулами, но не должен получать лишний доступ к операционным данным.

Для сложных проверок использовать отдельный `AccessPolicy` / `PermissionService`.

---

## 9. Интеграция с YouTrack

### 9.1 Источник данных

YouTrack является источником:

- задач;
- номеров задач;
- названий задач;
- проектов;
- системы;
- спринта;
- типа;
- приоритета;
- статуса;
- постановщика;
- исполнителя;
- оценки;
- затраченного времени;
- work items;
- связей parent/subtask;
- пользователей.

### 9.2 Важные поля YouTrack

Используются:

- `idReadable`;
- `summary`;
- Project;
- `Система`;
- `Спринт`;
- `Type`;
- `Priority`;
- `State`;
- Reporter / `Постановщик`;
- `Assignee`;
- `Оценка`;
- `Затраченное время`;
- `Parent for` / `Subtask of`.

### 9.3 Work items

Для финансового факта главным источником являются work items.

Агрегированное поле `Затраченное время` можно использовать как контрольную сумму, но не как основной источник личных отчётов.

### 9.4 Передача плана в YouTrack

После фиксации плана СПО передаёт в YouTrack:

- основного исполнителя задачи;
- добавление задачи в sprint/agile board;
- плановый спринт в custom field;
- плановые часы в custom field;
- тег `SPO planned`.

На первой версии не требуется:

- добавлять комментарий;
- менять статус задачи.

---

## 10. Планирование

Спринт = календарный месяц.

При создании периода указывается:

- месяц;
- год;
- рабочие часы месяца;
- резерв на внеплановые задачи, по умолчанию 30%;
- список сотрудников;
- проценты тестирования, отладки и управления;
- проекты, системы, приоритеты.

Доступные часы сотрудника:

```text
Доступные часы = Рабочие часы месяца × (1 - Резерв)
```

Отладка добавляется к часам разработчика.

Тестирование и управление при планировании считаются по направлению, а не по конкретному человеку.

Цветовая индикация:

- зелёная зона — нормальная загрузка;
- жёлтая зона — близко к пределу;
- красная зона — перегруз.

Приоритетные задачи:

- `Blocker`;
- `High`.

Они должны подсвечиваться красной рамкой.

---

## 11. Отчётность

### 11.1 Итоговый отчёт периода

В итоговый отчёт попадают:

- все задачи плана;
- все задачи, по которым были work items в периоде.

Задачи должны иметь признак:

- запланирована;
- внеплановая.

Фильтры:

- система;
- проект;
- приоритет;
- тип;
- статус;
- запланированность;
- исполнитель;
- постановщик;
- поиск по тексту/номеру.

Сортировка должна быть серверной.

Для больших таблиц использовать:

- серверную пагинацию;
- серверную фильтрацию;
- серверную сортировку;
- virtual scrolling на frontend.

### 11.2 Materialized report tables

Итоговые и личные отчёты не строить каждый раз из сырых данных.

После загрузки факта и после изменения оценок пересчитывать и сохранять:

- строки итогового отчёта;
- строки личных отчётов;
- агрегаты периода;
- агрегаты по системам;
- агрегаты по проектам;
- агрегаты по типам;
- агрегаты по признаку запланированности.

Пересчёт отчётов выполнять асинхронно через очередь.

### 11.3 Бизнес-группировка

Бизнес-отчёт может группировать задачи по уровню:

- Эпик;
- Фича;
- История;
- Задача.

По умолчанию используется уровень `История`.

Если задача имеет родителя нужного уровня, в бизнес-отчёте показывается родительская сущность, а часы и суммы агрегируются по дочерним задачам.

Если у задачи нет родителя нужного уровня, она отображается как есть.

Оценка бизнеса должна быть привязана к:

- периоду;
- отображаемой бизнес-сущности;
- уровню группировки.

---

## 12. Финансы

### 12.1 Ставка

Сотруднику задаётся договорённая сумма ЗП на руки в месяц.

Базовая часовая ставка рассчитывается так:

```text
Годовой доход = ЗП на руки в месяц × 12
Часовая ставка = Годовой доход / рабочие часы в году
```

Ставки имеют историю действия.

Ставка применяется по расчётному месяцу.

### 12.2 Оценка бизнеса

Оценки бизнеса:

- Нет пользы — 0%;
- Прямая выгода — 10%, значение по умолчанию;
- Польза очевидна — 20%.

### 12.3 Оценка руководителя

Оценки руководителя:

- Плохо — 0%;
- Удовлетворительно — 10%;
- Хорошо — 20%, значение по умолчанию;
- Отлично — 30%.

### 12.4 Эффективная ставка

Эффективная ставка рассчитывается на основе:

- базовой ставки сотрудника;
- базового процента;
- процента оценки руководителя;
- процента оценки бизнеса;
- налоговых и дополнительных формул, если применимо.

Точные формулы должны храниться в конфигураторе формул.

В первой версии используется безопасный конфигуратор без произвольного кода.

### 12.5 Плановая себестоимость тестирования и управления

Так как при планировании тестирование и управление назначаются на направление, а не на конкретного сотрудника, плановую себестоимость этих направлений считать по средней активной ставке сотрудников соответствующей рабочей роли в данном периоде.

Если сотрудников роли нет, отображать предупреждение и не считать стоимость направления до исправления настроек.

---

## 13. Пользователи

Пользователи импортируются из YouTrack/Hub.

Если пользователь удалён или заблокирован в YouTrack/Hub:

- в СПО он не удаляется автоматически;
- он помечается как неактивный/уволенный;
- по нему сохраняются отчёты.

Физическое удаление пользователя разрешено только если у него нет:

- ставок;
- work items;
- оценок;
- личных отчётов;
- закрытых периодов;
- audit-событий, критичных для истории.

Иначе разрешено только мягкое удаление.

---

## 14. Workflow периода

Рекомендуемый жизненный цикл периода:

```text
PLANNING
→ PLAN_FIXED
→ IN_PROGRESS
→ FACT_LOADED
→ MANAGER_EVALUATION
→ BUSINESS_EVALUATION
→ DIRECTOR_REVIEW
→ CLOSED
```

Директор может переоткрыть закрытый период:

```text
CLOSED → REOPENED → DIRECTOR_REVIEW → CLOSED
```

Все переходы состояния должны логироваться.

После закрытия периода отчёты должны быть заморожены.

---

## 15. Экспорт

Нужны экспорты:

- итоговый отчёт периода → Excel;
- личный отчёт сотрудника → Excel/PDF;
- журнал изменений → Excel;
- план спринта → Excel;
- JSON для возможной интеграции с бухгалтерскими системами.

Экспорт больших отчётов выполнять асинхронно через очередь.

---

## 16. Правила работы ИИ-агентов

### 16.1 Общие правила

1. Перед началом новой сессии читать `context.md`.
2. Проверять актуальные документы `spo_tz_v2.md`, `specification_v2.md`, `architecture_v2.md`.
3. Не менять архитектурные решения без явной фиксации в `context.md`.
4. После существенного изменения обновлять `context.md`.
5. Не использовать `Float` для финансовых и временных расчётов.
6. Не писать бизнес-логику в controllers.
7. Не обращаться к Prisma из controllers.
8. Не обходить RBAC/ABAC.
9. Не логировать секреты.
10. Для критичных событий использовать outbox.
11. Для закрытых периодов использовать snapshots.
12. Для отчётов использовать materialized report tables.
13. Все новые API endpoints должны быть отражены в спецификации.
14. Все новые сущности БД должны быть отражены в Prisma schema и документации.
15. Все изменения, влияющие на безопасность, финансы или отчётность, должны фиксироваться в этом файле.

### 16.2 Что считается существенным апдейтом

Существенным апдейтом считается:

- создан новый модуль;
- изменена архитектура;
- изменена Prisma schema;
- изменены финансовые формулы;
- изменены правила доступа;
- изменён workflow периода;
- реализована интеграция с YouTrack;
- изменён формат отчётов;
- изменён алгоритм расчёта зарплаты;
- изменён алгоритм расчёта себестоимости;
- изменена модель безопасности;
- добавлен новый внешний сервис;
- выполнен крупный этап разработки;
- обнаружен важный риск или технический долг.

После каждого такого изменения нужно обновить разделы:

- `Текущий статус разработки`;
- `Журнал изменений контекста`;
- при необходимости `Открытые вопросы`;
- при необходимости `Технический долг и риски`.

---

## 17. Рекомендуемый порядок разработки

### Этап 1. Каркас проекта

- Создать monorepo.
- Настроить backend NestJS.
- Настроить frontend Next.js.
- Настроить shared package.
- Настроить Docker Compose.
- Настроить PostgreSQL.
- Настроить Redis.
- Настроить базовый CI.

### Этап 2. База и безопасность

- Реализовать Prisma schema.
- Реализовать миграции.
- Реализовать LDAP/AD login.
- Реализовать JWT + refresh rotation.
- Реализовать RBAC.
- Реализовать ABAC policies.
- Реализовать audit log.
- Реализовать encrypted secrets storage.

### Этап 3. Интеграция с YouTrack

- Настройки подключения.
- Проверка подключения.
- Синхронизация пользователей.
- Синхронизация задач.
- Синхронизация work items.
- Синхронизация иерархии.
- Журнал синхронизации.
- Передача плана в YouTrack.

### Этап 4. Планирование

- Создание периода.
- Настройки периода.
- Бэклог.
- Drag-and-drop.
- Расчёт мощности.
- Цветовая индикация.
- Фиксация плана.
- Версии плана.
- Журнал изменений плана.

### Этап 5. Отчётность и финансы

- Загрузка факта.
- Materialized report tables.
- Личный отчёт.
- Итоговый отчёт.
- Оценки руководителя.
- Оценки бизнеса.
- Расчёт ЗП.
- Расчёт себестоимости.
- Закрытие периода.
- Snapshots.

### Этап 6. Экспорт и уведомления

- Email templates.
- Notification settings.
- Очередь уведомлений.
- Excel export.
- PDF export.
- JSON export.
- История уведомлений.

### Этап 7. Тестирование и стабилизация

- Unit tests.
- Integration tests.
- E2E tests.
- Performance tests.
- Security review.
- Backup/restore test.
- Pilot run на одном периоде.

---

## 18. Технический долг и риски

### 18.1 Текущие риски

1. Сложность финансовых расчётов и необходимость точного snapshot закрытых периодов.
2. Возможные ограничения YouTrack API по скорости и пагинации.
3. Сложность корректной бизнес-группировки задач.
4. Высокая нагрузка на итоговые отчёты при большом количестве задач.
5. Риск ошибок доступа при совмещении нескольких ролей.
6. Риск расхождения данных СПО и YouTrack.
7. Сложность настройки LDAP/AD в конкретной инфраструктуре.

### 18.2 Меры снижения рисков

1. Все финансовые расчёты покрывать unit tests с контрольными примерами.
2. Использовать transactional outbox.
3. Использовать idempotency keys для фоновых операций.
4. Использовать materialized report tables.
5. Использовать серверные фильтры и пагинацию.
6. Делать sync logs детальными.
7. Все права проверять на backend.
8. Секреты хранить зашифрованно.
9. Закрытые периоды не пересчитывать из живых данных.
10. Проводить пилот на одном месяце перед продуктивным запуском.

---

## 19. Открытые вопросы

На текущий момент открытые вопросы для дальнейшего уточнения:

1. Точные названия и ID custom fields YouTrack в продуктивном инстансе.
2. Точные значения статусов YouTrack, которые считаются завершёнными/незавершёнными.
3. Финальные значения процентов тестирования, отладки и управления по умолчанию.
4. Финальные формулы налогов, страховых взносов и резерва отпускных.
5. Конкретный SMTP-сервер для email-уведомлений.
6. Конкретные LDAP параметры подключения.
7. Требования к срокам хранения логов синхронизации и audit log.
8. Требования к backup retention.
9. Объёмы данных: примерное количество задач, work items и пользователей в месяц.
10. Нужна ли интеграция с бухгалтерской системой после экспорта JSON.

---

## 20. Журнал изменений контекста

| Версия | Дата | Автор | Изменения |
|---|---|---|---|
| 1.0 | 2026-04-27 | ChatGPT | Создан стартовый файл контекста для ИИ-агентов. Зафиксированы текущие документы, архитектурные решения, прогресс, правила разработки, риски и рекомендуемый порядок реализации. |
| 2.0 | 2026-04-27 | Team Lead | Part 5 (YouTrack Integration) — завершён. Part 6 (Sprint Planning) — core завершён: domain entities, value objects, capacity calculator, use cases, Prisma repositories, controller (85 files). Обновлён plan.md. |
| 3.0 | 2026-04-27 | Team Lead | Part 3 (Security, Auth, RBAC/ABAC, Audit) — core завершён: RefreshSession/LoginAttempt entities, AuthDomainService, AccessControlService (RBAC+ABAC), JwtService, AuditLogger, EncryptionService (AES-256-GCM), Guards (JwtAuth, Roles), Helmet, rate limit. 198 files, build без ошибок. |
| 4.0 | 2026-04-27 | Team Lead | Part 4 (Administration and Dictionaries) — core завершён: EmployeeProfile, EmployeeRate, FormulaConfig, EvaluationScale, WorkRole, PlanningSettings entities + 15 use cases + 11 admin endpoints + 6 Prisma repositories. 245 files, build без ошибок. |
| 5.0 | 2026-04-27 | Team Lead | Part 7 (Period Workflow, Fact Loading, Report Recalculation) — core завершён: PersonalReport/SummaryReport/ManagerEvaluation/BusinessEvaluation entities, ReportCalculator, FactLoadedEvent, 11 use cases (LoadFact, GeneratePersonalReports, GenerateSummaryReport, evaluations, transitions), ReportingController (11 endpoints), WorkflowController (4 endpoints). 278 files, build без ошибок. |

| 6.0 | 2026-04-27 | Team Lead | Part 8 (Finance, Evaluations, Cost Calculation) — core завершён: SalaryCalculator, EffectiveRateCalculator, TaxCalculator, CostCalculator, ManagerEvaluation/BusinessEvaluation APIs, personal report recalculation, planned/actual/remaining cost. |

| 7.0 | 2026-04-27 | Team Lead | Part 9 (Period Closing, Snapshots, Reopen) — core завершён: close/reopen use cases, snapshot entities (rates, formulas, scales, work items, issues, hierarchy, report lines, aggregates), read-only guards for closed periods, audit for close/reopen. |

| 8.0 | 2026-04-27 | Team Lead | Part 10 (Notifications and Export) — core завершён: SMTP settings, notification templates/queue/history, Excel/PDF/JSON export services, async export jobs with download links. |

| 9.0 | 2026-04-27 | Team Lead | Part 11 (Performance, Security, Backup, Operations) — реализованы: backup.sh, restore.sh, RetentionService + RetentionCronService + RetentionController, production docker-compose.prod.yml (PostgreSQL, Redis, Backend, Nginx, Backup), deployment-guide.md, runbook.md, performance-test-checklist.md, regression-test-checklist.md (80 тест-кейсов по 9 модулям). Plan.md обновлён. |

| 10.0 | 2026-04-27 | Team Lead | Part 3 (Frontend) — Login page и route protection завершены: Login.tsx (форма логина, валидация, loading/error states), useAuth hook (login, logout, auto-refresh), ProtectedRoute компонент, api.ts (fetch wrapper с авто-прикреплением Bearer token и refresh на 401), AppLayout использует реальные данные пользователя и роли. Build — без ошибок. |

| 11.0 | 2026-04-27 | Team Lead | Part 6 (Frontend) — Экран планирования интегрирован с реальным API: создан usePlanning hook (React Query: периоды, бэклог, capacity, назначения, фиксация плана, версии, переходы), Planning.tsx переведён с моков на API-вызовы, функции remainingEstimate/effectiveEstimate/effectiveSpent/getSubtasks/isSubtaskOf перенесены из planningMock в planning.ts (lib), сохранены dnd-kit drag-and-drop, фильтры, load-zone индикация. Build — без ошибок. |

| 12.0 | 2026-04-27 | Team Lead | Part 7 (Frontend) — Страница отчётов интегрирована с реальным API: создан useReports hook (React Query: summary report, personal report, statistics, manager/business evaluations, recalculate), Reports.tsx переведён с моков на API-вызовы с тремя табами (личный/команда/компания), селектор периода и сотрудников, оценка руководителя и бизнеса. Build — без ошибок. |

| 2.0 | 2026-04-27 | TeamLead | Part 1 (Project Setup) завершён: monorepo, NestJS, health endpoint, shared package, Docker Compose, ESLint/Prettier, README. Part 2 (Database) завершён: полная Prisma-схема (без Float), Value Objects (Money, Minutes, Percentage, HourlyRate), User Entity, User Repository, PrismaUserRepository, seed данных, Prisma client генерация. Проект компилируется (`npm run build` — 37 файлов без ошибок). plan.md обновлён. |


---

## Обновление от 2026-04-27: plan.md переведён в чекбокс-формат

Файл `plan.md` обновлён до версии 2.0 и переведён в формат markdown-чекбоксов со структурой:

1. `Completed`
2. `In Progress`
3. `TODO`
4. `Blocked`
5. `Testing Needed`

План сохраняет поэтапную реализацию СПО для команды ИИ-агентов, но теперь его можно использовать как рабочий task tracker.
Текущее состояние: проект находится на подготовке к **Part 1 — Project Setup and Base Infrastructure**.

Правило: после выполнения задач агенты должны отмечать чекбоксы в `plan.md` и обновлять `context.md` при существенных изменениях.
