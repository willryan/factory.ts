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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBaUM7QUFDeEIsc0JBQUs7QUFFZCwrQkFBK0I7QUFDdEIsb0JBQUk7QUFFYix1Q0FBdUM7QUFDOUIsNEJBQVE7QUFJakIsZ0NBQWdDO0FBQ2hDLCtCQVNnQjtBQVBkLDJCQUFBLFNBQVMsQ0FBQTtBQUNULHlCQUFBLE9BQU8sQ0FBQTtBQUNQLHlCQUFBLE9BQU8sQ0FBQTtBQUVQLHFCQUFBLEdBQUcsQ0FBQTtBQUNILHNCQUFBLElBQUksQ0FBQTtBQUNKLDZCQUFBLFdBQVcsQ0FBQSJ9