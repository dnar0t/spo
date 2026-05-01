import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Planning from './pages/Planning.tsx';
import Timesheets from './pages/Timesheets.tsx';

import Reports from './pages/Reports.tsx';
import Finance from './pages/Finance.tsx';
import SalaryRates from './pages/SalaryRates.tsx';
import PeriodClose from './pages/PeriodClose.tsx';
import Users from './pages/Users.tsx';
import Audit from './pages/Audit.tsx';
import Settings from './pages/Settings.tsx';
import NotFound from './pages/NotFound.tsx';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login page — standalone, без AppLayout */}
          <Route path="/login" element={<Login />} />

          {/* Защищённые маршруты с AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Planning />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/timesheets"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Timesheets />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Finance />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/salary-rates"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SalaryRates />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/period-close"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PeriodClose />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Users />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Audit />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
