import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  breadcrumbs: { label: string }[];
  features: string[];
}

export function ModulePlaceholder({ title, description, breadcrumbs, features }: ModulePlaceholderProps) {
  return (
    <AppLayout>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg shadow-card p-10 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="bg-primary-soft text-primary rounded-md p-3">
              <Construction className="h-6 w-6" />
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
                  {features.map((f, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 rounded-full bg-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Button size="sm" className="bg-primary hover:bg-primary-hover">
                  Запросить раннюю версию
                </Button>
                <Button size="sm" variant="outline">
                  Открыть спецификацию
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
