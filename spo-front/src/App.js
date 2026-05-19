"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_query_1 = require("@tanstack/react-query");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});
const react_router_dom_1 = require("react-router-dom");
const sonner_1 = require("@/components/ui/sonner");
const tooltip_1 = require("@/components/ui/tooltip");
const ProtectedRoute_1 = require("@/components/ProtectedRoute");
const AppLayout_1 = require("@/components/layout/AppLayout");
const Login_tsx_1 = __importDefault(require("./pages/Login.tsx"));
const Dashboard_tsx_1 = __importDefault(require("./pages/Dashboard.tsx"));
const Planning_tsx_1 = __importDefault(require("./pages/Planning.tsx"));
const Timesheets_tsx_1 = __importDefault(require("./pages/Timesheets.tsx"));
const Reports_tsx_1 = __importDefault(require("./pages/Reports.tsx"));
const Finance_tsx_1 = __importDefault(require("./pages/Finance.tsx"));
const SalaryRates_tsx_1 = __importDefault(require("./pages/SalaryRates.tsx"));
const PeriodClose_tsx_1 = __importDefault(require("./pages/PeriodClose.tsx"));
const Users_tsx_1 = __importDefault(require("./pages/Users.tsx"));
const Audit_tsx_1 = __importDefault(require("./pages/Audit.tsx"));
const Settings_tsx_1 = __importDefault(require("./pages/Settings.tsx"));
const NotFound_tsx_1 = __importDefault(require("./pages/NotFound.tsx"));
const App = () => (<react_query_1.QueryClientProvider client={queryClient}>
    <tooltip_1.TooltipProvider>
      <sonner_1.Toaster />
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          
          <react_router_dom_1.Route path="/login" element={<Login_tsx_1.default />}/>

          
          <react_router_dom_1.Route path="/" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Dashboard_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/planning" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Planning_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/timesheets" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Timesheets_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/reports" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Reports_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/finance" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Finance_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/salary-rates" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <SalaryRates_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/period-close" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <PeriodClose_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/users" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Users_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/audit" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Audit_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          <react_router_dom_1.Route path="/settings" element={<ProtectedRoute_1.ProtectedRoute>
                <AppLayout_1.AppLayout>
                  <Settings_tsx_1.default />
                </AppLayout_1.AppLayout>
              </ProtectedRoute_1.ProtectedRoute>}/>
          
          <react_router_dom_1.Route path="*" element={<NotFound_tsx_1.default />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
    </tooltip_1.TooltipProvider>
  </react_query_1.QueryClientProvider>);
exports.default = App;
//# sourceMappingURL=App.js.map