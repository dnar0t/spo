import * as ResizablePrimitive from "react-resizable-panels";
declare const ResizablePanelGroup: ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => import("react").JSX.Element;
declare const ResizablePanel: import("react").ForwardRefExoticComponent<Omit<import("react").HTMLAttributes<HTMLElement | HTMLAnchorElement | HTMLDivElement | HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement | HTMLUListElement | HTMLLIElement | HTMLButtonElement | HTMLObjectElement | HTMLHtmlElement | HTMLDataElement | HTMLSelectElement | HTMLLinkElement | HTMLBodyElement | HTMLMapElement | HTMLSourceElement | HTMLHeadElement | HTMLHRElement | HTMLStyleElement | HTMLDetailsElement | HTMLInputElement | HTMLPreElement | HTMLMetaElement | HTMLLabelElement | HTMLAreaElement | HTMLAudioElement | HTMLBaseElement | HTMLQuoteElement | HTMLBRElement | HTMLCanvasElement | HTMLTableColElement | HTMLDataListElement | HTMLModElement | HTMLDialogElement | HTMLDListElement | HTMLEmbedElement | HTMLFieldSetElement | HTMLFormElement | HTMLIFrameElement | HTMLImageElement | HTMLLegendElement | HTMLMeterElement | HTMLOListElement | HTMLOptGroupElement | HTMLOptionElement | HTMLOutputElement | HTMLProgressElement | HTMLSlotElement | HTMLScriptElement | HTMLTableElement | HTMLTemplateElement | HTMLTableSectionElement | HTMLTableCellElement | HTMLTextAreaElement | HTMLTimeElement | HTMLTitleElement | HTMLTableRowElement | HTMLTrackElement | HTMLVideoElement | HTMLTableCaptionElement | HTMLMenuElement | HTMLPictureElement>, "id" | "onResize"> & {
    className?: string | undefined;
    collapsedSize?: number | undefined;
    collapsible?: boolean | undefined;
    defaultSize?: number | undefined;
    id?: string | undefined;
    maxSize?: number | undefined;
    minSize?: number | undefined;
    onCollapse?: ResizablePrimitive.PanelOnCollapse | undefined;
    onExpand?: ResizablePrimitive.PanelOnExpand | undefined;
    onResize?: ResizablePrimitive.PanelOnResize | undefined;
    order?: number | undefined;
    style?: object | undefined;
    tagName?: keyof HTMLElementTagNameMap | undefined;
} & {
    children?: import("react").ReactNode;
} & import("react").RefAttributes<ResizablePrimitive.ImperativePanelHandle>>;
declare const ResizableHandle: ({ withHandle, className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
    withHandle?: boolean;
}) => import("react").JSX.Element;
export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
