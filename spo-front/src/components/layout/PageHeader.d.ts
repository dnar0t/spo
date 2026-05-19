import { ReactNode } from "react";
interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: {
        label: string;
        href?: string;
    }[];
    actions?: ReactNode;
}
export declare function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps): import("react").JSX.Element;
export {};
