"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});
//# sourceMappingURL=setup.js.map