import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";
declare const ToggleGroup: React.ForwardRefExoticComponent<(Omit<Omit<ToggleGroupPrimitive.ToggleGroupSingleProps & React.RefAttributes<HTMLDivElement>, "ref"> & VariantProps<any>, "ref"> | Omit<Omit<ToggleGroupPrimitive.ToggleGroupMultipleProps & React.RefAttributes<HTMLDivElement>, "ref"> & VariantProps<any>, "ref">) & React.RefAttributes<HTMLDivElement>>;
declare const ToggleGroupItem: React.ForwardRefExoticComponent<Omit<Omit<ToggleGroupPrimitive.ToggleGroupItemProps & React.RefAttributes<HTMLButtonElement>, "ref"> & VariantProps<any>, "ref"> & React.RefAttributes<HTMLButtonElement>>;
export { ToggleGroup, ToggleGroupItem };
