"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planSnapshot = void 0;
exports.planSnapshotFor = planSnapshotFor;
const planningMock_1 = require("./planningMock");
function clamp(v) {
    return Math.max(0, Math.min(100, Math.round(v)));
}
function computeStart(idReadable) {
    const issue = planningMock_1.backlog.find((b) => b.idReadable === idReadable);
    if (!issue)
        return 0;
    const est = (0, planningMock_1.effectiveEstimate)(issue);
    if (!est)
        return 0;
    const spent = (0, planningMock_1.effectiveSpent)(issue);
    if (issue.readiness > 0)
        return clamp(issue.readiness);
    if (spent > 0)
        return clamp((spent / est) * 100);
    return 0;
}
const PLAN_OVERRIDES = {
    "ERP-201": 80,
    "ERP-202": 100,
    "ERP-203": 70,
    "ERP-204": 90,
    "ERP-318": 100,
    "ERP-412": 100,
    "BNK-87": 75,
    "BNK-88": 100,
    "BNK-89": 100,
    "BNK-90": 50,
    "BNK-92": 60,
    "BNK-101": 100,
    "BNK-115": 100,
    "GOV-23": 50,
    "GOV-31": 40,
    "GOV-45": 60,
    "RTL-14": 50,
    "RTL-22": 100,
    "RTL-28": 60,
    "ERP-520": 50,
    "ERP-527": 100,
};
exports.planSnapshot = planningMock_1.backlog.map((b) => {
    const start = computeStart(b.idReadable);
    const planRaw = PLAN_OVERRIDES[b.idReadable] ?? 100;
    const plan = Math.max(start, planRaw);
    return { idReadable: b.idReadable, readinessAtStart: start, readinessPlan: plan };
});
const SNAPSHOT_INDEX = new Map(exports.planSnapshot.map((p) => [p.idReadable, p]));
function planSnapshotFor(idReadable) {
    return SNAPSHOT_INDEX.get(idReadable);
}
//# sourceMappingURL=planSnapshotMock.js.map