"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
const react_1 = require("react");
const auth_1 = require("@/lib/auth");
const PageHeader_1 = require("@/components/layout/PageHeader");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const skeleton_1 = require("@/components/ui/skeleton");
const lucide_react_1 = require("lucide-react");
const MONTHS_RU = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Окторябрь', 'Ноябрь', 'Декабрь'];
const STATE_LABEL = {
    PLANNING: 'Планирование',
    ACTIVE: 'Активен',
    CLOSING: 'Закрывается',
    CLOSED: 'Закрыт',
};
function Dashboard() {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch('/api/dashboard/stats', {
                headers: {
                    Authorization: 'Bearer ' + (0, auth_1.getAccessToken)(),
                    'Content-Type': 'application/json',
                },
            });
            if (!resp.ok)
                throw new Error('HTTP ' + resp.status);
            const json = await resp.json();
            const data = json.data || json;
            setStats(data);
        }
        catch (e) {
            setError(e.message || 'Ошибка загрузки');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchStats();
    }, []);
    const kpiCards = [
        {
            title: 'Проекты',
            value: stats?.totalProjects ?? '\u2014',
            icon: lucide_react_1.Briefcase,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Сотрудники',
            value: stats?.totalEmployees ?? '\u2014',
            icon: lucide_react_1.Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            title: 'Часов учтено',
            value: stats ? (stats.totalHoursLogged > 1000 ? Math.round(stats.totalHoursLogged / 100) / 10 + 'k' : stats.totalHoursLogged) : '\u2014',
            icon: lucide_react_1.Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            title: 'Выполнено',
            value: stats ? stats.completionRate + '%' : '\u2014',
            icon: lucide_react_1.TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
    ];
    return (<>
      <PageHeader_1.PageHeader title="Панель управления" description={stats?.activePeriod
            ? `${MONTHS_RU[stats.activePeriod.month]} ${stats.activePeriod.year} \u00b7 ${STATE_LABEL[stats.activePeriod.state] || stats.activePeriod.state}`
            : 'Нет активного периода'}>
        <button onClick={fetchStats} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <lucide_react_1.RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}/>
          Обновить
        </button>
      </PageHeader_1.PageHeader>

      {error && (<div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-destructive/5 border border-destructive/20 text-sm text-destructive">
          <lucide_react_1.AlertCircle className="h-4 w-4 shrink-0"/>
          <span>Ошибка загрузки: {error}</span>
        </div>)}

      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((card) => (<card_1.Card key={card.title} className="shadow-card">
            <card_1.CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{card.title}</p>
                  {loading ? (<skeleton_1.Skeleton className="h-7 w-16 mt-1"/>) : (<p className="text-2xl font-bold mt-0.5">{card.value}</p>)}
                </div>
                <div className={`p-2 rounded-full ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`}/>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <card_1.Card className="shadow-card">
          <card_1.CardHeader className="px-4 py-3 border-b border-border">
            <card_1.CardTitle className="text-sm font-semibold">Команда</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="p-4">
            {loading ? (<div className="space-y-2">
                <skeleton_1.Skeleton className="h-4 w-full"/>
                <skeleton_1.Skeleton className="h-4 w-3/4"/>
              </div>) : stats ? (<div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Всего пользователей</span>
                  <span className="font-semibold">{stats.teamsOverview.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Синхронизировано из YouTrack</span>
                  <span className="font-semibold">{stats.teamsOverview.syncedUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">С установленными ставками</span>
                  <span className="font-semibold">{stats.teamsOverview.withRates}</span>
                </div>
              </div>) : (<p className="text-sm text-muted-foreground">Нет данных</p>)}
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card className="shadow-card">
          <card_1.CardHeader className="px-4 py-3 border-b border-border">
            <card_1.CardTitle className="text-sm font-semibold">YouTrack</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="p-4">
            {loading ? (<div className="space-y-2">
                <skeleton_1.Skeleton className="h-4 w-full"/>
                <skeleton_1.Skeleton className="h-4 w-3/4"/>
              </div>) : stats ? (<div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Всего задач</span>
                  <span className="font-semibold">{stats.syncedIssues}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Обновлено за 30 дней</span>
                  <span className="font-semibold">{stats.recentIssues}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Проектов</span>
                  <span className="font-semibold">{stats.totalProjects}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Выполнено задач</span>
                  <badge_1.Badge variant="outline" className="text-[11px]">
                    {stats.completionRate}%
                  </badge_1.Badge>
                </div>
              </div>) : (<p className="text-sm text-muted-foreground">Нет данных</p>)}
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>);
}
//# sourceMappingURL=Dashboard.js.map