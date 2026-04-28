// =====================================================
// СПО — Performance Test Dataset Seed Script
// =====================================================
//
// Creates a realistic dataset for performance testing:
// - 50 users (employees + managers + admins)
// - 10 work roles
// - 20 projects in YouTrack
// - 500 issues with hierarchy (epics → features → stories → tasks)
// - 3 reporting periods (last 3 months)
// - Sprint plans for each period
// - ~2000 planned tasks across periods
// - 5000 work items (actual time)
// - Personal reports and summary reports for each period
// - Manager and business evaluations
// - Formula configurations and evaluation scales
// - Employee rate history
//
// Run with: npx ts-node prisma/seed-performance.ts
// =====================================================

import { PrismaClient } from '@prisma/client';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// ─── Constants ────────────────────────────────────────

const USER_COUNT = 50;
const WORK_ROLE_COUNT = 10;
const PROJECT_COUNT = 20;
const ISSUE_TOTAL = 500;
const PERIOD_COUNT = 3;
const PLANNED_TASKS_TOTAL = 2000;
const WORK_ITEMS_TOTAL = 5000;

const EMPLOYEE_NAMES = [
  'Иван Петров',
  'Мария Иванова',
  'Алексей Смирнов',
  'Елена Кузнецова',
  'Дмитрий Попов',
  'Ольга Васильева',
  'Андрей Соколов',
  'Наталья Михайлова',
  'Сергей Новиков',
  'Татьяна Федорова',
  'Павел Морозов',
  'Анна Волкова',
  'Николай Алексеев',
  'Юлия Лебедева',
  'Михаил Семенов',
  'Екатерина Егорова',
  'Артем Козлов',
  'Ирина Павлова',
  'Владимир Степанов',
  'Светлана Николаева',
  'Максим Захаров',
  'Полина Мельникова',
  'Роман Макаров',
  'Евгения Белова',
  'Александр Тимофеев',
  'Галина Крылова',
  'Виктор Фролов',
  'Людмила Баранова',
  'Илья Григорьев',
  'Надежда Тихонова',
  'Борис Кузьмин',
  'София Сорокина',
  'Константин Калинин',
  'Валентина Маркова',
  'Егор Кондратьев',
  'Лилия Лазарева',
  'Антон Громов',
  'Марина Филиппова',
  'Василий Логинов',
  'Алина Осипова',
  'Георгий Белов',
  'Вера Чистякова',
  'Петр Давыдов',
  'Ксения Панова',
  'Станислав Ершов',
  'Олеся Журавлева',
  'Кирилл Савин',
  'Эльвира Ковалева',
  'Тимофей Бобров',
  'Зоя Никулина',
];

const PROJECT_NAMES = [
  'CRM-система',
  'Личный кабинет клиента',
  'Интернет-магазин',
  'Мобильное приложение',
  'Платформа аналитики',
  'BI-дашборд',
  'Система документооборота',
  'Портал самообслуживания',
  'ERP-модуль',
  'API-шлюз',
  'Платежный сервис',
  'Система нотификаций',
  'Чат-бот платформа',
  'Система лояльности',
  'Интеграционная шина',
  'HR-портал',
  'Learning Management System',
  'Система мониторинга',
  'Service Desk',
  'DevOps-платформа',
];

const SYSTEM_NAMES = [
  'CRM',
  'BPM',
  'ERP',
  'CMS',
  'BI',
  'LMS',
  'HRM',
  'SCM',
  'WMS',
  'CDP',
  'DMP',
  'MDM',
  'PIM',
  'DAM',
  'CMS',
  'ECM',
  'BRM',
  'OLAP',
  'ETL',
  'ESB',
];

const WORK_TYPE_NAMES = [
  'Development',
  'Testing',
  'Analysis',
  'Meeting',
  'Documentation',
  'Support',
];
const EVAL_TYPES = ['excellent', 'good', 'satisfactory', 'unsatisfactory'];
const BUS_EVAL_TYPES = ['direct_profit', 'obvious_benefit', 'useful', 'neutral'];

// ─── Main Seed Function ───────────────────────────────

async function main() {
  console.log('🚀 Starting performance dataset seeding...\n');
  const startTime = Date.now();

  // 1. Roles
  const roles = await createRoles();
  console.log(`  ✓ Created ${roles.length} roles`);

  // 2. Work Roles
  const workRoles = await createWorkRoles();
  console.log(`  ✓ Created ${workRoles.length} work roles`);

  // 3. Users (with profiles and role assignments)
  const users = await createUsers(roles, workRoles);
  console.log(`  ✓ Created ${users.length} users with profiles`);

  // 4. Formula Configurations
  const formulas = await createFormulaConfigurations(users[0]);
  console.log(`  ✓ Created ${formulas.length} formula configurations`);

  // 5. Evaluation Scales
  const scales = await createEvaluationScales();
  console.log(`  ✓ Created ${scales.length} evaluation scales`);

  // 6. Reporting Periods (last 3 months)
  const periods = await createReportingPeriods(users[0]);
  console.log(`  ✓ Created ${periods.length} reporting periods`);

  // 7. YouTrack Issues with hierarchy
  const issues = await createIssues(users);
  console.log(`  ✓ Created ${issues.length} issues with hierarchy`);

  // 8. Sprint Plans
  const sprintPlans = await createSprintPlans(periods, users[0]);
  console.log(`  ✓ Created ${sprintPlans.length} sprint plans`);

  // 9. Planned Tasks
  const plannedTasks = await createPlannedTasks(sprintPlans, issues, users);
  console.log(`  ✓ Created ${plannedTasks.length} planned tasks`);

  // 10. Work Items (actual time)
  const workItems = await createWorkItems(issues, periods, users);
  console.log(`  ✓ Created ${workItems.length} work items`);

  // 11. Personal Reports & Lines
  const personalReports = await createPersonalReports(periods, users, issues);
  console.log(`  ✓ Created ${personalReports.length} personal reports with lines`);

  // 12. Period Summary Reports
  const summaries = await createSummaryReports(periods);
  console.log(`  ✓ Created ${summaries.length} period summary reports`);

  // 13. Manager Evaluations
  const managerEvals = await createManagerEvaluations(periods, issues, users);
  console.log(`  ✓ Created ${managerEvals.length} manager evaluations`);

  // 14. Business Evaluations
  const businessEvals = await createBusinessEvaluations(periods, issues, users);
  console.log(`  ✓ Created ${businessEvals.length} business evaluations`);

  // 15. Employee Rate History
  const rateHistory = await createEmployeeRateHistory(users, users[0]);
  console.log(`  ✓ Created ${rateHistory.length} employee rate history records`);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Performance dataset seeding completed in ${duration}s!`);
  console.log('   Dataset size summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Issues: ${issues.length}`);
  console.log(`   - Periods: ${periods.length}`);
  console.log(`   - Sprint plans: ${sprintPlans.length}`);
  console.log(`   - Planned tasks: ${plannedTasks.length}`);
  console.log(`   - Work items: ${workItems.length}`);
  console.log(`   - Reports: ${personalReports.length}`);
  console.log(`   - Evaluations: ${managerEvals.length + businessEvals.length}`);
  console.log(`   - Rate history: ${rateHistory.length}`);

  await prisma.$disconnect();
}

// ─── Seed Functions ───────────────────────────────────

async function createRoles() {
  const roleNames = [
    'admin',
    'director',
    'manager',
    'employee',
    'business',
    'accountant',
    'viewer',
  ];
  const roles = [];

  for (const name of roleNames) {
    const role = await prisma.role.create({
      data: { id: uuid(), name, description: `Role: ${name}` },
    });
    roles.push(role);
  }
  return roles;
}

async function createWorkRoles() {
  const workRoleNames = [
    'Backend Developer',
    'Frontend Developer',
    'Fullstack Developer',
    'QA Engineer',
    'DevOps Engineer',
    'System Analyst',
    'Business Analyst',
    'Team Lead',
    'Architect',
    'Project Manager',
  ];

  const workRoles = [];
  for (const name of workRoleNames) {
    const wr = await prisma.workRole.create({
      data: { id: uuid(), name, description: `Work role: ${name}` },
    });
    workRoles.push(wr);
  }
  return workRoles;
}

async function createUsers(roles: any[], workRoles: any[]) {
  const users: any[] = [];

  // Admin user (index 0)
  const admin = await prisma.user.create({
    data: {
      id: uuid(),
      login: 'admin',
      email: 'admin@spo.local',
      fullName: 'Администратор Системы',
      youtrackLogin: 'admin',
      isActive: true,
      isBlocked: false,
      employmentDate: new Date('2019-01-01'),
    },
  });
  await prisma.userRole.create({
    data: { userId: admin.id, roleId: roles.find((r: any) => r.name === 'admin')!.id },
  });
  users.push(admin);

  // Director (index 1)
  const director = await prisma.user.create({
    data: {
      id: uuid(),
      login: 'director',
      email: 'director@spo.local',
      fullName: 'Директор Организации',
      youtrackLogin: 'director',
      isActive: true,
      employmentDate: new Date('2018-06-01'),
    },
  });
  await prisma.userRole.create({
    data: { userId: director.id, roleId: roles.find((r: any) => r.name === 'director')!.id },
  });
  await prisma.userRole.create({
    data: { userId: director.id, roleId: roles.find((r: any) => r.name === 'manager')!.id },
  });
  users.push(director);

  // 5 Managers (indices 2-6)
  const managerIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = i + 2;
    const login = `manager${i + 1}`;
    const mgr = await prisma.user.create({
      data: {
        id: uuid(),
        login,
        email: `${login}@spo.local`,
        fullName: EMPLOYEE_NAMES[idx],
        youtrackLogin: login,
        isActive: true,
        employmentDate: new Date(2020, i % 12, 1),
      },
    });
    await prisma.userRole.create({
      data: { userId: mgr.id, roleId: roles.find((r: any) => r.name === 'manager')!.id },
    });
    await prisma.userRole.create({
      data: { userId: mgr.id, roleId: roles.find((r: any) => r.name === 'employee')!.id },
    });
    users.push(mgr);
    managerIds.push(mgr.id);
  }

  // Business roles (indices 7-8)
  for (let i = 0; i < 2; i++) {
    const idx = i + 7;
    const login = `business${i + 1}`;
    const bus = await prisma.user.create({
      data: {
        id: uuid(),
        login,
        email: `${login}@spo.local`,
        fullName: EMPLOYEE_NAMES[idx],
        isActive: true,
        employmentDate: new Date(2021, i + 2, 1),
      },
    });
    await prisma.userRole.create({
      data: { userId: bus.id, roleId: roles.find((r: any) => r.name === 'business')!.id },
    });
    users.push(bus);
  }

  // Accountant (index 9)
  const accountant = await prisma.user.create({
    data: {
      id: uuid(),
      login: 'accountant',
      email: 'accountant@spo.local',
      fullName: 'Главный Бухгалтер',
      isActive: true,
      employmentDate: new Date('2019-03-01'),
    },
  });
  await prisma.userRole.create({
    data: { userId: accountant.id, roleId: roles.find((r: any) => r.name === 'accountant')!.id },
  });
  users.push(accountant);

  // 40 regular employees (indices 10-49)
  for (let i = 10; i < USER_COUNT; i++) {
    const empName = EMPLOYEE_NAMES[i];
    const login = `employee${i - 9}`;
    const emp = await prisma.user.create({
      data: {
        id: uuid(),
        login,
        email: `${login}@spo.local`,
        fullName: empName,
        youtrackLogin: login,
        youtrackUserId: `yt-${uuid().slice(0, 8)}`,
        isActive: true,
        employmentDate: new Date(2020 + randomInt(0, 4), randomInt(0, 11), randomInt(1, 28)),
      },
    });
    await prisma.userRole.create({
      data: { userId: emp.id, roleId: roles.find((r: any) => r.name === 'employee')!.id },
    });
    users.push(emp);
  }

  // Create employee profiles for all non-admin users
  const employeeUsers = users.slice(1);
  for (const user of employeeUsers) {
    let managerId: string | null = null;
    if (user.login.startsWith('employee')) {
      managerId = randomElement(managerIds);
    } else if (user.login.startsWith('manager')) {
      managerId = director.id;
    }

    await prisma.employeeProfile.create({
      data: {
        id: uuid(),
        userId: user.id,
        workRoleId: randomElement(workRoles).id,
        managerId,
        plannedHoursPerYear: randomInt(1600, 2000) * 60,
      },
    });
  }

  return users;
}

async function createFormulaConfigurations(adminUser: any) {
  const formulaDefs = [
    { name: 'ndfl_rate', formulaType: 'NDFL', value: 1300, description: 'НДФЛ 13%' },
    {
      name: 'insurance_rate',
      formulaType: 'INSURANCE',
      value: 3020,
      description: 'Страховые взносы 30.2%',
    },
    {
      name: 'reserve_vacation_rate',
      formulaType: 'RESERVE',
      value: 1210,
      description: 'Резерв отпускных 12.1%',
    },
    {
      name: 'manager_eval_excellent',
      formulaType: 'MANAGER_EVAL',
      value: 13000,
      description: 'Оценка руководителя: Отлично (130%)',
    },
    {
      name: 'manager_eval_good',
      formulaType: 'MANAGER_EVAL',
      value: 11000,
      description: 'Оценка руководителя: Хорошо (110%)',
    },
    {
      name: 'manager_eval_satisfactory',
      formulaType: 'MANAGER_EVAL',
      value: 10000,
      description: 'Оценка руководителя: Удовлетворительно (100%)',
    },
    {
      name: 'manager_eval_unsatisfactory',
      formulaType: 'MANAGER_EVAL',
      value: 7000,
      description: 'Оценка руководителя: Неудовлетворительно (70%)',
    },
    {
      name: 'business_eval_direct_profit',
      formulaType: 'BUSINESS_EVAL',
      value: 15000,
      description: 'Прямая выгода (150%)',
    },
    {
      name: 'business_eval_obvious_benefit',
      formulaType: 'BUSINESS_EVAL',
      value: 12500,
      description: 'Польза очевидна (125%)',
    },
    {
      name: 'business_eval_useful',
      formulaType: 'BUSINESS_EVAL',
      value: 10000,
      description: 'Полезно (100%)',
    },
    {
      name: 'business_eval_neutral',
      formulaType: 'BUSINESS_EVAL',
      value: 8000,
      description: 'Нейтрально (80%)',
    },
  ];

  const formulas = [];
  for (const def of formulaDefs) {
    const formula = await prisma.formulaConfiguration.create({
      data: {
        id: uuid(),
        name: def.name,
        formulaType: def.formulaType,
        value: def.value,
        description: def.description,
        isActive: true,
        createdById: adminUser.id,
      },
    });
    formulas.push(formula);
  }
  return formulas;
}

async function createEvaluationScales() {
  const scaleDefs = [
    { scaleType: 'MANAGER', name: 'Отлично', percent: 13000, sortOrder: 1, isDefault: false },
    { scaleType: 'MANAGER', name: 'Хорошо', percent: 11000, sortOrder: 2, isDefault: true },
    {
      scaleType: 'MANAGER',
      name: 'Удовлетворительно',
      percent: 10000,
      sortOrder: 3,
      isDefault: false,
    },
    {
      scaleType: 'MANAGER',
      name: 'Неудовлетворительно',
      percent: 7000,
      sortOrder: 4,
      isDefault: false,
    },
    {
      scaleType: 'BUSINESS',
      name: 'Прямая выгода',
      percent: 15000,
      sortOrder: 1,
      isDefault: false,
    },
    {
      scaleType: 'BUSINESS',
      name: 'Польза очевидна',
      percent: 12500,
      sortOrder: 2,
      isDefault: false,
    },
    { scaleType: 'BUSINESS', name: 'Полезно', percent: 10000, sortOrder: 3, isDefault: true },
    { scaleType: 'BUSINESS', name: 'Нейтрально', percent: 8000, sortOrder: 4, isDefault: false },
  ];

  const scales = [];
  for (const def of scaleDefs) {
    const scale = await prisma.evaluationScale.create({
      data: {
        id: uuid(),
        scaleType: def.scaleType,
        name: def.name,
        percent: def.percent,
        sortOrder: def.sortOrder,
        isDefault: def.isDefault,
      },
    });
    scales.push(scale);
  }
  return scales;
}

async function createReportingPeriods(adminUser: any) {
  const now = new Date();
  const periods = [];

  for (let i = 0; i < PERIOD_COUNT; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    let state: string;
    if (i === 0) state = 'PLANNING';
    else if (i === 1) state = 'IN_PROGRESS';
    else state = 'CLOSED';

    const period = await prisma.reportingPeriod.create({
      data: {
        id: uuid(),
        month,
        year,
        state,
        workHoursPerMonth: 160 * 60,
        reservePercent: 3000,
        testPercent: 2000,
        debugPercent: 3000,
        mgmtPercent: 1000,
        yellowThreshold: 8000,
        redThreshold: 10000,
        closedAt: state === 'CLOSED' ? new Date(d.getFullYear(), d.getMonth() + 1, 5) : null,
        createdById: adminUser.id,
      },
    });
    periods.push(period);
  }
  return periods;
}

async function createIssues(users: any[]) {
  const issues: any[] = [];
  const employees = users.filter(
    (u: any) => u.login.startsWith('employee') || u.login.startsWith('manager'),
  );

  // Create 20 epic-level issues
  const epicIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const id = uuid();
    epicIds.push(id);
    const issue = await prisma.youTrackIssue.create({
      data: {
        id,
        youtrackId: `EPIC-${String(i + 1).padStart(4, '0')}`,
        issueNumber: `EPIC-${i + 1}`,
        summary: `Эпик: ${PROJECT_NAMES[i % PROJECT_COUNT]} — стратегическая инициатива ${i + 1}`,
        description: `Описание эпической задачи по проекту ${PROJECT_NAMES[i % PROJECT_COUNT]}`,
        projectName: PROJECT_NAMES[i % PROJECT_COUNT],
        systemName: SYSTEM_NAMES[i % SYSTEM_NAMES.length],
        typeName: 'Epic',
        isResolved: Math.random() > 0.6,
        assigneeId: randomElement(employees).id,
        reporterId: randomElement(users).id,
        estimationMinutes: randomInt(4000, 20000),
      },
    });
    issues.push(issue);
  }

  // Create 80 feature-level issues (children of epics)
  const featureIds: string[] = [];
  for (let i = 0; i < 80; i++) {
    const id = uuid();
    featureIds.push(id);
    const issue = await prisma.youTrackIssue.create({
      data: {
        id,
        youtrackId: `FEATURE-${String(i + 1).padStart(4, '0')}`,
        issueNumber: `FEATURE-${i + 1}`,
        summary: `Фича: реализация функционала #${i + 1}`,
        description: `Описание функциональности для эпика`,
        projectName: PROJECT_NAMES[i % PROJECT_COUNT],
        systemName: SYSTEM_NAMES[(i + 3) % SYSTEM_NAMES.length],
        typeName: 'Feature',
        isResolved: Math.random() > 0.5,
        assigneeId: randomElement(employees).id,
        reporterId: randomElement(users).id,
        parentIssueId: epicIds[i % epicIds.length],
        parentYtId: `EPIC-${(i % epicIds.length) + 1}`,
        estimationMinutes: randomInt(1000, 8000),
      },
    });
    issues.push(issue);
  }

  // Create 200 story-level issues (children of features)
  for (let i = 0; i < 200; i++) {
    const id = uuid();
    const issue = await prisma.youTrackIssue.create({
      data: {
        id,
        youtrackId: `STORY-${String(i + 1).padStart(4, '0')}`,
        issueNumber: `STORY-${i + 1}`,
        summary: `История: пользовательский сценарий #${i + 1}`,
        description: `Как пользователь, я хочу...`,
        projectName: PROJECT_NAMES[(i + 5) % PROJECT_COUNT],
        systemName: SYSTEM_NAMES[(i + 7) % SYSTEM_NAMES.length],
        typeName: 'Story',
        isResolved: Math.random() > 0.4,
        assigneeId: randomElement(employees).id,
        reporterId: randomElement(users).id,
        parentIssueId: featureIds[i % featureIds.length],
        parentYtId: `FEATURE-${(i % featureIds.length) + 1}`,
        estimationMinutes: randomInt(200, 2000),
      },
    });
    issues.push(issue);
  }

  // Create 200 task-level issues (children of stories)
  const storyIds = issues.filter((i: any) => i.typeName === 'Story').map((i: any) => i.id);
  for (let i = 0; i < 200; i++) {
    const id = uuid();
    const issue = await prisma.youTrackIssue.create({
      data: {
        id,
        youtrackId: `TASK-${String(i + 1).padStart(4, '0')}`,
        issueNumber: `TASK-${i + 1}`,
        summary: `Задача: конкретная работа #${i + 1}`,
        description: `Описание конкретной задачи по реализации`,
        projectName: PROJECT_NAMES[(i + 11) % PROJECT_COUNT],
        systemName: SYSTEM_NAMES[(i + 13) % SYSTEM_NAMES.length],
        typeName: 'Task',
        isResolved: Math.random() > 0.3,
        assigneeId: randomElement(employees).id,
        reporterId: randomElement(users).id,
        parentIssueId: storyIds[i % storyIds.length],
        parentYtId: `STORY-${(i % storyIds.length) + 1}`,
        estimationMinutes: randomInt(60, 1200),
      },
    });
    issues.push(issue);
  }

  return issues;
}

async function createSprintPlans(periods: any[], adminUser: any) {
  const sprintPlans = [];

  for (const period of periods) {
    const plan = await prisma.sprintPlan.create({
      data: {
        id: uuid(),
        periodId: period.id,
        versionNumber: 1,
        isFixed: period.state === 'CLOSED' || period.state === 'IN_PROGRESS',
        fixedAt: period.state === 'CLOSED' ? new Date() : null,
        fixedBy: period.state === 'CLOSED' ? adminUser.id : null,
      },
    });
    sprintPlans.push(plan);

    if (plan.isFixed) {
      await prisma.sprintPlanVersion.create({
        data: {
          id: uuid(),
          sprintPlanId: plan.id,
          versionNumber: 1,
          snapshot: {
            version: 1,
            tasksCount: Math.floor(PLANNED_TASKS_TOTAL / sprintPlans.length),
            createdAt: new Date().toISOString(),
          },
        },
      });
    }
  }
  return sprintPlans;
}

async function createPlannedTasks(sprintPlans: any[], issues: any[], users: any[]) {
  const plannedTasks = [];
  const employees = users.filter(
    (u: any) => u.login.startsWith('employee') || u.login.startsWith('manager'),
  );
  const taskIssues = issues.filter((i: any) => i.typeName === 'Task' || i.typeName === 'Story');
  const countPerPeriod = Math.floor(PLANNED_TASKS_TOTAL / sprintPlans.length);

  for (const plan of sprintPlans) {
    const planIssues = randomSubset(taskIssues, countPerPeriod);
    for (const issue of planIssues) {
      const planned = await prisma.plannedTask.create({
        data: {
          id: uuid(),
          sprintPlanId: plan.id,
          youtrackIssueId: issue.id,
          assigneeId: issue.assigneeId ?? randomElement(employees).id,
          plannedMinutes: randomInt(120, 4800),
          debugMinutes: randomInt(0, 1200),
          testMinutes: randomInt(0, 600),
          mgmtMinutes: randomInt(0, 300),
          sortOrder: randomInt(0, 100),
        },
      });
      plannedTasks.push(planned);
    }
  }
  return plannedTasks;
}

async function createWorkItems(issues: any[], periods: any[], users: any[]) {
  const workItems = [];
  const employees = users.filter(
    (u: any) => u.login.startsWith('employee') || u.login.startsWith('manager'),
  );
  const taskIssues = issues.filter((i: any) => i.typeName === 'Task' || i.typeName === 'Story');

  for (let i = 0; i < WORK_ITEMS_TOTAL; i++) {
    const issue = randomElement(taskIssues);
    const period = randomElement(periods);
    const author = randomElement(employees);

    const workDate = new Date(
      period.year,
      period.month - 1,
      randomInt(1, 28),
      randomInt(9, 18),
      randomInt(0, 59),
    );

    const workItem = await prisma.workItem.create({
      data: {
        id: uuid(),
        issueId: issue.id,
        youtrackWorkItemId: `wi-${uuid().slice(0, 8)}`,
        authorId: author.id,
        durationMinutes: randomInt(15, 480),
        description: `Работа по задаче ${issue.issueNumber}: ${issue.summary.slice(0, 50)}`,
        workDate,
        workTypeName: randomElement(WORK_TYPE_NAMES),
        periodId: period.id,
      },
    });
    workItems.push(workItem);
  }
  return workItems;
}

async function createPersonalReports(periods: any[], users: any[], issues: any[]) {
  const reports = [];
  const employees = users.filter(
    (u: any) => u.login.startsWith('employee') || u.login.startsWith('manager'),
  );

  for (const period of periods) {
    for (const employee of employees) {
      const employeeWorkItems = await prisma.workItem.findMany({
        where: { authorId: employee.id, periodId: period.id },
      });

      const totalMinutes = employeeWorkItems.reduce(
        (sum: number, wi: any) => sum + wi.durationMinutes,
        0,
      );
      if (totalMinutes === 0) continue;

      const hourlyRate = randomInt(100000, 300000);
      const baseAmount = Math.round((hourlyRate * totalMinutes) / 60);

      const managerPercent = randomElement([7000, 10000, 11000, 13000]);
      const businessPercent = randomElement([8000, 10000, 12500, 15000]);
      const managerAmount = Math.round((baseAmount * managerPercent) / 10000);
      const businessAmount = Math.round((baseAmount * businessPercent) / 10000);

      const totalOnHand = baseAmount + managerAmount + businessAmount;
      const ndfl = Math.round((totalOnHand * 1300) / 10000);
      const insurance = Math.round((totalOnHand * 3020) / 10000);
      const reserveVacation = Math.round((totalOnHand * 1210) / 10000);
      const totalWithTax = totalOnHand + ndfl + insurance + reserveVacation;

      const report = await prisma.personalReport.create({
        data: {
          id: uuid(),
          periodId: period.id,
          userId: employee.id,
          totalBaseAmount: baseAmount,
          totalManagerAmount: managerAmount,
          totalBusinessAmount: businessAmount,
          totalOnHand,
          totalNdfl: ndfl,
          totalInsurance: insurance,
          totalReserve: reserveVacation,
          totalWithTax,
          totalMinutes,
          isFrozen: period.state === 'CLOSED',
        },
      });
      reports.push(report);

      // Create report lines grouped by issue
      const issueGroup = new Map<string, any[]>();
      for (const wi of employeeWorkItems) {
        const key = wi.issueId;
        if (!issueGroup.has(key)) issueGroup.set(key, []);
        issueGroup.get(key)!.push(wi);
      }

      for (const [issueId, items] of issueGroup) {
        const lineMinutes = items.reduce((sum: number, wi: any) => sum + wi.durationMinutes, 0);
        const lineBaseAmount = Math.round((hourlyRate * lineMinutes) / 60);
        const lineManagerAmount = Math.round((lineBaseAmount * managerPercent) / 10000);
        const lineBusinessAmount = Math.round((lineBaseAmount * businessPercent) / 10000);

        const effectiveRate = lineMinutes > 0 ? Math.round(lineBaseAmount / lineMinutes) : 0;
        const lineOnHand = lineBaseAmount + lineManagerAmount + lineBusinessAmount;
        const lineNdfl = Math.round((lineOnHand * 1300) / 10000);
        const lineInsurance = Math.round((lineOnHand * 3020) / 10000);
        const lineReserve = Math.round((lineOnHand * 1210) / 10000);
        const lineTotalWithTax = lineOnHand + lineNdfl + lineInsurance + lineReserve;

        await prisma.personalReportLine.create({
          data: {
            id: uuid(),
            personalReportId: report.id,
            youtrackIssueId: issueId,
            minutes: lineMinutes,
            baseAmount: lineBaseAmount,
            managerPercent,
            managerAmount: lineManagerAmount,
            businessPercent,
            businessAmount: lineBusinessAmount,
            totalOnHand: lineOnHand,
            ndfl: lineNdfl,
            insurance: lineInsurance,
            reserveVacation: lineReserve,
            totalWithTax: lineTotalWithTax,
            effectiveRate,
          },
        });
      }
    }
  }
  return reports;
}

async function createSummaryReports(periods: any[]) {
  const summaries = [];

  for (const period of periods) {
    const personalReports = await prisma.personalReport.findMany({
      where: { periodId: period.id },
    });

    const plannedTasks = await prisma.plannedTask.findMany({
      where: { sprintPlan: { periodId: period.id } },
    });

    const totalPlannedMinutes = plannedTasks.reduce(
      (sum: number, pt: any) => sum + pt.plannedMinutes,
      0,
    );
    const totalActualMinutes = personalReports.reduce(
      (sum: number, pr: any) => sum + pr.totalMinutes,
      0,
    );
    const totalDeviation = totalActualMinutes - totalPlannedMinutes;
    const completionPercent =
      totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 10000) : 0;
    const unfinishedTasks = plannedTasks.filter((pt: any) => {
      return !personalReports.some((pr: any) => pr.userId === pt.assigneeId);
    }).length;

    const summary = await prisma.periodSummaryReport.create({
      data: {
        id: uuid(),
        periodId: period.id,
        totalPlannedMinutes,
        totalActualMinutes,
        totalDeviation,
        completionPercent,
        unplannedMinutes: randomInt(0, 5000),
        unplannedPercent:
          totalPlannedMinutes > 0
            ? Math.round((randomInt(0, 5000) / totalPlannedMinutes) * 10000)
            : 0,
        remainingMinutes: Math.max(0, totalPlannedMinutes - totalActualMinutes),
        unfinishedTasks,
        isFrozen: period.state === 'CLOSED',
        calculatedAt: new Date(),
        dataSnapshot: {
          periodId: period.id,
          state: period.state,
          reportCount: personalReports.length,
          taskCount: plannedTasks.length,
          calculatedAt: new Date().toISOString(),
        },
      },
    });
    summaries.push(summary);
  }
  return summaries;
}

async function createManagerEvaluations(periods: any[], issues: any[], users: any[]) {
  const evaluations = [];
  const managers = users.filter((u: any) => u.login.startsWith('manager'));
  const employees = users.filter((u: any) => u.login.startsWith('employee'));
  const taskIssues = issues.filter((i: any) => i.typeName === 'Task');

  for (const period of periods) {
    for (const manager of managers) {
      const evalCount = randomInt(5, 12);
      const evalEmployees = randomSubset(employees, evalCount);

      for (const emp of evalEmployees) {
        const issue = randomElement(taskIssues);
        const evalType = randomElement(EVAL_TYPES);
        const evaluation = await prisma.managerEvaluation.create({
          data: {
            id: uuid(),
            periodId: period.id,
            youtrackIssueId: issue.id,
            userId: emp.id,
            evaluatedById: manager.id,
            evaluationType: evalType,
            comment: `Оценка руководителя: ${evalType}`,
          },
        });
        evaluations.push(evaluation);
      }
    }
  }
  return evaluations;
}

async function createBusinessEvaluations(periods: any[], issues: any[], users: any[]) {
  const evaluations = [];
  const businessUsers = users.filter((u: any) => u.login.startsWith('business'));
  const taskIssues = issues.filter((i: any) => i.typeName === 'Feature' || i.typeName === 'Story');

  for (const period of periods) {
    for (const bus of businessUsers) {
      const evalCount = randomInt(3, 8);
      const evalIssues = randomSubset(taskIssues, evalCount);

      for (const issue of evalIssues) {
        const evalType = randomElement(BUS_EVAL_TYPES);
        const evaluation = await prisma.businessEvaluation.create({
          data: {
            id: uuid(),
            periodId: period.id,
            youtrackIssueId: issue.id,
            evaluatedById: bus.id,
            evaluationType: evalType,
            comment: `Бизнес-оценка: ${evalType}`,
          },
        });
        evaluations.push(evaluation);
      }
    }
  }
  return evaluations;
}

async function createEmployeeRateHistory(users: any[], adminUser: any) {
  const records = [];
  const rateUsers = users.filter(
    (u: any) => !u.login.startsWith('business') && u.login !== 'admin',
  );

  for (const user of rateUsers) {
    const monthlySalary = randomInt(8000000, 30000000); // 80k-300k rub in kopecks
    const annualMinutes = randomInt(1600, 2000) * 60;
    const hourlyRate = Math.round((monthlySalary * 12) / (annualMinutes / 60));

    const effectiveFrom = new Date(2022, randomInt(0, 11), 1);
    const effectiveTo =
      Math.random() > 0.7
        ? new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth() + randomInt(3, 12), 1)
        : null;

    const record = await prisma.employeeRateHistory.create({
      data: {
        id: uuid(),
        userId: user.id,
        monthlySalary,
        annualMinutes,
        hourlyRate,
        effectiveFrom,
        effectiveTo,
        changedById: adminUser.id,
        changeReason: effectiveTo ? 'Изменение ставки' : 'Начальная ставка',
      },
    });
    records.push(record);

    // Add a second rate history entry for some users
    if (Math.random() > 0.5 && effectiveTo) {
      const newEffectiveFrom = effectiveTo;
      const newMonthlySalary = Math.round(monthlySalary * (1 + randomInt(5, 20) / 100));
      const newHourlyRate = Math.round((newMonthlySalary * 12) / (annualMinutes / 60));

      const record2 = await prisma.employeeRateHistory.create({
        data: {
          id: uuid(),
          userId: user.id,
          monthlySalary: newMonthlySalary,
          annualMinutes,
          hourlyRate: newHourlyRate,
          effectiveFrom: newEffectiveFrom,
          effectiveTo: null,
          changedById: adminUser.id,
          changeReason: 'Индексация ставки',
        },
      });
      records.push(record2);
    }
  }
  return records;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Performance seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
