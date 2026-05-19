"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiSelectFilter = MultiSelectFilter;
exports.SingleSelectFilter = SingleSelectFilter;
exports.SearchFilter = SearchFilter;
exports.FilterChip = FilterChip;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const popover_1 = require("@/components/ui/popover");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const utils_1 = require("@/lib/utils");
function MultiSelectFilter({ value, onChange, options, placeholder, searchPlaceholder = "Поиск…", className, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [query, setQuery] = (0, react_1.useState)("");
    const filtered = (0, react_1.useMemo)(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return options;
        return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
    }, [options, query]);
    const toggle = (v) => {
        if (value.includes(v))
            onChange(value.filter((x) => x !== v));
        else
            onChange([...value, v]);
    };
    const isActive = value.length > 0;
    const label = value.length === 0
        ? placeholder
        : value.length === 1
            ? options.find((o) => o.value === value[0])?.label ?? placeholder
            : `${placeholder}: ${value.length}`;
    return (<div className={(0, utils_1.cn)("relative", className)}>
      <popover_1.Popover open={open} onOpenChange={setOpen}>
        <popover_1.PopoverTrigger asChild>
          <button_1.Button variant="outline" size="sm" className={(0, utils_1.cn)("h-8 w-full justify-between font-normal pr-7", isActive && "border-primary/60 bg-primary-soft/40 text-foreground")}>
            <span className="truncate text-xs">{label}</span>
            <lucide_react_1.ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0"/>
          </button_1.Button>
        </popover_1.PopoverTrigger>
        <popover_1.PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <lucide_react_1.Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input_1.Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="h-8 pl-7 text-xs"/>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
              <span>{value.length} из {options.length} выбрано</span>
              <button type="button" className="text-primary hover:underline disabled:opacity-50" disabled={value.length === 0} onClick={() => onChange([])}>
                Сбросить
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && (<div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Ничего не найдено
              </div>)}
            {filtered.map((o) => {
            const checked = value.includes(o.value);
            return (<button key={o.value} type="button" onClick={() => toggle(o.value)} className={(0, utils_1.cn)("w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/60 transition-colors", checked && "bg-primary-soft/40")}>
                  <span className={(0, utils_1.cn)("h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0", checked ? "bg-primary border-primary" : "border-input")}>
                    {checked && <lucide_react_1.Check className="h-3 w-3 text-primary-foreground"/>}
                  </span>
                  <span className="truncate flex-1 text-foreground">{o.label}</span>
                  {o.hint && <span className="text-[10px] text-muted-foreground shrink-0">{o.hint}</span>}
                </button>);
        })}
          </div>
        </popover_1.PopoverContent>
      </popover_1.Popover>
      {isActive && (<button type="button" aria-label="Сбросить" onClick={(e) => {
                e.stopPropagation();
                onChange([]);
            }} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
          <lucide_react_1.X className="h-3.5 w-3.5"/>
        </button>)}
    </div>);
}
function SingleSelectFilter({ value, defaultValue, onChange, options, placeholder, className, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const isActive = value !== defaultValue;
    const current = options.find((o) => o.value === value);
    const label = current?.label ?? placeholder;
    return (<div className={(0, utils_1.cn)("relative", className)}>
      <popover_1.Popover open={open} onOpenChange={setOpen}>
        <popover_1.PopoverTrigger asChild>
          <button_1.Button variant="outline" size="sm" className={(0, utils_1.cn)("h-8 w-full justify-between font-normal pr-7", isActive && "border-primary/60 bg-primary-soft/40 text-foreground")}>
            <span className="truncate text-xs">{label}</span>
            <lucide_react_1.ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0"/>
          </button_1.Button>
        </popover_1.PopoverTrigger>
        <popover_1.PopoverContent className="w-56 p-1" align="start">
          <div className="max-h-72 overflow-auto">
            {options.map((o) => (<button key={o.value} type="button" onClick={() => {
                onChange(o.value);
                setOpen(false);
            }} className={(0, utils_1.cn)("w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/60 rounded-sm", o.value === value && "bg-primary-soft/40 text-foreground font-medium")}>
                <span className="truncate flex-1">{o.label}</span>
                {o.value === value && <lucide_react_1.Check className="h-3 w-3 text-primary shrink-0"/>}
              </button>))}
          </div>
        </popover_1.PopoverContent>
      </popover_1.Popover>
      {isActive && (<button type="button" aria-label="Сбросить" onClick={(e) => {
                e.stopPropagation();
                onChange(defaultValue);
            }} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
          <lucide_react_1.X className="h-3.5 w-3.5"/>
        </button>)}
    </div>);
}
function SearchFilter({ value, onChange, placeholder, className, }) {
    return (<div className={(0, utils_1.cn)("relative", className)}>
      <lucide_react_1.Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
      <input_1.Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={(0, utils_1.cn)("h-8 pl-8 pr-7 text-xs", value && "border-primary/60 bg-primary-soft/40")}/>
      {value && (<button type="button" aria-label="Очистить" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
          <lucide_react_1.X className="h-3.5 w-3.5"/>
        </button>)}
    </div>);
}
function FilterChip({ children }) {
    return (<badge_1.Badge variant="secondary" className="bg-primary-soft text-primary text-[10px] py-0 h-4 px-1.5">
      {children}
    </badge_1.Badge>);
}
//# sourceMappingURL=MultiSelectFilter.js.map