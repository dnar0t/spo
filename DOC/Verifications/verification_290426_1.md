# Проверка реализации СПО по документам DOC

**Файл:** `verification_290426_1.md`  
**Дата проверки:** 29.04.2026  
**Проверяемый архив:** `spo-main.zip`  
**Область проверки:** документы `spo-main/DOC/**` и реализация `spo-main/**`

## 1. Использованные документы

В ходе проверки были просмотрены основные документы проекта:

- `DOC/TZ/spo_tz_v2.md` — техническое задание и критерии приемки верхнего уровня.
- `DOC/ARC/context.md` — текущий контекст, статус разработки, приоритеты истинности и текущие риски.
- `DOC/ARC/plan.md` — план разработки и чек-листы завершения частей.
- `DOC/ARC/architecture_v2.md` — архитектурные правила: Clean Architecture + DDD, модульный монолит, Transactional Outbox, snapshots, RBAC/ABAC, требования к данным.
- `DOC/ARC/specification_v2.md` — API, модель данных, workflow, формулы, экспорт, тестирование.
- `DOC/security-review/security-review.md` — требования и замечания по безопасности.
- `DOC/qa/regression-test-checklist.md`, `DOC/qa/performance-test-checklist.md` — ожидаемые проверки.
- `DOC/ops/deployment-guide.md`, `DOC/ops/runbook.md` — эксплуатационные требования.

## 2. Краткий вывод

Реализация находится в состоянии **расширенного прототипа / черновой интеграции**, но **не готова к приемке первой версии** по критериям ТЗ.

В проекте действительно есть значительная часть требуемой структуры: backend на NestJS, фронтенд на React/Vite, Prisma-схема v2, доменные сущности, value objects, use cases, контроллеры, YouTrack-клиент, экспорт, уведомления, табели, документация по эксплуатации.

Однако обнаружены критичные расхождения:

1. Backend с высокой вероятностью **не собирается** из-за использования TypeScript `interface` как runtime DI-токенов NestJS.
2. RBAC фактически неработоспособен: `JwtAuthGuard` не добавляет роли в `request.user`, а `RolesGuard` проверяет именно `request.user.roles`.
3. Часть security-sensitive endpoint'ов YouTrack не защищена guards.
4. В проекте одновременно существуют две Prisma-схемы, одна из которых устаревшая и конфликтует с seed/реализацией.
5. Transactional Outbox заявлен в архитектуре, но критичные события публикуются через in-process EventBus без записи в outbox в одной транзакции.
6. Frontend в значительной части продолжает использовать mock-данные и не является полноценной интеграцией с backend.
7. Глобальная обертка ответов backend `{ success, data }` не согласована с frontend API-клиентом.
8. Закрытие периода и snapshot реализованы неполно: work items, issues и hierarchy сохраняются пустыми.
9. Финансовые группировки по проектам/системам содержат заглушки `UNKNOWN` и TODO.
10. Тестовое покрытие не соответствует заявленной регрессионной и приемочной стратегии.

## 3. Положительные результаты

### 3.1 Архитектурный каркас в целом соответствует выбранному стилю

В backend есть разделение на слои:

- `domain/entities`, `domain/value-objects`, `domain/services`, `domain/repositories`;
- `application/*/use-cases`, `application/*/dto`, `application/*/ports`;
- `infrastructure/*`;
- `presentation/controllers`, guards, filters, interceptors, pipes.

Это соответствует заявленному Clean Architecture + DDD подходу.

### 3.2 Есть расширенная Prisma-схема v2

Файл `packages/backend/src/infrastructure/prisma/prisma/schema.prisma` содержит большинство сущностей, требуемых документами: users, roles, employee profiles, reporting periods, sprint plans, planned tasks, YouTrack issues, work items, reports, evaluations, finance settings, outbox, audit, period snapshots, refresh sessions, login attempts, timesheets.

### 3.3 Числовые типы в основной Prisma-схеме в основном соответствуют требованиям

В основной v2-схеме деньги, часы и проценты представлены через `Int`: копейки, минуты, basis points. Это соответствует архитектурному запрету на `Float` для денег, ставок, процентов и часов.

### 3.4 Есть value objects для финансовой и временной арифметики

Найдены `Money`, `Minutes`, `Percentage`, `HourlyRate`. Это правильное направление для устранения ошибок округления и соблюдения инвариантов.

### 3.5 Есть зачатки production-механизмов

В проекте присутствуют:

- global exception filter;
- response wrapper interceptor;
- request logging interceptor;
- validation pipe;
- helmet;
- refresh token rotation;
- AES-256-GCM encryption service;
- audit log;
- export jobs;
- retention service;
- backup/restore scripts;
- deployment guide и runbook.

## 4. Критичные замечания

### CR-01. Backend, вероятно, не компилируется из-за DI-токенов на TypeScript interfaces

**Файлы:**

- `packages/backend/src/infrastructure/auth/auth.module.ts`
- `packages/backend/src/application/auth/ports/*.ts`
- аналогичные места, где интерфейсы используются в `provide`/`inject`

В `auth.module.ts` импортируются `IJwtService`, `ILdapAuthAdapter`, `IAuditLogger`, `IEncryptionService` как TypeScript interfaces и затем используются как runtime-значения в `providers` и `exports`:

```ts
provide: IJwtService
provide: ILdapAuthAdapter
provide: IAuditLogger
provide: IEncryptionService
```

Но TypeScript interfaces исчезают при компиляции и не могут быть DI-токенами NestJS. Это должно давать ошибку уровня:

```text
'IJwtService' only refers to a type, but is being used as a value here.
```

**Риск:** приложение не собирается или не стартует.

**Рекомендация:** заменить interfaces в DI на runtime-токены:

```ts
export const JWT_SERVICE = Symbol('JWT_SERVICE');
export const LDAP_AUTH_ADAPTER = Symbol('LDAP_AUTH_ADAPTER');
export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');
export const ENCRYPTION_SERVICE = Symbol('ENCRYPTION_SERVICE');
```

Либо использовать abstract classes как DI tokens. После исправления обязательно запустить `npm run build`, `npm run test`.

---

### CR-02. RBAC фактически не работает: роли не попадают в `request.user`

**Файлы:**

- `packages/backend/src/presentation/guards/jwt-auth.guard.ts`
- `packages/backend/src/presentation/guards/roles.guard.ts`
- `packages/backend/src/application/auth/use-cases/login.use-case.ts`

`JwtAuthGuard` кладет в `request.user` только:

```ts
{
  id: payload.sub,
  login: payload.login,
  sessionId: payload.sessionId,
}
```

`RolesGuard` проверяет:

```ts
const userRoles: string[] = user.roles ?? [];
```

При этом в `LoginUseCase` роли явно оставлены пустыми:

```ts
const roles: string[] = [];
```

**Последствие:** все endpoint'ы с `@Roles(...)` будут возвращать 403 даже для администратора/директора, потому что `user.roles` отсутствует или пустой массив.

**Рекомендация:**

1. Загружать роли пользователя в `JwtAuthGuard` из БД по `payload.sub`, либо включать роли в access token и валидировать актуальность сессии.
2. Убрать заглушку `const roles: string[] = []` в login flow.
3. Добавить интеграционные тесты:
   - admin проходит на `/api/admin/users`;
   - employee получает 403;
   - director проходит на разрешенные endpoint'ы;
   - роли в нижнем/верхнем регистре обрабатываются единообразно.

---

### CR-03. Несогласованный регистр ролей ломает часть endpoint'ов

**Файл:** `packages/backend/src/presentation/controllers/auth.controller.ts`

В большинстве контроллеров используются роли в нижнем регистре:

```ts
@Roles('admin', 'director')
```

Но в `auth.controller.ts` для `test-ldap` указано:

```ts
@Roles('ADMIN')
```

Seed создает роли в нижнем регистре: `admin`, `director`, `manager`, `employee`, `business`, `accountant`, `viewer`.

**Последствие:** даже после исправления загрузки ролей endpoint `/api/auth/test-ldap` останется недоступным для роли `admin`.

**Рекомендация:** унифицировать роли через enum/const из shared package. Не использовать строковые литералы вручную.

---

### CR-04. YouTrackController не защищен авторизацией

**Файл:** `packages/backend/src/presentation/controllers/youtrack.controller.ts`

Контроллер объявлен так:

```ts
@Controller('youtrack')
export class YouTrackController
```

Несмотря на импорт `UseGuards`, на классе и методах нет `@UseGuards(JwtAuthGuard, RolesGuard)` и нет `@Roles(...)`.

Открыты операции:

- статус интеграции;
- тест подключения;
- запуск синхронизации;
- просмотр sync-runs;
- просмотр задач;
- статистика.

**Риск:** любой неавторизованный клиент может дергать интеграцию, смотреть данные и запускать синхронизации.

**Рекомендация:** добавить guards и роли:

- `status`, `sync-runs`, `issues`, `stats` — минимум authenticated, лучше admin/director/manager/viewer по матрице;
- `test-connection`, `sync` — только admin/director/integration-admin;
- проверить, что секреты YouTrack не возвращаются в ответах.

---

### CR-05. Две Prisma-схемы создают риск несовместимой БД и сломанного seed

**Файлы:**

- `packages/backend/prisma/schema.prisma`
- `packages/backend/src/infrastructure/prisma/prisma/schema.prisma`
- `packages/backend/package.json`
- `packages/backend/prisma/seed.ts`

В проекте есть две разные Prisma-схемы:

1. Устаревшая минимальная: `packages/backend/prisma/schema.prisma` с `User.password`, `PlanningPeriod`, `Report`.
2. Основная v2: `packages/backend/src/infrastructure/prisma/prisma/schema.prisma` с полной моделью СПО.

Скрипты `prisma:generate` и migrations используют v2-схему:

```json
"prisma:generate": "prisma generate --schema=src/infrastructure/prisma/prisma/schema.prisma"
```

Но `prisma.seed` запускает `prisma/seed.ts`, который импортирует `@prisma/client`. Если клиент был сгенерирован не по той схеме или разработчик запустит Prisma из стандартного пути, seed и код могут разойтись.

**Риск:** нестабильная разработка, случайные миграции из устаревшей схемы, невозможность воспроизвести БД.

**Рекомендация:**

1. Оставить одну Prisma-схему в стандартном месте `packages/backend/prisma/schema.prisma`, либо жестко документировать и удалить устаревшую.
2. Перенести v2-схему в стандартный путь или удалить минимальную.
3. Добавить CI-проверку `prisma validate --schema=...`, `prisma generate`, `prisma migrate deploy`.

---

### CR-06. В основной схеме нет migration history

В `packages/backend` не найден каталог `prisma/migrations` для v2-схемы.

Документы требуют миграционную стратегию и production deployment с применением миграций. Текущее состояние больше похоже на schema-first прототип без воспроизводимых миграций.

**Риск:** нельзя надежно поднять production/staging БД и отследить эволюцию схемы.

**Рекомендация:** создать начальную migration для v2-схемы, проверить `prisma migrate deploy` на чистой БД, добавить это в CI/CD.

---

### CR-07. Глобальная обертка ответов backend не согласована с frontend

**Файлы:**

- `packages/backend/src/presentation/interceptors/response-wrapper.interceptor.ts`
- `spo-front/src/lib/api.ts`
- `spo-front/src/hooks/*`

Backend глобально оборачивает все успешные ответы в формат:

```ts
{
  success: true,
  data: originalResponse,
}
```

Frontend API-клиент в `spo-front/src/lib/api.ts` возвращает `response.json()` напрямую и хуки типизируют ответ как исходные DTO:

```ts
api.get<PaginatedResult<PlanningPeriodDto>>(...)
api.get<AdminDictionariesDto>(...)
api.get<FinanceTotalsDto>(...)
```

То есть frontend ожидает `PaginatedResult`, а backend фактически вернет `{ success, data: PaginatedResult }`.

**Последствие:** интегрированные frontend-страницы будут получать данные не в том формате: `response.data` окажется внутри `response.data`, таблицы и формы будут работать некорректно.

**Рекомендация:** выбрать единый контракт:

- либо frontend API-клиент должен распаковывать `json.data`;
- либо убрать global wrapper;
- либо типизировать `ApiResponse<T>` и использовать его везде.

---

### CR-08. Transactional Outbox заявлен, но не реализован как транзакционный механизм

**Файлы:**

- `packages/backend/src/infrastructure/event-bus.service.ts`
- `packages/backend/src/application/planning/use-cases/fix-plan.use-case.ts`
- `packages/backend/src/infrastructure/prisma/prisma/schema.prisma`

В схеме есть `OutboxMessage`, но в коде нет сервиса, который записывает outbox-сообщение в БД в одной транзакции с бизнес-изменением.

`FixPlanUseCase` сначала сохраняет SprintPlan, затем публикует событие через in-process EventBus, затем сохраняет transition и period:

```ts
await this.sprintPlanRepository.save(sprintPlan);
await this.eventBus.publish(event);
await this.periodTransitionRepository.save(transition);
await this.reportingPeriodRepository.update(period);
```

Это не Transactional Outbox. При сбое между шагами можно получить частично примененное состояние.

**Риск:** потеря критичных событий, несогласованность плана и выгрузки в YouTrack, невозможность надежного retry.

**Рекомендация:**

1. Ввести Unit of Work / transaction boundary на use case.
2. Записывать `OutboxMessage` в той же транзакции, что и period/sprintPlan/transition.
3. Обработку outbox вынести в worker с retry, status, maxRetries, error.
4. In-process EventBus оставить только для некритичных локальных событий или заменить публикацией из outbox.

---

### CR-09. YouTrackController нарушает Clean Architecture

**Файл:** `packages/backend/src/presentation/controllers/youtrack.controller.ts`

Контроллер напрямую инжектит infrastructure-сервисы:

```ts
SyncEngine
YouTrackApiClient
PrismaService
```

И напрямую читает Prisma:

```ts
this.prisma.integrationSettings.findFirst()
```

Документы требуют, чтобы controllers не содержали бизнес-логики и не имели прямого Prisma-доступа.

**Рекомендация:** вынести операции в application use cases:

- `GetYouTrackStatusUseCase`
- `TestYouTrackConnectionUseCase`
- `RunYouTrackSyncUseCase`
- `GetSyncRunsUseCase`
- `GetYouTrackIssuesUseCase`
- `GetYouTrackStatsUseCase`

Контроллер должен только валидировать DTO, вызывать use case и возвращать результат.

---

### CR-10. Frontend в значительной части работает на mock-данных

**Файлы:**

- `spo-front/src/data/*Mock.ts`
- `spo-front/src/pages/Planning.tsx`
- `spo-front/src/pages/Finance.tsx`
- `spo-front/src/pages/Timesheets.tsx`
- `spo-front/src/pages/Users.tsx`
- `spo-front/src/pages/Audit.tsx`
- `spo-front/src/lib/finance.ts`

Найдены активные импорты mock-данных:

```ts
@/data/planningMock
@/data/timesheetsMock
@/data/salaryMock
@/data/adminMock
@/data/periodCloseMock
@/data/planSnapshotMock
```

Например, `Planning.tsx` импортирует типы из `planningMock`, а другие страницы импортируют не только типы, но и данные.

**Последствие:** UI может выглядеть готовым, но не подтверждает выполнение требований ТЗ: синхронизация YouTrack, реальные задачи, реальные ставки, реальные табели, реальные отчеты и реальные права доступа.

**Рекомендация:**

1. Разделить mock-демо и production UI.
2. Для production убрать runtime-зависимость от `src/data/*Mock.ts`.
3. Все основные страницы подключить к backend hooks/API.
4. Добавить e2e-проверку, что данные приходят с backend.

---

### CR-11. Авторизация frontend небезопасно хранит refresh token в localStorage

**Файл:** `spo-front/src/lib/auth.ts`

Refresh token сохраняется в `localStorage`:

```ts
localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
```

Документы требуют усиленной безопасности токенов, refresh token rotation и защиту сессий. Хранение refresh token в localStorage повышает риск компрометации при XSS.

**Рекомендация:**

- для production использовать httpOnly Secure SameSite cookie для refresh token;
- access token держать короткоживущим в памяти;
- добавить CSRF-стратегию, если refresh идет через cookie;
- усилить CSP.

---

### CR-12. Snapshot закрытого периода неполный

**Файл:** `packages/backend/src/application/planning/use-cases/create-snapshot.use-case.ts`

В snapshot пустыми сохраняются критичные данные:

```ts
workItems: { items: [] },
issues: { items: [] },
issueHierarchy: { items: [] },
```

По ТЗ и архитектуре snapshot закрытого периода должен фиксировать состояние задач, work items, иерархии, ставок, формул, шкал, строк отчетов и агрегатов.

**Риск:** закрытый период нельзя будет полноценно восстановить и доказать неизменность расчета.

**Рекомендация:** добавить сбор:

- YouTrackIssue по задачам периода;
- WorkItem по периоду;
- parent/subtask hierarchy;
- фактические значения полей YouTrack на момент закрытия;
- версии ставок и формул на дату периода.

---

### CR-13. Финансовая аналитика по системам/проектам содержит заглушки

**Файлы:**

- `packages/backend/src/application/finance/use-cases/get-period-by-system.use-case.ts`
- `packages/backend/src/application/finance/use-cases/get-period-by-project.use-case.ts`
- `packages/backend/src/application/finance/use-cases/get-period-groups.use-case.ts`

В коде явно указано, что реализация неполная:

```ts
// TODO: Полная реализация требует получения иерархии issue
const systemName = 'UNKNOWN';
```

Это противоречит требованиям по итоговой отчетности, бизнес-группировке, группировке по системам/проектам и финансовым агрегатам.

**Рекомендация:** реализовать `YouTrackIssueRepository` / read model для иерархии задач и использовать его в finance/reporting use cases.

---

### CR-14. `FreezeFinancialsUseCase` не замораживает данные в persistence

**Файл:** `packages/backend/src/application/finance/use-cases/freeze-financials.use-case.ts`

В коде есть TODO:

```ts
// TODO: Установить флаг frozen в persistence
```

Фактически use case собирает ID и пишет audit, но не изменяет состояние отчетов/строк.

**Риск:** финансовые данные можно изменить после freeze, что нарушает требования по закрытию периода и воспроизводимости расчетов.

**Рекомендация:** добавить явное поле/состояние заморозки и persistence update в транзакции. Проверить запрет изменения через use cases и репозитории.

---

### CR-15. Реальная LDAP/LDAPS-аутентификация не реализована

**Файл:** `packages/backend/src/infrastructure/auth/ldap-mock.adapter.ts`

Используется `LdapMockAdapter`, в mock-режиме пароль считается валидным, если не пустой. В реальном режиме указана placeholder/pass-through логика.

**Риск:** критерий приемки по AD/LDAP не выполнен. Нельзя считать auth production-ready.

**Рекомендация:** реализовать реальный LDAPS adapter:

- service account bind;
- безопасный search по `sAMAccountName`/`userPrincipalName`;
- escaping LDAP filter;
- user bind для проверки пароля;
- запрет plain LDAP в production;
- таймауты, audit, rate limit.

---

### CR-16. CORS в production небезопасен

**Файл:** `packages/backend/src/main.ts`

Сейчас указано:

```ts
app.enableCors({
  origin: true,
  credentials: true,
});
```

Это удобно для dev, но не соответствует production security checklist.

**Рекомендация:** вынести allowlist в env:

```ts
origin: configService.get('CORS_ORIGINS').split(',')
```

И запретить wildcard/reflect origin в production.

---

### CR-17. JWT/Encryption secrets имеют dev fallback вместо fail-fast production поведения

**Файлы:**

- `packages/backend/src/infrastructure/auth/jwt.service.ts`
- `packages/backend/src/infrastructure/auth/encryption.service.ts`

В security-review это уже помечено как риск. В production приложение должно не просто логировать warning, а падать при отсутствии `JWT_SECRET`/`ENCRYPTION_KEY`.

**Рекомендация:** добавить env validation при старте приложения. Для `NODE_ENV=production` отсутствие секретов должно блокировать запуск.

---

### CR-18. Не найден CI/CD workflow

В архиве не найден `.github/workflows/ci-cd.yml`, хотя архитектура и спецификация описывают CI/CD pipeline.

**Рекомендация:** добавить CI:

- install;
- lint;
- typecheck;
- backend build;
- frontend build;
- prisma validate/generate;
- unit tests;
- regression tests;
- docker build.

---

### CR-19. Тестовое покрытие не соответствует документам

Найдено очень мало тестов:

- backend: один regression spec `closed-report-immutability.spec.ts`;
- frontend: пример `expect(true).toBe(true)`.

В `DOC/qa/regression-test-checklist.md` описаны десятки сценариев: auth, RBAC, ABAC, admin, YouTrack, planning, reporting, finance, close, notifications, export.

При этом backend regression spec частично проверяет не production use case, а локальную имитацию guard-логики внутри теста.

**Рекомендация:** приоритизировать тесты:

1. smoke build/start;
2. auth + RBAC;
3. YouTrack guards;
4. planning fix plan;
5. load fact;
6. close period snapshot immutability;
7. export jobs;
8. frontend integration tests на unwrap API response.

---

### CR-20. Несовпадение заявленного статуса в `context.md`/`plan.md` с фактическим кодом

В документах много частей отмечено как завершенные: Security, Admin, Reporting, Finance, Period Closing, Notifications, Export, Performance/Security/Ops.

По коду видны незавершенные TODO, заглушки, mock-данные и потенциальные compile/runtime ошибки. Это создает риск ложного статуса проекта.

**Рекомендация:** обновить `context.md` и `plan.md`: вернуть спорные пункты в `In Progress` или `Testing Needed`, отдельно отметить блокеры и технический долг.

## 5. Замечания средней важности

### M-01. Backend и frontend живут как два независимых проекта

Root `package.json` включает workspaces только:

```json
"packages/backend",
"packages/shared"
```

`spo-front` не включен в root workspace. Это усложняет единый CI, dependency audit и сборку всего продукта.

**Рекомендация:** либо включить `spo-front` в monorepo workspace, либо явно документировать отдельный lifecycle и добавить отдельный CI job.

---

### M-02. API base URL во frontend захардкожен

**Файл:** `spo-front/src/lib/api.ts`

```ts
const API_BASE_URL = 'http://localhost:3001/api';
```

**Рекомендация:** использовать `VITE_API_BASE_URL` с dev fallback.

---

### M-03. Используются строковые роли и состояния вместо единого shared-контракта

В backend и frontend много строковых литералов ролей/статусов. Это уже привело к проблеме `ADMIN` vs `admin`.

**Рекомендация:** вынести роли, состояния периода, типы оценок и статусы табеля в `@spo/shared` и использовать их в backend/frontend.

---

### M-04. Сгенерированные `.js`, `.d.ts`, `.js.map` лежат в `src`

В `packages/backend/src` и `packages/shared/src` обнаружены сгенерированные файлы рядом с TypeScript-исходниками.

**Риск:** шум в репозитории, случайный импорт JS вместо TS, сложнее ревью.

**Рекомендация:** удалить build artifacts из `src`, настроить `outDir=dist`, добавить в `.gitignore`.

---

### M-05. Нет явной проверки backend ABAC во всех критичных сценариях

Есть `AccessControlService`, но требуется проверить применение во всех use cases:

- личные отчеты;
- оценки руководителя только по direct reports;
- finance data только для разрешенных ролей;
- export personal report другого пользователя;
- timesheet team access.

**Рекомендация:** добавить негативные integration tests по ABAC.

---

### M-06. Export/download endpoints требуют отдельной проверки прав доступа

`ExportController` защищен guards, но методы без явных `@Roles(...)` на уровне endpoint'ов. Нужно проверить, что use cases ограничивают доступ к персональным и финансовым экспортам.

**Рекомендация:** добавить explicit roles и ABAC для каждого вида экспорта.

---

### M-07. Health endpoint слишком простой для production readiness

`/api/health` есть, но deployment/runbook ожидают мониторинг состояния БД, Redis, очередей, YouTrack/SMTP по необходимости.

**Рекомендация:** добавить `/health/live` и `/health/ready` с проверками PostgreSQL/Redis.

---

### M-08. Performance checklist есть, но не видно автоматизированных performance-тестов

Есть `seed-performance.ts` и чеклист, но не найдено k6/JMeter сценариев или сохраненных результатов.

**Рекомендация:** добавить `qa/performance/*.js` или `tests/performance`, фиксировать baseline.

## 6. Соответствие верхнеуровневым критериям приемки

| № | Критерий из ТЗ | Статус | Комментарий |
|---|---|---|---|
| 1 | Администратор может подключить СПО к YouTrack и выполнить синхронизацию | Частично / риск | YouTrack endpoints есть, но не защищены; требуется проверка реального подключения. |
| 2 | Отображаются незавершенные задачи из YouTrack | Частично | Backend имеет issues API, frontend местами mock. |
| 3 | Задачи кликабельны ссылками на YouTrack | Частично | В mock UI есть ссылки, нужна проверка реальных данных. |
| 4 | Иерархия Parent/Subtask | Частично | Модель есть, snapshot/finance используют заглушки. |
| 5 | Создание периода планирования | Частично | API есть, но RBAC может блокировать доступ. |
| 6 | Рабочие часы месяца и резерв | Частично | Модель и DTO есть. |
| 7 | Drag-and-drop распределение задач | Частично | UI есть, требуется проверка интеграции с backend. |
| 8 | Загрузка сотрудников и подсветка перегруза | Частично | Capacity service есть, нужна интеграция и тесты. |
| 9 | Фиксация плана | Частично / риск | Есть use case, но нет транзакционного outbox. |
| 10 | План выгружается в YouTrack | Частично / риск | Event handler есть, но надежность и guards недостаточны. |
| 11 | Загрузка факта из YouTrack | Частично | Sync engine есть, нужна реальная проверка. |
| 12 | Итоговый отчет план/факт | Частично | Use cases есть, тестов мало. |
| 13 | Фильтрация/сортировка/группировка отчета | Частично | Требует проверки; frontend/backend контракты расходятся. |
| 14 | Бизнес-оценка | Частично | API есть, ABAC нужно проверять. |
| 15 | Оценка руководителя | Частично | API есть, ABAC direct reports нужно проверять. |
| 16 | Личный отчет рассчитывает суммы | Частично | Доменные сервисы есть, нужны тесты формул. |
| 17 | Закрытый период не пересчитывается после изменения настроек | Не подтверждено | Snapshot неполный, freeze неполный. |
| 18 | Директор может переоткрыть период | Частично | API есть, роли/ABAC требуют исправления. |
| 19 | Все критичные изменения в журнале | Частично | Audit есть, покрытие не доказано. |
| 20 | Экспорты формируются в заявленных форматах | Частично | Services есть, нужны e2e/regression проверки. |

## 7. Рекомендуемый план исправлений

### Этап 1 — восстановить собираемость и базовую работоспособность

1. Исправить DI-токены NestJS: заменить interfaces на symbols/abstract classes.
2. Удалить/перенести лишнюю Prisma-схему, оставить один canonical schema path.
3. Сгенерировать Prisma client из canonical schema.
4. Создать initial migration.
5. Запустить и зафиксировать результаты:
   - `npm install`;
   - `npm run build`;
   - backend build;
   - frontend build;
   - prisma validate/generate;
   - tests.

### Этап 2 — исправить безопасность и доступы

1. Починить загрузку ролей в login/JwtAuthGuard.
2. Унифицировать роли через enum/const.
3. Закрыть YouTrackController guards.
4. Проверить все controller methods на RBAC/ABAC.
5. Убрать production fallbacks для секретов.
6. Настроить CORS allowlist.
7. Перейти на безопасное хранение refresh token.

### Этап 3 — согласовать backend/frontend API

1. Решить вопрос с `{ success, data }`.
2. Обновить frontend API-client.
3. Убрать runtime mock-данные из production страниц.
4. Вынести API base URL в env.
5. Добавить frontend integration tests.

### Этап 4 — довести доменную полноту MVP

1. Реализовать Transactional Outbox.
2. Сделать полноценный snapshot закрытого периода.
3. Реализовать финансовые группировки по project/system/business hierarchy.
4. Доделать freeze financials в persistence.
5. Реализовать real LDAP/LDAPS adapter.
6. Проверить YouTrack sync на реальной или sandbox-инсталляции.

### Этап 5 — тестирование и приемка

1. Перенести чеклист `DOC/qa/regression-test-checklist.md` в automated/manual test suite.
2. Добавить e2e сценарии верхнеуровневой приемки.
3. Добавить performance smoke/baseline.
4. Добавить CI/CD workflow.
5. Обновить `context.md` и `plan.md` по фактическому статусу.

## 8. Итоговый статус

**Рекомендуемый статус проекта:** `NOT READY FOR ACCEPTANCE / NEEDS STABILIZATION`

**Причины:**

- критичные проблемы сборки/DI;
- неработающий RBAC;
- открытые YouTrack endpoint'ы;
- неполный snapshot закрытого периода;
- несогласованный frontend/backend контракт;
- mock-данные во frontend;
- отсутствие полноценного набора тестов;
- отсутствие миграций и CI/CD.

После исправления пунктов CR-01 — CR-08 можно переходить к повторной технической верификации. После исправления CR-09 — CR-19 можно проводить приемочное тестирование по критериям ТЗ.
