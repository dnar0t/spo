import {
  LayoutDashboard,
  CalendarRange,
  ClipboardList,
  Users,
  BarChart3,
  Wallet,
  Coins,
  Lock,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const operational = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Планирование", url: "/planning", icon: CalendarRange },
  { title: "Табели", url: "/timesheets", icon: ClipboardList },
];

const analytics = [
  { title: "Отчёты", url: "/reports", icon: BarChart3 },
  { title: "Финансы", url: "/finance", icon: Wallet },
  { title: "Ставки сотрудников", url: "/salary-rates", icon: Coins },
  { title: "Закрытие периода", url: "/period-close", icon: Lock },
];

const administration = [
  { title: "Пользователи и роли", url: "/users", icon: Users },
  { title: "Аудит и безопасность", url: "/audit", icon: ShieldCheck },
  { title: "Настройки", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const renderGroup = (label: string, items: typeof operational) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <NavLink to={item.url} end={item.url === "/"}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-[11px]">
            СПО
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground tracking-wide">INFOMATIX</span>
              <span className="text-[11px] text-sidebar-foreground/60">
                Планирование и отчётность
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Оперативная работа", operational)}
        {renderGroup("Аналитика и финансы", analytics)}
        {renderGroup("Администрирование", administration)}
      </SidebarContent>
    </Sidebar>
  );
}
