"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Async = require("./async");
exports.Async = Async;
const Sync = require("./sync");
exports.Sync = Sync;
const Pipeline = require("./pipeline");
exports.Pipeline = Pipeline;
// for now, for backwards compat
var sync_1 = require("./sync");
exports.Generator = sync_1.Generator;
exports.Derived = sync_1.Derived;
exports.Factory = sync_1.Factory;
exports.val = sync_1.val;
exports.each = sync_1.each;
exports.makeFactory = sync_1.makeFactory;
//# sourceMappingURL=index.js.map