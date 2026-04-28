"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var roles, workRoles, adminUser, formulas, _i, formulas_1, formula, notificationTemplates, _a, notificationTemplates_1, tmpl;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Seeding database...');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 1:
                    roles = _b.sent();
                    console.log("  \u2713 Created ".concat(roles.length, " roles"));
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 2:
                    workRoles = _b.sent();
                    console.log("  \u2713 Created ".concat(workRoles.length, " work roles"));
                    return [4 /*yield*/, prisma.user.upsert({
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
                        })];
                case 3:
                    adminUser = _b.sent();
                    console.log("  \u2713 Created admin user: ".concat(adminUser.login));
                    // ─── Assign admin role to admin user ───
                    return [4 /*yield*/, prisma.userRole.upsert({
                            where: { userId_roleId: { userId: adminUser.id, roleId: 'role-admin' } },
                            update: {},
                            create: {
                                userId: adminUser.id,
                                roleId: 'role-admin',
                            },
                        })];
                case 4:
                    // ─── Assign admin role to admin user ───
                    _b.sent();
                    console.log('  ✓ Assigned admin role to admin user');
                    formulas = [
                        // Manager evaluation scales
                        { name: 'manager_eval_excellent', formulaType: 'MANAGER_EVAL', value: 13000, description: 'Оценка руководителя: Отлично (130%)' },
                        { name: 'manager_eval_good', formulaType: 'MANAGER_EVAL', value: 11000, description: 'Оценка руководителя: Хорошо (110%)' },
                        { name: 'manager_eval_satisfactory', formulaType: 'MANAGER_EVAL', value: 10000, description: 'Оценка руководителя: Удовлетворительно (100%)' },
                        { name: 'manager_eval_unsatisfactory', formulaType: 'MANAGER_EVAL', value: 7000, description: 'Оценка руководителя: Неудовлетворительно (70%)' },
                        // Business evaluation scales
                        { name: 'business_eval_direct_profit', formulaType: 'BUSINESS_EVAL', value: 15000, description: 'Оценка бизнеса: Прямая выгода (150%)' },
                        { name: 'business_eval_obvious_benefit', formulaType: 'BUSINESS_EVAL', value: 12500, description: 'Оценка бизнеса: Польза очевидна (125%)' },
                        { name: 'business_eval_useful', formulaType: 'BUSINESS_EVAL', value: 10000, description: 'Оценка бизнеса: Полезно (100%)' },
                        { name: 'business_eval_neutral', formulaType: 'BUSINESS_EVAL', value: 8000, description: 'Оценка бизнеса: Нейтрально (80%)' },
                        // Tax formulas
                        { name: 'ndfl_rate', formulaType: 'NDFL', value: 1300, description: 'НДФЛ: 13%' },
                        { name: 'insurance_rate', formulaType: 'INSURANCE', value: 3020, description: 'Страховые взносы: 30.2%' },
                        { name: 'reserve_vacation_rate', formulaType: 'RESERVE', value: 1210, description: 'Резерв отпускных: 12.1%' },
                    ];
                    _i = 0, formulas_1 = formulas;
                    _b.label = 5;
                case 5:
                    if (!(_i < formulas_1.length)) return [3 /*break*/, 8];
                    formula = formulas_1[_i];
                    return [4 /*yield*/, prisma.formulaConfiguration.upsert({
                            where: { name: formula.name },
                            update: {},
                            create: {
                                id: "formula-".concat(formula.name),
                                name: formula.name,
                                formulaType: formula.formulaType,
                                value: formula.value,
                                description: formula.description,
                                isActive: true,
                                createdById: adminUser.id,
                            },
                        })];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log("  \u2713 Created ".concat(formulas.length, " formula configurations"));
                    // ─── Default Integration Settings ───
                    return [4 /*yield*/, prisma.integrationSettings.upsert({
                            where: { id: 'integration-default' },
                            update: {},
                            create: {
                                id: 'integration-default',
                                baseUrl: '',
                                apiTokenEncrypted: '',
                                projects: [],
                                isActive: false,
                            },
                        })];
                case 9:
                    // ─── Default Integration Settings ───
                    _b.sent();
                    console.log('  ✓ Created default integration settings');
                    notificationTemplates = [
                        { eventName: 'period.opened', subject: 'Период {{periodName}} открыт', body: 'Период {{periodName}} открыт для планирования.' },
                        { eventName: 'period.closed', subject: 'Период {{periodName}} закрыт', body: 'Период {{periodName}} закрыт. Отчёты доступны для просмотра.' },
                        { eventName: 'plan.fixed', subject: 'План на {{periodName}} зафиксирован', body: 'План на период {{periodName}} был зафиксирован.' },
                        { eventName: 'sync.completed', subject: 'Синхронизация с YouTrack завершена', body: 'Синхронизация завершена: создано {{created}}, обновлено {{updated}}.' },
                        { eventName: 'sync.failed', subject: 'Ошибка синхронизации с YouTrack', body: 'Синхронизация с YouTrack не удалась: {{error}}.' },
                        { eventName: 'report.ready', subject: 'Отчёт за {{periodName}} готов', body: 'Итоговый отчёт за период {{periodName}} сформирован.' },
                    ];
                    _a = 0, notificationTemplates_1 = notificationTemplates;
                    _b.label = 10;
                case 10:
                    if (!(_a < notificationTemplates_1.length)) return [3 /*break*/, 13];
                    tmpl = notificationTemplates_1[_a];
                    return [4 /*yield*/, prisma.notificationTemplate.upsert({
                            where: { eventName: tmpl.eventName },
                            update: {},
                            create: {
                                id: "nt-".concat(tmpl.eventName.replace(/\./g, '-')),
                                eventName: tmpl.eventName,
                                subject: tmpl.subject,
                                body: tmpl.body,
                                isActive: true,
                            },
                        })];
                case 11:
                    _b.sent();
                    _b.label = 12;
                case 12:
                    _a++;
                    return [3 /*break*/, 10];
                case 13:
                    console.log("  \u2713 Created ".concat(notificationTemplates.length, " notification templates"));
                    console.log('\n✅ Seeding complete!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error('❌ Seeding failed:', e);
                return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
