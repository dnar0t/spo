"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.UnauthorizedError = exports.InvalidArgumentError = exports.BusinessRuleError = exports.DomainStateError = exports.NotFoundError = exports.DomainError = void 0;
/**
 * Base domain error class
 * Все ошибки домена должны наследоваться от этого класса
 */
var DomainError = /** @class */ (function (_super) {
    __extends(DomainError, _super);
    function DomainError(message, code, details) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.name = _this.constructor.name;
        _this.code = code;
        _this.details = details;
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(_this, _newTarget.prototype);
        // Maintain proper stack trace in V8
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    return DomainError;
}(Error));
exports.DomainError = DomainError;
/**
 * Error for not found entities
 */
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(entityName, id, details) {
        return _super.call(this, "".concat(entityName, " with id \"").concat(id, "\" not found"), 'NOT_FOUND', __assign({ entityName: entityName, id: id }, details)) || this;
    }
    return NotFoundError;
}(DomainError));
exports.NotFoundError = NotFoundError;
/**
 * Error for invalid domain state
 */
var DomainStateError = /** @class */ (function (_super) {
    __extends(DomainStateError, _super);
    function DomainStateError(message, details) {
        return _super.call(this, message, 'INVALID_STATE', details) || this;
    }
    return DomainStateError;
}(DomainError));
exports.DomainStateError = DomainStateError;
/**
 * Error for business rule violations
 */
var BusinessRuleError = /** @class */ (function (_super) {
    __extends(BusinessRuleError, _super);
    function BusinessRuleError(message, details) {
        return _super.call(this, message, 'BUSINESS_RULE_VIOLATION', details) || this;
    }
    return BusinessRuleError;
}(DomainError));
exports.BusinessRuleError = BusinessRuleError;
/**
 * Error for invalid arguments
 */
var InvalidArgumentError = /** @class */ (function (_super) {
    __extends(InvalidArgumentError, _super);
    function InvalidArgumentError(argumentName, reason, details) {
        return _super.call(this, "Invalid argument \"".concat(argumentName, "\": ").concat(reason), 'INVALID_ARGUMENT', __assign({ argumentName: argumentName, reason: reason }, details)) || this;
    }
    return InvalidArgumentError;
}(DomainError));
exports.InvalidArgumentError = InvalidArgumentError;
/**
 * Error for unauthorized operations
 */
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message, details) {
        if (message === void 0) { message = 'Unauthorized access'; }
        return _super.call(this, message, 'UNAUTHORIZED', details) || this;
    }
    return UnauthorizedError;
}(DomainError));
exports.UnauthorizedError = UnauthorizedError;
/**
 * Error for conflicting operations
 */
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message, details) {
        return _super.call(this, message, 'CONFLICT', details) || this;
    }
    return ConflictError;
}(DomainError));
exports.ConflictError = ConflictError;
