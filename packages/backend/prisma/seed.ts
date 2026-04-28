import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Roles ───
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        id: 'role-admin',
        name: 'admin',
        description: 'Администратор системы',
      },
    }),
    prisma.role.upsert({
      where: { name: 'director' },
      update: {},
      create: {
        id: 'role-director',
        name: 'director',
        description: 'Директор',
      },
    }),
    prisma.role.upsert({
      where: { name: 'manager' },
      update: {},
      create: {
        id: 'role-manager',
        name: 'manager',
        description: 'Руководитель',
      },
    }),
    prisma.role.upsert({
      where: { name: 'employee' },
      update: {},
      create: {
        id: 'role-employee',
        name: 'employee',
        description: 'Сотрудник',
      },
    }),
    prisma.role.upsert({
      where: { name: 'business' },
      update: {},
      create: {
        id: 'role-business',
        name: 'business',
        description: 'Бизнес-роль (заказчик)',
      },
    }),
    prisma.role.upsert({
      where: { name: 'accountant' },
      update: {},
      create: {
        id: 'role-accountant',
        name: 'accountant',
        description: 'Бухгалтер',
      },
    }),
    prisma.role.upsert({
      where: { name: 'viewer' },
      update: {},
      create: {
        id: 'role-viewer',
        name: 'viewer',
        description: 'Наблюдатель',
      },
    }),
  ]);

  console.log(`  ✓ Created ${roles.length} roles`);

  // ─── Work Roles ───
  const workRoles = await Promise.all([
    prisma.workRole.upsert({
      where: { name: 'development' },
      update: {},
      create: {
        id: 'wr-development',
        name: 'development',
        description: 'Разработка',
      },
    }),
    prisma.workRole.upsert({
      where: { name: 'testing' },
      update: {},
      create: {
        id: 'wr-testing',
        name: 'testing',
        description: 'Тестирование',
      },
    }),
    prisma.workRole.upsert({
      where: { name: 'management' },
      update: {},
      create: {
        id: 'wr-management',
        name: 'management',
        description: 'Управление',
      },
    }),
    prisma.workRole.upsert({
      where: { name: 'other' },
      update: {},
      create: {
        id: 'wr-other',
        name: 'other',
        description: 'Другое',
      },
    }),
  ]);

  console.log(`  ✓ Created ${workRoles.length} work roles`);

  // ─── Admin User ───
  const adminUser = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      id: 'user-admin',
      login: 'admin',
      email: 'admin@spo.local',
      fullName: 'Администратор Системы',
      isActive: true,
      isBlocked: false,
    },
  });

  console.log(`  ✓ Created admin user: ${adminUser.login}`);

  // ─── Assign admin role to admin user ───
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: 'role-admin' } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: 'role-admin',
    },
  });

  console.log('  ✓ Assigned admin role to admin user');

  // ─── Evaluation Scales (Formula Configurations) ───
  const formulas = [
    // Manager evaluation scales
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
    // Business evaluation scales
    {
      name: 'business_eval_direct_profit',
      formulaType: 'BUSINESS_EVAL',
      value: 15000,
      description: 'Оценка бизнеса: Прямая выгода (150%)',
    },
    {
      name: 'business_eval_obvious_benefit',
      formulaType: 'BUSINESS_EVAL',
      value: 12500,
      description: 'Оценка бизнеса: Польза очевидна (125%)',
    },
    {
      name: 'business_eval_useful',
      formulaType: 'BUSINESS_EVAL',
      value: 10000,
      description: 'Оценка бизнеса: Полезно (100%)',
    },
    {
      name: 'business_eval_neutral',
      formulaType: 'BUSINESS_EVAL',
      value: 8000,
      description: 'Оценка бизнеса: Нейтрально (80%)',
    },
    // Base percent (базовый процент для расчёта зарплаты, ТЗ §14.5)
    {
      name: 'base_percent',
      formulaType: 'BASE_PERCENT',
      value: 7000,
      description: 'Базовый процент: 70% (0.7) — basis points 7000',
    },
    // Tax formulas
    { name: 'ndfl_rate', formulaType: 'NDFL', value: 1300, description: 'НДФЛ: 13%' },
    {
      name: 'insurance_rate',
      formulaType: 'INSURANCE',
      value: 3020,
      description: 'Страховые взносы: 30.2%',
    },
    {
      name: 'reserve_vacation_rate',
      formulaType: 'RESERVE',
      value: 1210,
      description: 'Резерв отпускных: 12.1%',
    },
  ];

  for (const formula of formulas) {
    await prisma.formulaConfiguration.upsert({
      where: { name: formula.name },
      update: {},
      create: {
        id: `formula-${formula.name}`,
        name: formula.name,
        formulaType: formula.formulaType,
        value: formula.value,
        description: formula.description,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  console.log(`  ✓ Created ${formulas.length} formula configurations`);

  // ─── Default Integration Settings ───
  await prisma.integrationSettings.upsert({
    where: { id: 'integration-default' },
    update: {},
    create: {
      id: 'integration-default',
      baseUrl: '',
      apiTokenEncrypted: '',
      projects: [],
      isActive: false,
    },
  });

  console.log('  ✓ Created default integration settings');

  // ─── Notification Templates ───
  const notificationTemplates = [
    {
      eventName: 'period.opened',
      subject: 'Период {{periodName}} открыт',
      body: 'Период {{periodName}} открыт для планирования.',
    },
    {
      eventName: 'period.closed',
      subject: 'Период {{periodName}} закрыт',
      body: 'Период {{periodName}} закрыт. Отчёты доступны для просмотра.',
    },
    {
      eventName: 'plan.fixed',
      subject: 'План на {{periodName}} зафиксирован',
      body: 'План на период {{periodName}} был зафиксирован.',
    },
    {
      eventName: 'sync.completed',
      subject: 'Синхронизация с YouTrack завершена',
      body: 'Синхронизация завершена: создано {{created}}, обновлено {{updated}}.',
    },
    {
      eventName: 'sync.failed',
      subject: 'Ошибка синхронизации с YouTrack',
      body: 'Синхронизация с YouTrack не удалась: {{error}}.',
    },
    {
      eventName: 'report.ready',
      subject: 'Отчёт за {{periodName}} готов',
      body: 'Итоговый отчёт за период {{periodName}} сформирован.',
    },
  ];

  for (const tmpl of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { eventName: tmpl.eventName },
      update: {},
      create: {
        id: `nt-${tmpl.eventName.replace(/\./g, '-')}`,
        eventName: tmpl.eventName,
        subject: tmpl.subject,
        body: tmpl.body,
        isActive: true,
      },
    });
  }

  console.log(`  ✓ Created ${notificationTemplates.length} notification templates`);

  console.log('\n✅ Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
