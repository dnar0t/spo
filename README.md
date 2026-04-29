# СПО — Система Планирования и Отчетности

**Version:** 2.0  
**Stack:** Node.js, NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ  
**Architecture:** Clean Architecture + DDD, Modular Monolith

## Описание

СПО (Система Планирования и Отчетности) — внутренняя корпоративная система для:

- Интеграции с **YouTrack** (синхронизация задач, work items, пользователей)
- **Планирования** спринтов (backlog, capacity planning, фиксация плана)
- **Отчётности** (итоговые и личные отчёты, бизнес-группировка)
- **Финансов** (ставки, формулы, оценки, себестоимость)
- **Управления периодами** (workflow, close/reopen, snapshots)
- **RBAC + ABAC** авторизации через AD/LDAP
- **Экспорта** (Excel, PDF, JSON)

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Backend | NestJS 10, TypeScript 5 |
| ORM | Prisma 5 |
| База данных | PostgreSQL 16 |
| Очереди | BullMQ (Redis 7) |
| Аутентификация | LDAP/LDAPS + JWT |
| Архитектура | Clean Architecture + DDD |

## Структура проекта

```
spo/
├── packages/
│   ├── backend/          # NestJS backend
│   │   └── src/
│   │       ├── domain/           # Domain Layer (сущности, VO, события)
│   │       ├── application/      # Application Layer (use cases)
│   │       ├── infrastructure/   # Infrastructure Layer (Prisma, YouTrack, LDAP...)
│   │       ├── presentation/     # Presentation Layer (контроллеры, guards)
│   │       ├── event-bus/        # Event Bus модуль
│   │       ├── config/           # Конфигурация
│   │       └── common/           # Общие утилиты
│   └── shared/           # Общие типы, enum, константы, утилиты
├── docker/
│   ├── docker-compose.yml # Docker Compose (PostgreSQL, Redis)
│   ├── nginx/            # Nginx reverse proxy config
│   └── backups/          # Backup scripts
└── .github/workflows/    # CI/CD pipelines
```

## Быстрый старт

### 1. Клонирование

```bash
git clone https://github.com/dnar0t/spo.git
cd spo
```

### 2. Запуск инфраструктуры (PostgreSQL + Redis)

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 3. Установка зависимостей

```bash
npm install
```

### 4. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните параметры:

```bash
cp .env.example .env
```

### 5. Prisma миграции

```bash
npx prisma migrate dev --schema=packages/backend/src/infrastructure/prisma/prisma/schema.prisma
npx prisma generate --schema=packages/backend/src/infrastructure/prisma/prisma/schema.prisma
```

### 6. Запуск backend

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000/api`

### Health check

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": 1714233600000 }
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|---------|-------------|
| `PORT` | Порт сервера | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `NODE_ENV` | Окружение | `development` |
| `YOUTRACK_BASE_URL` | YouTrack server URL | — |
| `YOUTRACK_TOKEN` | YouTrack API token | — |
| `LDAP_URL` | LDAP server URL | — |
| `JWT_SECRET` | Секрет для JWT | — |

## Команды

```bash
npm run dev           # Запуск backend в режиме разработки
npm run build         # Сборка всех пакетов
npm run build:backend # Сборка только backend
npm run build:shared  # Сборка shared package
npm run lint          # Линтинг
npm run format        # Форматирование кода
```

## Архитектурные принципы

- **Clean Architecture**: Domain → Application → Infrastructure → Presentation
- **DDD**: Bounded Contexts (Planning, Reporting, Finance, Integration, Administration, Notifications, Workflow)
- **Modular Monolith**: единый деплой, модульная структура внутри
- **Transactional Outbox**: гарантированная доставка событий
- **Materialized Reports**: быстрые отчёты через materialized tables
- **Immutable Snapshots**: закрытые периоды неизменяемы
- **No Float**: деньги в копейках, часы в минутах, проценты в basis points
- **RBAC + ABAC**: ролевая и атрибутная авторизация

## Документация

- `DOC/TZ/spo_tz_v2.md` — Техническое задание
- `DOC/ARC/architecture_v2.md` — Архитектура
- `DOC/ARC/specification_v2.md` — Техническая спецификация
- `DOC/ARC/plan.md` — План разработки
- `DOC/ARC/context.md` — Контекст для ИИ-агентов

## Тестирование

```bash
npm test              # Запуск всех тестов
```

Проект содержит **97 автоматических тестов** в 6 тестовых наборах:

| Набор | Описание |
|-------|----------|
| `test/auth/rbac.spec.ts` | RBAC: RolesGuard + @Roles() декоратор (9 тестов) |
| `test/auth/abac.spec.ts` | ABAC: доступ к личным отчётам по ролям и иерархии (23 теста) |
| `test/finance/freeze.spec.ts` | Freeze финансов: snapshot, флаг frozen, immutable reports (8 тестов) |
| `test/regression/closed-report-immutability.spec.ts` | Неизменность закрытых отчётов: close/reopen, snapshots, аудит (25 тестов) |
| `test/regression/fix-plan-outbox.spec.ts` | FixPlan + Transactional Outbox (4 теста) |
| `test/youtrack/youtrack-guards.spec.ts` | YouTrackController guards: RBAC по матрице доступа (26 тестов) |
| `test/smoke/build.test.ts` | Smoke-тест сборки (2 теста) |

## Аудит

Результаты аудита реализации и план исправлений:

- `DOC/Verifications/verification_290426_1.md` — результаты аудита
- `DOC/ARC/plan_verification_290426_1.md` — план исправлений

## Лицензия

Internal. Все права защищены.