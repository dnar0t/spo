"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto = __importStar(require("node:crypto"));
const prisma = new client_1.PrismaClient();
function uuid() {
    return crypto.randomUUID();
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomSubset(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
}
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
async function main() {
    console.log('🚀 Starting performance dataset seeding...\n');
    const startTime = Date.now();
    const roles = await createRoles();
    console.log(`  ✓ Created ${roles.length} roles`);
    const workRoles = await createWorkRoles();
    console.log(`  ✓ Created ${workRoles.length} work roles`);
    const users = await createUsers(roles, workRoles);
    console.log(`  ✓ Created ${users.length} users with profiles`);
    const formulas = await createFormulaConfigurations(users[0]);
    console.log(`  ✓ Created ${formulas.length} formula configurations`);
    const scales = await createEvaluationScales();
    console.log(`  ✓ Created ${scales.length} evaluation scales`);
    const periods = await createReportingPeriods(users[0]);
    console.log(`  ✓ Created ${periods.length} reporting periods`);
    const issues = await createIssues(users);
    console.log(`  ✓ Created ${issues.length} issues with hierarchy`);
    const sprintPlans = await createSprintPlans(periods, users[0]);
    console.log(`  ✓ Created ${sprintPlans.length} sprint plans`);
    const plannedTasks = await createPlannedTasks(sprintPlans, issues, users);
    console.log(`  ✓ Created ${plannedTasks.length} planned tasks`);
    const workItems = await createWorkItems(issues, periods, users);
    console.log(`  ✓ Created ${workItems.length} work items`);
    const personalReports = await createPersonalReports(periods, users, issues);
    console.log(`  ✓ Created ${personalReports.length} personal reports with lines`);
    const summaries = await createSummaryReports(periods);
    console.log(`  ✓ Created ${summaries.length} period summary reports`);
    const managerEvals = await createManagerEvaluations(periods, issues, users);
    console.log(`  ✓ Created ${managerEvals.length} manager evaluations`);
    const businessEvals = await createBusinessEvaluations(periods, issues, users);
    console.log(`  ✓ Created ${businessEvals.length} business evaluations`);
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
async function createUsers(roles, workRoles) {
    const users = [];
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
        data: { userId: admin.id, roleId: roles.find((r) => r.name === 'admin').id },
    });
    users.push(admin);
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
        data: { userId: director.id, roleId: roles.find((r) => r.name === 'director').id },
    });
    await prisma.userRole.create({
        data: { userId: director.id, roleId: roles.find((r) => r.name === 'manager').id },
    });
    users.push(director);
    const managerIds = [];
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
            data: { userId: mgr.id, roleId: roles.find((r) => r.name === 'manager').id },
        });
        await prisma.userRole.create({
            data: { userId: mgr.id, roleId: roles.find((r) => r.name === 'employee').id },
        });
        users.push(mgr);
        managerIds.push(mgr.id);
    }
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
            data: { userId: bus.id, roleId: roles.find((r) => r.name === 'business').id },
        });
        users.push(bus);
    }
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
        data: { userId: accountant.id, roleId: roles.find((r) => r.name === 'accountant').id },
    });
    users.push(accountant);
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
            data: { userId: emp.id, roleId: roles.find((r) => r.name === 'employee').id },
        });
        users.push(emp);
    }
    const employeeUsers = users.slice(1);
    for (const user of employeeUsers) {
        let managerId = null;
        if (user.login.startsWith('employee')) {
            managerId = randomElement(managerIds);
        }
        else if (user.login.startsWith('manager')) {
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
async function createFormulaConfigurations(adminUser) {
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
async function createReportingPeriods(adminUser) {
    const now = new Date();
    const periods = [];
    for (let i = 0; i < PERIOD_COUNT; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        let state;
        if (i === 0)
            state = 'PLANNING';
        else if (i === 1)
            state = 'IN_PROGRESS';
        else
            state = 'CLOSED';
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
async function createIssues(users) {
    const issues = [];
    const employees = users.filter((u) => u.login.startsWith('employee') || u.login.startsWith('manager'));
    const epicIds = [];
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
    const featureIds = [];
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
    const storyIds = issues.filter((i) => i.typeName === 'Story').map((i) => i.id);
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
async function createSprintPlans(periods, adminUser) {
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
async function createPlannedTasks(sprintPlans, issues, users) {
    const plannedTasks = [];
    const employees = users.filter((u) => u.login.startsWith('employee') || u.login.startsWith('manager'));
    const taskIssues = issues.filter((i) => i.typeName === 'Task' || i.typeName === 'Story');
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
async function createWorkItems(issues, periods, users) {
    const workItems = [];
    const employees = users.filter((u) => u.login.startsWith('employee') || u.login.startsWith('manager'));
    const taskIssues = issues.filter((i) => i.typeName === 'Task' || i.typeName === 'Story');
    for (let i = 0; i < WORK_ITEMS_TOTAL; i++) {
        const issue = randomElement(taskIssues);
        const period = randomElement(periods);
        const author = randomElement(employees);
        const workDate = new Date(period.year, period.month - 1, randomInt(1, 28), randomInt(9, 18), randomInt(0, 59));
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
async function createPersonalReports(periods, users, issues) {
    const reports = [];
    const employees = users.filter((u) => u.login.startsWith('employee') || u.login.startsWith('manager'));
    for (const period of periods) {
        for (const employee of employees) {
            const employeeWorkItems = await prisma.workItem.findMany({
                where: { authorId: employee.id, periodId: period.id },
            });
            const totalMinutes = employeeWorkItems.reduce((sum, wi) => sum + wi.durationMinutes, 0);
            if (totalMinutes === 0)
                continue;
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
            const issueGroup = new Map();
            for (const wi of employeeWorkItems) {
                const key = wi.issueId;
                if (!issueGroup.has(key))
                    issueGroup.set(key, []);
                issueGroup.get(key).push(wi);
            }
            for (const [issueId, items] of issueGroup) {
                const lineMinutes = items.reduce((sum, wi) => sum + wi.durationMinutes, 0);
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
async function createSummaryReports(periods) {
    const summaries = [];
    for (const period of periods) {
        const personalReports = await prisma.personalReport.findMany({
            where: { periodId: period.id },
        });
        const plannedTasks = await prisma.plannedTask.findMany({
            where: { sprintPlan: { periodId: period.id } },
        });
        const totalPlannedMinutes = plannedTasks.reduce((sum, pt) => sum + pt.plannedMinutes, 0);
        const totalActualMinutes = personalReports.reduce((sum, pr) => sum + pr.totalMinutes, 0);
        const totalDeviation = totalActualMinutes - totalPlannedMinutes;
        const completionPercent = totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 10000) : 0;
        const unfinishedTasks = plannedTasks.filter((pt) => {
            return !personalReports.some((pr) => pr.userId === pt.assigneeId);
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
                unplannedPercent: totalPlannedMinutes > 0
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
async function createManagerEvaluations(periods, issues, users) {
    const evaluations = [];
    const managers = users.filter((u) => u.login.startsWith('manager'));
    const employees = users.filter((u) => u.login.startsWith('employee'));
    const taskIssues = issues.filter((i) => i.typeName === 'Task');
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
async function createBusinessEvaluations(periods, issues, users) {
    const evaluations = [];
    const businessUsers = users.filter((u) => u.login.startsWith('business'));
    const taskIssues = issues.filter((i) => i.typeName === 'Feature' || i.typeName === 'Story');
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
async function createEmployeeRateHistory(users, adminUser) {
    const records = [];
    const rateUsers = users.filter((u) => !u.login.startsWith('business') && u.login !== 'admin');
    for (const user of rateUsers) {
        const monthlySalary = randomInt(8000000, 30000000);
        const annualMinutes = randomInt(1600, 2000) * 60;
        const hourlyRate = Math.round((monthlySalary * 12) / (annualMinutes / 60));
        const effectiveFrom = new Date(2022, randomInt(0, 11), 1);
        const effectiveTo = Math.random() > 0.7
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
//# sourceMappingURL=seed-performance.js.map