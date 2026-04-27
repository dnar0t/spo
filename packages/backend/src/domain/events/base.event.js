"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEvent = void 0;
/**
 * Base class for all domain events
 */
var BaseEvent = /** @class */ (function () {
    function BaseEvent() {
        this.occurredOn = new Date();
        this.eventName = this.constructor.name;
    }
    return BaseEvent;
}());
exports.BaseEvent = BaseEvent;
