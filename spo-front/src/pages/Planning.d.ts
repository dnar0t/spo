import { type BacklogItemDto } from '@/hooks/usePlanning';
import type { BacklogIssue } from '@/data/planningMock';
export declare function flattenBacklogItems(items: BacklogItemDto[], parentIssueNumber?: string | null): BacklogIssue[];
declare const Planning: () => import("react").JSX.Element;
export default Planning;
