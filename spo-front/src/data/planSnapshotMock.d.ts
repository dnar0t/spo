export interface PlanSnapshotEntry {
    idReadable: string;
    readinessAtStart: number;
    readinessPlan: number;
}
export declare const planSnapshot: PlanSnapshotEntry[];
export declare function planSnapshotFor(idReadable: string): PlanSnapshotEntry | undefined;
