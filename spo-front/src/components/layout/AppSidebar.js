"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSidebar = AppSidebar;
const lucide_react_1 = require("lucide-react");
const NavLink_1 = require("@/components/NavLink");
const react_router_dom_1 = require("react-router-dom");
const sidebar_1 = require("@/components/ui/sidebar");
const operational = [
    { title: "Дашборд", url: "/", icon: lucide_react_1.LayoutDashboard },
    { title: "Планирование", url: "/planning", icon: lucide_react_1.CalendarRange },
    { title: "Табели", url: "/timesheets", icon: lucide_react_1.ClipboardList },
];
const analytics = [
    { title: "Отчёты", url: "/reports", icon: lucide_react_1.BarChart3 },
    { title: "Финансы", url: "/finance", icon: lucide_react_1.Wallet },
    { title: "Ставки сотрудников", url: "/salary-rates", icon: lucide_react_1.Coins },
    { title: "Закрытие периода", url: "/period-close", icon: lucide_react_1.Lock },
];
const administration = [
    { title: "Пользователи и роли", url: "/users", icon: lucide_react_1.Users },
    { title: "Аудит и безопасность", url: "/audit", icon: lucide_react_1.ShieldCheck },
    { title: "Настройки", url: "/settings", icon: lucide_react_1.Settings },
];
function AppSidebar() {
    const { state } = (0, sidebar_1.useSidebar)();
    const collapsed = state === "collapsed";
    const location = (0, react_router_dom_1.useLocation)();
    const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    const renderGroup = (label, items) => (<sidebar_1.SidebarGroup>
      {!collapsed && (<sidebar_1.SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
          {label}
        </sidebar_1.SidebarGroupLabel>)}
      <sidebar_1.SidebarGroupContent>
        <sidebar_1.SidebarMenu>
          {items.map((item) => (<sidebar_1.SidebarMenuItem key={item.url}>
              <sidebar_1.SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
                <NavLink_1.NavLink to={item.url} end={item.url === "/"}>
                  <item.icon className="h-4 w-4 shrink-0"/>
                  {!collapsed && <span>{item.title}</span>}
                </NavLink_1.NavLink>
              </sidebar_1.SidebarMenuButton>
            </sidebar_1.SidebarMenuItem>))}
        </sidebar_1.SidebarMenu>
      </sidebar_1.SidebarGroupContent>
    </sidebar_1.SidebarGroup>);
    return (<sidebar_1.Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <sidebar_1.SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-[11px]">
            СПО
          </div>
          {!collapsed && (<div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground tracking-wide">INFOMATIX</span>
              <span className="text-[11px] text-sidebar-foreground/60">
                Планирование и отчётность
              </span>
            </div>)}
        </div>
      </sidebar_1.SidebarHeader>

      <sidebar_1.SidebarContent>
        {renderGroup("Оперативная работа", operational)}
        {renderGroup("Аналитика и финансы", analytics)}
        {renderGroup("Администрирование", administration)}
      </sidebar_1.SidebarContent>
    </sidebar_1.Sidebar>);
}
//# sourceMappingURL=AppSidebar.js.map