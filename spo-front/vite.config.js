"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_swc_1 = __importDefault(require("@vitejs/plugin-react-swc"));
const path_1 = __importDefault(require("path"));
const lovable_tagger_1 = require("lovable-tagger");
exports.default = (0, vite_1.defineConfig)(({ mode }) => ({
    server: {
        host: "::",
        port: 8080,
        hmr: {
            overlay: false,
        },
    },
    plugins: [(0, plugin_react_swc_1.default)(), mode === "development" && (0, lovable_tagger_1.componentTagger)()].filter(Boolean),
    resolve: {
        alias: {
            "@": path_1.default.resolve(__dirname, "./src"),
        },
        dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
}));
//# sourceMappingURL=vite.config.js.map