import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MultiOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string[]; // empty = all
  onChange: (v: string[]) => void;
  options: MultiOption[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}

/** Компактный мультиселект с поиском и крестиком сброса. value=[] трактуется как «все». */
export function MultiSelectFilter({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Поиск…",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const isActive = value.length > 0;
  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? placeholder
        : `${placeholder}: ${value.length}`;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 w-full justify-between font-normal pr-7",
              isActive && "border-primary/60 bg-primary-soft/40 text-foreground",
            )}
          >
            <span className="truncate text-xs">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
              <span>{value.length} из {options.length} выбрано</span>
              <button
                type="button"
                className="text-primary hover:underline disabled:opacity-50"
                disabled={value.length === 0}
                onClick={() => onChange([])}
              >
                Сбросить
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Ничего не найдено
              </div>
            )}
            {filtered.map((o) => {
              const checked = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors",
                    checked && "bg-primary-soft/40",
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                      checked ? "bg-primary border-primary" : "border-input",
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <span className="truncate flex-1 text-foreground">{o.label}</span>
                  {o.hint && <span className="text-[10px] text-muted-foreground shrink-0">{o.hint}</span>}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {isActive && (
        <button
          type="button"
          aria-label="Сбросить"
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface SingleProps {
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
  options: MultiOption[];
  placeholder: string;
  className?: string;
}

/** Компактный одиночный селект с крестиком сброса (когда value !== defaultValue). */
export function SingleSelectFilter({
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  className,
}: SingleProps) {
  const [open, setOpen] = useState(false);
  const isActive = value !== defaultValue;
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 w-full justify-between font-normal pr-7",
              isActive && "border-primary/60 bg-primary-soft/40 text-foreground",
            )}
          >
            <span className="truncate text-xs">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <div className="max-h-72 overflow-auto">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/60 rounded-sm",
                  o.value === value && "bg-primary-soft/40 text-foreground font-medium",
                )}
              >
                <span className="truncate flex-1">{o.label}</span>
                {o.value === value && <Check className="h-3 w-3 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {isActive && (
        <button
          type="button"
          aria-label="Сбросить"
          onClick={(e) => {
            e.stopPropagation();
            onChange(defaultValue);
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Текстовый поиск с крестиком сброса. */
export function SearchFilter({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 pl-8 pr-7 text-xs",
          value && "border-primary/60 bg-primary-soft/40",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="bg-primary-soft text-primary text-[10px] py-0 h-4 px-1.5">
      {children}
    </Badge>
  );
}
