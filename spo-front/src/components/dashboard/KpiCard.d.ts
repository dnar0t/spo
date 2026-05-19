import { LucideIcon } from "lucide-react";
interface KpiCardProps {
    label: string;
    value: string;
    unit?: string;
    delta?: {
        value: string;
        positive: boolean;
    };
    icon: LucideIcon;
    accent?: "primary" | "success" | "warning" | "info";
}
export declare function KpiCard({ label, value, unit, delta, icon: Icon, accent }: KpiCardProps): import("react").JSX.Element;
export {};
