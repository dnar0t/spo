import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users, Clock, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  totalEmployees: number;
  totalHoursLogged: number;
  completionRate: number;
  activePeriod: { month: number; year: number; state: string } | null;
  recentIssues: number;
  syncedIssues: number;
  teamsOverview: {
    totalUsers: number;
    syncedUsers: number;
    withRates: number;
  };
}

const MONTHS_RU = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Окторябрь', 'Ноябрь', 'Декабрь'];

const STATE_LABEL: Record<string, string> = {
  PLANNING: 'Планирование',
  ACTIVE: 'Активен',
  CLOSING: 'Закрывается',
  CLOSED: 'Закрыт',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: 'Bearer ' + getAccessToken(),
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      const data = json.data || json;
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const kpiCards = [
    {
      title: 'Проекты',
      value: stats?.totalProjects ?? '\u2014',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Сотрудники',
      value: stats?.totalEmployees ?? '\u2014',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Часов учтено',
      value: stats ? (stats.totalHoursLogged > 1000 ? Math.round(stats.totalHoursLogged / 100) / 10 + 'k' : stats.totalHoursLogged) : '\u2014',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Выполнено',
      value: stats ? stats.completionRate + '%' : '\u2014',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <>
      <PageHeader
        title="Панель управления"
        description={
          stats?.activePeriod
            ? `${MONTHS_RU[stats.activePeriod.month]} ${stats.activePeriod.year} \u00b7 ${STATE_LABEL[stats.activePeriod.state] || stats.activePeriod.state}`
            : 'Нет активного периода'
        }
      >
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-destructive/5 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Ошибка загрузки: {error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((card) => (
          <Card key={card.title} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{card.title}</p>
                  {loading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5">{card.value}</p>
                  )}
                </div>
                <div className={`p-2 rounded-full ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Teams overview */}
        <Card className="shadow-card">
          <CardHeader className="px-4 py-3 border-b border-border">
            <CardTitle className="text-sm font-semibold">Команда</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : stats ? (
              <div className="space-y-3">
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Sync & Issues */}
        <Card className="shadow-card">
          <CardHeader className="px-4 py-3 border-b border-border">
            <CardTitle className="text-sm font-semibold">YouTrack</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : stats ? (
              <div className="space-y-3">
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
                  <Badge variant="outline" className="text-[11px]">
                    {stats.completionRate}%
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

