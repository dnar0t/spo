"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulePlaceholder = ModulePlaceholder;
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
function ModulePlaceholder({ title, description, breadcrumbs, features }) {
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title={title} description={description} breadcrumbs={breadcrumbs}/>
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg shadow-card p-10 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="bg-primary-soft text-primary rounded-md p-3">
              <lucide_react_1.Construction className="h-6 w-6"/>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Модуль готовится к выпуску</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Каркас приложения готов. В следующей итерации мы наполним этот раздел согласно спецификации СПО v2.
              </p>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Что будет в модуле
                </p>
                <ul className="space-y-1.5">
                  {features.map((f, i) => (<li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-primary shrink-0"/>
                      <span>{f}</span>
                    </li>))}
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <button_1.Button size="sm" className="bg-primary hover:bg-primary-hover">
                  Запросить раннюю версию
                </button_1.Button>
                <button_1.Button size="sm" variant="outline">
                  Открыть спецификацию
                </button_1.Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout_1.AppLayout>);
}
//# sourceMappingURL=ModulePlaceholder.js.map