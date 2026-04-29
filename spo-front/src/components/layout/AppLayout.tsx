import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search, HelpCircle, LogOut, User, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: ReactNode;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function getRoleDisplay(roles: string[]): string {
  if (roles.length === 0) return 'Пользователь';
  if (roles.includes('ADMIN')) return 'Администратор';
  if (roles.includes('MANAGER')) return 'Менеджер';
  if (roles.includes('SUPERVISOR')) return 'Руководитель';
  if (roles.includes('EMPLOYEE')) return 'Сотрудник';
  return roles[0];
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();

  const displayName = user?.fullName ?? 'Пользователь';
  const roleDisplay = user?.roles ? getRoleDisplay(user.roles) : 'Пользователь';
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center gap-3 border-b border-border bg-card px-4 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border" />

            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Поиск по проектам, сотрудникам, табелям…"
                className="pl-8 h-7 text-xs bg-muted/40 border-transparent focus-visible:bg-background"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Badge
                variant="outline"
                className="hidden md:inline-flex border-warning/30 text-warning bg-warning/5"
              >
                Период: Май 2026 — открыт
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 pr-1 cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col leading-tight">
                      <span className="text-xs font-medium text-foreground">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground">{roleDisplay}</span>
                    </div>
                    <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {user?.email ?? ''}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-sm" disabled>
                    <User className="h-4 w-4" />
                    Профиль
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-sm text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
