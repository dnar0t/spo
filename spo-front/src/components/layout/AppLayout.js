"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLayout = AppLayout;
const react_1 = require("react");
const sidebar_1 = require("@/components/ui/sidebar");
const AppSidebar_1 = require("./AppSidebar");
const lucide_react_1 = require("lucide-react");
const input_1 = require("@/components/ui/input");
const button_1 = require("@/components/ui/button");
const avatar_1 = require("@/components/ui/avatar");
const badge_1 = require("@/components/ui/badge");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const useAuth_1 = require("@/hooks/useAuth");
const AppLayoutCtx = (0, react_1.createContext)(false);
function useAppLayoutNested() {
    return (0, react_1.useContext)(AppLayoutCtx);
}
function getInitials(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0)
        return '??';
    if (parts.length === 1)
        return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}
function getRoleDisplay(roles) {
    if (roles.length === 0)
        return 'Пользователь';
    if (roles.includes('ADMIN'))
        return 'Администратор';
    if (roles.includes('MANAGER'))
        return 'Менеджер';
    if (roles.includes('SUPERVISOR'))
        return 'Руководитель';
    if (roles.includes('EMPLOYEE'))
        return 'Сотрудник';
    return roles[0];
}
function AppLayout({ children }) {
    const isNested = useAppLayoutNested();
    if (isNested) {
        return <>{children}</>;
    }
    const { user, logout } = (0, useAuth_1.useAuth)();
    const displayName = user?.fullName ?? 'Пользователь';
    const roleDisplay = user?.roles ? getRoleDisplay(user.roles) : 'Пользователь';
    const initials = getInitials(displayName);
    const handleLogout = async () => {
        await logout();
    };
    return (<AppLayoutCtx.Provider value={true}>
      <sidebar_1.SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar_1.AppSidebar />

          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-11 flex items-center gap-3 border-b border-border bg-card px-4 sticky top-0 z-30">
              <sidebar_1.SidebarTrigger className="text-muted-foreground hover:text-foreground"/>
              <div className="h-4 w-px bg-border"/>

              <div className="relative max-w-md flex-1">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                <input_1.Input placeholder="Поиск по проектам, сотрудникам, табелям…" className="pl-8 h-7 text-xs bg-muted/40 border-transparent focus-visible:bg-background"/>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <badge_1.Badge variant="outline" className="hidden md:inline-flex border-warning/30 text-warning bg-warning/5">
                  Период: Май 2026 — открыт
                </badge_1.Badge>

                <button_1.Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <lucide_react_1.HelpCircle className="h-3.5 w-3.5"/>
                </button_1.Button>

                <button_1.Button variant="ghost" size="icon" className="relative h-7 w-7 text-muted-foreground hover:text-foreground">
                  <lucide_react_1.Bell className="h-3.5 w-3.5"/>
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive"/>
                </button_1.Button>

                <div className="h-4 w-px bg-border mx-1"/>

                <dropdown_menu_1.DropdownMenu>
                  <dropdown_menu_1.DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 pr-1 cursor-pointer hover:opacity-80 transition-opacity">
                      <avatar_1.Avatar className="h-7 w-7">
                        <avatar_1.AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
                          {initials}
                        </avatar_1.AvatarFallback>
                      </avatar_1.Avatar>
                      <div className="hidden sm:flex flex-col leading-tight">
                        <span className="text-xs font-medium text-foreground">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground">{roleDisplay}</span>
                      </div>
                      <lucide_react_1.ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground"/>
                    </div>
                  </dropdown_menu_1.DropdownMenuTrigger>
                  <dropdown_menu_1.DropdownMenuContent align="end" className="w-48">
                    <dropdown_menu_1.DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {user?.email ?? ''}
                    </dropdown_menu_1.DropdownMenuLabel>
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuItem className="gap-2 text-sm" disabled>
                      <lucide_react_1.User className="h-4 w-4"/>
                      Профиль
                    </dropdown_menu_1.DropdownMenuItem>
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuItem className="gap-2 text-sm text-destructive focus:text-destructive" onClick={handleLogout}>
                      <lucide_react_1.LogOut className="h-4 w-4"/>
                      Выйти
                    </dropdown_menu_1.DropdownMenuItem>
                  </dropdown_menu_1.DropdownMenuContent>
                </dropdown_menu_1.DropdownMenu>
              </div>
            </header>

            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </sidebar_1.SidebarProvider>
    </AppLayoutCtx.Provider>);
}
//# sourceMappingURL=AppLayout.js.map