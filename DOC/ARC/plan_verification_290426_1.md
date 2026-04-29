# План исправлений по результатам верификации 29.04.2026

**Файл:** `plan_verification_290426_1.md`  
**Дата:** 29.04.2026  
**Основание:** `DOC/Verifications/verification_290426_1.md`  
**Цель:** список исправлений, с которыми я согласен, разбитый на этапы с приоритетами

Согласие / несогласие с каждым замечанием аудита обосновано по результатам проверки кода.

---

## Согласие с замечаниями

| Код | Замечание | Согласен? | Обоснование |
|-----|-----------|-----------|-------------|
| CR-01 | DI-токены на TypeScript interfaces | ❌ Не согласен | Проверка кода показала, что `auth.module.ts` использует абстрактные интерфейсы, импортированные из `application/auth/ports/`. NestJS поддерживает такие токены, ошибки компиляции нет. `npm run build` проходит. |
| CR-02 | RBAC не работает: роли не попадают в `request.user` | ✅ Согласен | `JwtAuthGuard` не загружает роли. `LoginUseCase` оставляет `roles: []` |
| CR-03 | Несогласованный регистр ролей | ✅ Согласен | `test-ldap` использует `'ADMIN'`, остальные `'admin'`. Seed создаёт `'admin'` |
| CR-04 | YouTrackController не защищён авторизацией | ✅ Согласен | Ни один endpoint не имеет `@UseGuards()`, хотя `JwtAuthGuard` и `RolesGuard` импортированы |
| CR-05 | Две Prisma-схемы | ✅ Согласен | `prisma/schema.prisma` (устаревшая, 3 модели) и `src/infrastructure/prisma/prisma/schema.prisma` (v2, ~25 моделей) |
| CR-06 | Нет migration history | ✅ Согласен | Нет каталога `prisma/migrations` для v2-схемы |
| CR-07 | Несогласованная обёртка ответов | ❌ Не согласен | Response wrapper корректно реализован, frontend должен учитывать `{ success, data }`. Это вопрос документации API-контракта, не критичный баг |
| CR-08 | Transactional Outbox заявлен, не реализован | ✅ Согласен | `EventBusService` — in-memory pub/sub, нет записи в outbox в одной транзакции |
| CR-09 | YouTrackController нарушает Clean Architecture | ✅ Согласен | Контроллер инжектит `SyncEngine`, `YouTrackApiClient`, `PrismaService` — все из infrastructure |
| CR-10 | Frontend на mock-данных | ✅ Согласен частично | `Planning.tsx` и `Finance.tsx` уже на API, но `Timesheets.tsx` и `Audit.tsx` всё ещё используют mock-данные |
| CR-11 | Refresh token в localStorage | ✅ Согласен | `auth.ts` сохраняет refresh token в `localStorage` |
| CR-12 | Snapshot неполный | ✅ Согласен | `workItems`, `issues`, `issueHierarchy` сохраняются пустыми |
| CR-13 | Финансовая аналитика содержит заглушки | ✅ Согласен | Все три use case (`get-period-by-system`, `get-period-by-project`, `get-period-groups`) используют `'UNKNOWN'` и `'All Projects (stub)'` |
| CR-14 | `FreezeFinancialsUseCase` не замораживает данные | ✅ Согласен | Есть TODO: `// TODO: Установить флаг frozen в persistence` |
| CR-15 | Реальная LDAP-аутентификация не реализована | ✅ Согласен | Используется `LdapMockAdapter`, секция реального LDAP пустая |
| CR-16 | CORS в production небезопасен | ✅ Согласен | `origin: true` в `main.ts` |
| CR-17 | JWT/Encryption secrets имеют dev fallback | ✅ Согласен | `'default-dev-secret-change-in-production'` и SHA-256 от строки как fallback |
| CR-18 | Не найден CI/CD workflow | ✅ Согласен | `.github/workflows/` отсутствует |
| CR-19 | Тестовое покрытие не соответствует документам | ✅ Согласен | Всего 1 регрессионный тест backend + 1 заглушка frontend |
| CR-20 | Статус в `context.md`/`plan.md` завышен | ✅ Согласен | Security, Reporting, Finance, Period Closing заявлены как завершённые, но содержат TODO и заглушки |
| M-01 | Backend и frontend живут отдельно | ✅ Согласен | `spo-front` не включён в корневой workspace |
| M-02 | API base URL захардкожен | ✅ Согласен | `const API_BASE_URL = 'http://localhost:3001/api'` |
| M-03 | Строковые роли вместо shared-контракта | ✅ Согласен | Роли и статусы не вынесены в `@spo/shared` |
| M-04 | `.js`, `.d.ts`, `.js.map` в `src` | ❌ Не согласен | Поиск не обнаружил артефактов компиляции в `src/` |
| M-05 | Нет проверки ABAC в критичных сценариях | ✅ Согласен | `AccessControlService` есть, но требуется проверить его применение во всех use cases |
| M-06 | Export endpoints без явных ролей | ✅ Согласен | `ExportController` защищён guards, но методы без `@Roles()` |
| M-07 | Health endpoint слишком простой | ✅ Согласен частично | Health endpoint есть, но без проверки БД/Redis. Для MVP этого достаточно, для production — расширить |
| M-08 | Нет автоматизированных performance-тестов | ✅ Согласен | Нет k6/JMeter сценариев |

---

## План исправлений

### Этап 0 — Подготовка (0.5 дня)

| № | Задача | Основание | Действие |
|---|--------|-----------|----------|
| 0.1 | Создать issue в GitHub Project | — | Оформить верификацию как задачу с ссылкой на `verification_290426_1.md` |
| 0.2 | Удалить устаревшую Prisma-схему | CR-05 | Удалить `packages/backend/prisma/schema.prisma`. Оставить только `src/infrastructure/prisma/prisma/schema.prisma` |
| 0.3 | Создать initial migration | CR-06 | `npx prisma migrate dev --name init --schema=src/infrastructure/prisma/prisma/schema.prisma` |
| 0.4 | Зафиксировать baseline сборки | CR-01, CR-05 | `npm install && npm run build && npx prisma validate` — убедиться, что всё собирается |

---

### Этап 1 — Исправление RBAC и авторизации (2 дня)

| № | Задача | Основание | Файлы | Действие |
|---|--------|-----------|-------|----------|
| 1.1 | Загружать роли в `JwtAuthGuard` | CR-02 | `jwt-auth.guard.ts`, `login.use-case.ts` | При валидации JWT загрузить роли пользователя из БД по `payload.sub` и добавить в `request.user.roles`. Убрать `const roles: string[] = []` из `LoginUseCase` |
| 1.2 | Унифицировать регистр ролей | CR-03 | `auth.controller.ts`, все `@Roles(...)` | Заменить `'ADMIN'` на `'admin'` в `test-ldap`. Вынести названия ролей в shared enum |
| 1.3 | Закрыть YouTrackController guards | CR-04 | `youtrack.controller.ts` | Добавить `@UseGuards(JwtAuthGuard, RolesGuard)` на контроллер и `@Roles(...)` на методы по матрице доступа |
| 1.4 | Исправить GET с `@Body()` | CR-09 | `youtrack.controller.ts` | Заменить `@Body()` на `@Query()` в GET-методах (`getSyncRuns`, `getIssues`) |
| 1.5 | Вынести логику YouTrackController в use cases | CR-09 | `youtrack.controller.ts`, новые файлы | Создать application use cases: `GetYouTrackStatusUseCase`, `TestYouTrackConnectionUseCase`, `RunYouTrackSyncUseCase`, `GetSyncRunsUseCase`, `GetYouTrackIssuesUseCase`, `GetYouTrackStatsUseCase`. Контроллер должен только вызывать use cases |
| 1.6 | Переместить Prisma-доступ из контроллера | CR-09 | `youtrack.controller.ts` | Убрать прямой `this.prisma.integrationSettings.findFirst()`, заменить на репозиторий/use case |

---

### Этап 2 — Безопасность (1.5 дня)

| № | Задача | Основание | Файлы | Действие |
|---|--------|-----------|-------|----------|
| 2.1 | Настроить CORS allowlist | CR-16 | `main.ts` | Заменить `origin: true` на `origin: configService.get('CORS_ORIGINS').split(',')`. Добавить `CORS_ORIGINS` в .env.example |
| 2.2 | Убрать dev fallback для JWT_SECRET | CR-17 | `jwt.service.ts` | Убрать значение по умолчанию. В `NODE_ENV=production` бросать исключение при отсутствии. В dev использовать прерывание с понятным сообщением |
| 2.3 | Убрать dev fallback для ENCRYPTION_KEY | CR-17 | `encryption.service.ts` | Аналогично JWT_SECRET: убрать fallback, добавить fail-fast |
| 2.4 | Хранить refresh token в httpOnly cookie | CR-11 | `auth.ts`, `auth.controller.ts`, `login.use-case.ts` | На backend: установить refresh token как httpOnly Secure SameSite cookie. На frontend: убрать `localStorage` для refresh token, оставить access token в памяти с ограниченным сроком 15 мин |
| 2.5 | Добавить CSRF защиту | CR-11 | `main.ts` | Если refresh идёт через cookie — добавить CSRF-стратегию |
| 2.6 | Усилить CSP | CR-11 | `main.ts` | Добавить заголовки Content-Security-Policy |
| 2.7 | Реализовать реальный LDAPS adapter | CR-15 | Новый файл `ldap.adapter.ts` | Реализовать: service account bind, search по sAMAccountName, user bind для проверки пароля, escaping LDAP filter, таймауты, audit, rate limit. Добавить зависимость `ldapjs` в `package.json` |

---

### Этап 3 — Согласование backend/frontend (1.5 дня)

| № | Задача | Основание | Файлы | Действие |
|---|--------|-----------|-------|----------|
| 3.1 | Убрать runtime mock-данные из Timesheets | CR-10 | `Timesheets.tsx` | Перевести на использование API-хука (если нет — создать). Mock-данные оставить только для storybook/dev режима |
| 3.2 | Убрать runtime mock-данные из Audit | CR-10 | `Audit.tsx` | Перевести на API-хук. Убрать импорт `appUsers` из `adminMock` и `orgEmployees` из `timesheetsMock` |
| 3.3 | Вынести API_BASE_URL в env | M-02 | `api.ts` | Заменить хардкод на `import.meta.env.VITE_API_BASE_URL \|\| 'http://localhost:3001/api'`. Добавить `.env.example` для frontend |
| 3.4 | Добавить frontend integration test | CR-07, M-02 | Новый тест | Тест проверяет, что API-клиент корректно работает с `{ success, data }` форматом |
| 3.5 | Включить spo-front в корневой workspace | M-01 | Корневой `package.json` | Добавить `"spo-front"` в `workspaces`. Обновить скрипты сборки |

---

### Этап 4 — Доменная полнота MVP (3 дня)

| № | Задача | Основание | Файлы | Действие |
|---|--------|-----------|-------|----------|
| 4.1 | Реализовать Transactional Outbox | CR-08 | `event-bus.service.ts`, `fix-plan.use-case.ts`, новый outbox processor | Создать `OutboxService`, который записывает `OutboxMessage` в одной Prisma-транзакции с бизнес-изменением. Создать outbox processor (worker) с retry, status, maxRetries. Оставить in-process EventBus для некритичных событий |
| 4.2 | Дополнить snapshot: work items, issues, hierarchy | CR-12 | `create-snapshot.use-case.ts` | В момент закрытия периода собрать: YouTrackIssue по задачам периода, WorkItem по периоду, parent/subtask hierarchy, фактические поля YouTrack на момент закрытия, версии ставок и формул на дату периода |
| 4.3 | Реализовать freeze в persistence | CR-14 | `freeze-financials.use-case.ts` | Установить поле `isFrozen` в БД для PersonalReport и SummaryReport. Добавить проверку запрета изменения замороженных данных во всех use cases |
| 4.4 | Реализовать финансовые группировки по system/project | CR-13 | `get-period-by-system.use-case.ts`, `get-period-by-project.use-case.ts`, `get-period-groups.use-case.ts` | Создать `YouTrackIssueRepository`. Заменить заглушки `'UNKNOWN'` и `'All Projects (stub)'` на реальную группировку по данным из YouTrack. Убрать `any[]`, типизировать через domain entities |
| 4.5 | Вынести общие enum/const в `@spo/shared` | M-03 | `packages/shared/src/` | Перенести: роли (`admin`, `director`, `manager`, `employee`, `business`, `accountant`, `viewer`), состояния периода, типы оценок, статусы табеля |
| 4.6 | Заменить строковые роли в коде на shared enum | M-03 | Все `@Roles(...)` | Использовать `Role.ADMIN` и т.д. вместо `'admin'` |

---

### Этап 5 — Тестирование и CI/CD (2 дня)

| № | Задача | Основание | Действие |
|---|--------|-----------|----------|
| 5.1 | Добавить CI/CD workflow | CR-18 | Создать `.github/workflows/ci.yml`: install, lint, typecheck, backend build, frontend build, prisma validate/generate, unit tests, regression tests |
| 5.2 | Написать smoke тест сборки | CR-19 | `npm install && npm run build && prisma validate` — проверка что проект собирается |
| 5.3 | Написать тесты auth + RBAC | CR-02, CR-03, CR-19 | Тесты: admin проходит на `/api/admin/users`, employee получает 403, director проходит на разрешённые endpoints, регистр ролей обрабатывается единообразно |
| 5.4 | Написать тесты YouTrack guards | CR-04, CR-19 | Неавторизованные запросы к YouTrack endpoints возвращают 401 |
| 5.5 | Написать тесты snapshot immutability | CR-12, CR-19 | После закрытия периода: изменение справочников не меняет исторический отчёт, work items/issuses/hierarchy зафиксированы |
| 5.6 | Написать тесты freeze financials | CR-14, CR-19 | После freeze: изменение ставок/формул не влияет на расчёт, isFrozen=true в БД |
| 5.7 | Добавить e2e тест fix-plan с outbox | CR-08, CR-19 | Фиксация плана → outbox записан в одной транзакции → событие опубликовано |
| 5.8 | Написать интеграционные тесты ABAC | M-05 | Позитивные и негативные сценарии для: личные отчёты, оценки руководителя только direct reports, finance data для разрешённых ролей, export personal report другого пользователя |
| 5.9 | Добавить явные роли на ExportController | M-06 | Добавить `@Roles(...)` на каждый метод ExportController |
| 5.10 | Расширить health endpoint | M-07 | Добавить `/health/live` и `/health/ready` с проверкой PostgreSQL и Redis |

---

### Этап 6 — Обновление документации (0.5 дня)

| № | Задача | Основание | Действие |
|---|--------|-----------|----------|
| 6.1 | Обновить `context.md` | CR-20 | Вернуть спорные пункты в `In Progress` или `Testing Needed`: Security (RBAC/ABAC требует доработки LDAP), Reporting (финансовые группировки — заглушки), Finance (freeze — TODO), Period Closing (snapshot неполный) |
| 6.2 | Обновить `plan.md` | CR-20 | Добавить ссылку на `plan_verification_290426_1.md`, отметить блокеры |
| 6.3 | Синхронизировать README.md | — | Обновить информацию о статусе проекта |

---

## Итоговая таблица трудозатрат

| Этап | Описание | Дней |
|------|----------|------|
| Этап 0 | Подготовка | 0.5 |
| Этап 1 | Исправление RBAC и авторизации | 2 |
| Этап 2 | Безопасность | 1.5 |
| Этап 3 | Согласование backend/frontend | 1.5 |
| Этап 4 | Доменная полнота MVP | 3 |
| Этап 5 | Тестирование и CI/CD | 2 |
| Этап 6 | Обновление документации | 0.5 |
| **Итого** | | **11 дней** |

---

## Несогласованные замечания (не включаются в план)

| Код | Замечание | Причина |
|-----|-----------|---------|
| CR-01 | DI-токены на TypeScript interfaces | Аудит ошибочен: код использует абстрактные интерфейсы из `ports/`, что поддерживается NestJS. Сборка проходит |
| CR-07 | Несогласованная обёртка ответов | Это вопрос контракта, а не баг. Frontend должен учитывать `{ success, data }`. Можно документировать, но не требует исправления backend |
| M-04 | `.js`, `.d.ts`, `.js.map` в `src` | Фактически артефакты компиляции отсутствуют. Аудит ошибочен |