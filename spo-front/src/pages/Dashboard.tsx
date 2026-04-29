import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  Users,
  Clock,
  FolderKanban,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const projects = [
  {
    code: 'SPO-2401',
    name: 'Внедрение СПО, 1-я очередь',
    manager: 'Иванов П.С.',
    progress: 72,
    status: 'В работе',
    budget: '12 400 000',
    spent: '8 928 000',
  },
  {
    code: 'BNK-2402',
    name: 'Регрессионное тестирование Банк-Клиент',
    manager: 'Смирнова А.В.',
    progress: 45,
    status: 'В работе',
    budget: '5 800 000',
    spent: '2 610 000',
  },
  {
    code: 'DOC-2403',
    name: 'Электронный документооборот, миграция',
    manager: 'Кузнецов Д.А.',
    progress: 91,
    status: 'Закрытие',
    budget: '3 200 000',
    spent: '3 040 000',
  },
  {
    code: 'INF-2404',
    name: 'Инфраструктурный аудит',
    manager: 'Петрова О.И.',
    progress: 18,
    status: 'Старт',
    budget: '1 800 000',
    spent: '324 000',
  },
];

const activity = [
  {
    icon: CheckCircle2,
    color: 'text-success',
    text: 'Табель за 25.04 утверждён руководителем',
    who: 'Орлов В.А.',
    time: '12 мин назад',
  },
  {
    icon: AlertTriangle,
    color: 'text-warning',
    text: 'Превышение плановых часов по проекту BNK-2402',
    who: 'Система',
    time: '1 ч назад',
  },
  {
    icon: CircleDashed,
    color: 'text-info',
    text: 'Создан план на май 2026 — ожидает согласования',
    who: 'Иванов П.С.',
    time: '3 ч назад',
  },
  {
    icon: CheckCircle2,
    color: 'text-success',
    text: 'Период «Март 2026» закрыт, snapshot сохранён',
    who: 'Бухгалтерия',
    time: 'вчера',
  },
];

const tasks = [
  { title: 'Утвердить табели подразделения за неделю', count: 14, urgent: true },
  { title: 'Согласовать план ресурсов на май', count: 3, urgent: true },
  { title: 'Проверить отклонения по проекту BNK-2402', count: 1, urgent: false },
  { title: 'Подписать акты выполненных работ', count: 7, urgent: false },
];

const Dashboard = () => {
  return (
    <>
      <PageHeader
        title="Дашборд руководителя"
        description="Сводная картина по проектам, ресурсам и финансам за текущий открытый период."
        breadcrumbs={[{ label: 'Главная' }, { label: 'Дашборд' }]}
        actions={
          <>
            <Button variant="outline" size="sm">
              Экспорт
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover">
              Новый проект
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Активные проекты"
            value="24"
            icon={FolderKanban}
            delta={{ value: '+3', positive: true }}
            accent="primary"
          />
          <KpiCard
            label="Сотрудники в работе"
            value="186"
            unit="из 204"
            icon={Users}
            delta={{ value: '+5', positive: true }}
            accent="info"
          />
          <KpiCard
            label="Утверждено часов"
            value="22 184"
            unit="ч"
            icon={Clock}
            delta={{ value: '+8.4%', positive: true }}
            accent="success"
          />
          <KpiCard
            label="Освоение бюджета"
            value="64.3"
            unit="%"
            icon={Wallet}
            delta={{ value: '−2.1 п.п.', positive: false }}
            accent="warning"
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Проекты */}
          <section className="lg:col-span-2 bg-card border border-border rounded-lg shadow-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Ключевые проекты</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Прогресс и освоение бюджета</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-hover gap-1"
              >
                Все проекты <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left font-medium text-xs text-muted-foreground uppercase tracking-wide px-5 py-2.5">
                      Шифр
                    </th>
                    <th className="text-left font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2.5">
                      Название
                    </th>
                    <th className="text-left font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2.5">
                      Руководитель
                    </th>
                    <th className="text-left font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2.5 w-40">
                      Прогресс
                    </th>
                    <th className="text-right font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2.5">
                      Освоено / Бюджет, ₽
                    </th>
                    <th className="text-left font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2.5">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.code}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {p.code}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{p.manager}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={p.progress} className="h-1.5" />
                          <span className="text-xs text-muted-foreground num-tabular w-9 text-right">
                            {p.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right num-tabular">
                        <div className="text-foreground">{p.spent}</div>
                        <div className="text-xs text-muted-foreground">из {p.budget}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={
                            p.status === 'Закрытие'
                              ? 'border-success/30 text-success bg-success/5'
                              : p.status === 'Старт'
                                ? 'border-info/30 text-info bg-info/5'
                                : 'border-primary/30 text-primary bg-primary/5'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Задачи */}
          <section className="bg-card border border-border rounded-lg shadow-card">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Требуют действия</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Назначено вам сегодня</p>
            </div>
            <ul className="divide-y divide-border">
              {tasks.map((t, i) => (
                <li
                  key={i}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        t.urgent ? 'bg-destructive' : 'bg-muted-foreground/40'
                      }`}
                    />
                    <span className="text-sm text-foreground leading-snug">{t.title}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 num-tabular">
                    {t.count}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Активность + сводка */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-card border border-border rounded-lg shadow-card">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Лента событий</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Транзакционные события и аудит</p>
            </div>
            <ul className="divide-y divide-border">
              {activity.map((a, i) => (
                <li key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <a.icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.who} · {a.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-gradient-kpi text-primary-foreground rounded-lg p-5 shadow-elevated flex flex-col">
            <p className="text-xs uppercase tracking-wider text-primary-foreground/70">Период</p>
            <h3 className="text-lg font-semibold mt-1">Апрель 2026</h3>
            <div className="mt-4 space-y-3 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-primary-foreground/80">Закрытие через</span>
                <span className="font-semibold num-tabular">5 дн.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-primary-foreground/80">Табелей не утверждено</span>
                <span className="font-semibold num-tabular">38</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-primary-foreground/80">Расхождений по часам</span>
                <span className="font-semibold num-tabular">7</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-0"
            >
              Перейти к закрытию
            </Button>
          </section>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
