export interface MultiOption {
    value: string;
    label: string;
    hint?: string;
}
interface Props {
    value: string[];
    onChange: (v: string[]) => void;
    options: MultiOption[];
    placeholder: string;
    searchPlaceholder?: string;
    className?: string;
}
export declare function MultiSelectFilter({ value, onChange, options, placeholder, searchPlaceholder, className, }: Props): import("react").JSX.Element;
interface SingleProps {
    value: string;
    defaultValue: string;
    onChange: (v: string) => void;
    options: MultiOption[];
    placeholder: string;
    className?: string;
}
export declare function SingleSelectFilter({ value, defaultValue, onChange, options, placeholder, className, }: SingleProps): import("react").JSX.Element;
export declare function SearchFilter({ value, onChange, placeholder, className, }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    className?: string;
}): import("react").JSX.Element;
export declare function FilterChip({ children }: {
    children: React.ReactNode;
}): import("react").JSX.Element;
export {};
