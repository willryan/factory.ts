"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Sync = require("./sync");
function isPromise(t) {
    return typeof t["then"] === "function";
}
function lift(t) {
    if (isPromise(t)) {
        return t;
    }
    else {
        return Promise.resolve(t);
    }
}
exports.lift = lift;
class Generator {
    constructor(func) {
        this.func = func;
    }
    build(seq) {
        return lift(this.func(seq));
    }
}
exports.Generator = Generator;
class Derived {
    constructor(func) {
        this.func = func;
    }
    build(owner, seq) {
        return lift(this.func(owner, seq));
    }
}
exports.Derived = Derived;
class Factory {
    constructor(builder) {
        this.builder = builder;
        this.seqNum = 0;
    }
    build(item) {
        return __awaiter(this, void 0, void 0, function* () {
            this.seqNum++;
            const base = yield buildBase(this.seqNum, this.builder);
            let v = Object.assign({}, base.value); //, item);
            if (item) {
                v = Factory.recursivePartialOverride(v, item);
                const keys = Object.keys(item);
                for (const der of base.derived) {
                    if (keys.indexOf(der.key) < 0) {
                        v[der.key] = yield der.derived.build(v, this.seqNum);
                    }
                }
            }
            return lift(v);
        });
    }
    static recursivePartialOverride(x, y) {
        if (y === undefined || y === null)
            return x;
        const objProto = Object.getPrototypeOf({});
        if (Object.getPrototypeOf(y) != objProto)
            return y;
        let v = Object.assign({}, x);
        let yKeys = Object.keys(y);
        for (const key of Object.keys(v)) {
            if (yKeys.indexOf(key) >= 0) {
                const itemKeyVal = y[key];
                if (typeof itemKeyVal === "object") {
                    const baseKeyVal = v[key];
                    v[key] = Factory.recursivePartialOverride(baseKeyVal, itemKeyVal);
                }
                else {
                    v[key] = itemKeyVal;
                }
            }
        }
        return v;
    }
    buildList(count, item) {
        const ts = Array(count); // allocate to correct size
        for (let i = 0; i < count; i++) {
            ts[i] = this.build(item);
        }
        return Promise.all(ts);
    }
    extend(def) {
        const builder = Object.assign({}, this.builder, def);
        return new Factory(builder);
    }
    combine(other) {
        const builder = Object.assign({}, this.builder, other.builder);
        return new Factory(builder);
    }
    transform(fn) {
        return new TransformFactory(this, fn);
    }
    withDerivation(kOut, f) {
        const partial = {};
        partial[kOut] = new Derived(f);
        return this.extend(partial);
    }
    withDerivation1(kInput, kOut, f) {
        const partial = {};
        partial[kOut] = new Derived((t, i) => f(t[kInput[0]], i));
        return this.extend(partial);
    }
    withDerivation2(kInput, kOut, f) {
        const partial = {};
        partial[kOut] = new Derived((t, i) => f(t[kInput[0]], t[kInput[1]], i));
        return this.extend(partial);
    }
    withDerivation3(kInput, kOut, f) {
        const partial = {};
        partial[kOut] = new Derived((t, i) => f(t[kInput[0]], t[kInput[1]], t[kInput[2]], i));
        return this.extend(partial);
    }
    withDerivation4(kInput, kOut, f) {
        const partial = {};
        partial[kOut] = new Derived((t, i) => f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], i));
        return this.extend(partial);
    }
    withDerivation5(kInput, kOut, f) {
        const partial = {};
        partial[kOut] = new Derived((t, i) => f(t[kInput[0]], t[kInput[1]], t[kInput[2]], t[kInput[3]], t[kInput[4]], i));
        return this.extend(partial);
    }
}
exports.Factory = Factory;
class TransformFactory {
    constructor(inner, transform) {
        this.inner = inner;
        this.transform = transform;
    }
    build(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const v = yield this.inner.build(item);
            const u = yield lift(this.transform(v));
            return u;
        });
    }
    buildList(count, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const vs = yield this.inner.buildList(count, item);
            return Promise.all(vs.map(this.transform).map(lift));
        });
    }
}
exports.TransformFactory = TransformFactory;
function val(val) {
    return new Generator(() => val);
}
exports.val = val;
function each(f) {
    return new Generator(f);
}
exports.each = each;
function buildBase(seqNum, builder) {
    return __awaiter(this, void 0, void 0, function* () {
        const t = {};
        const keys = Object.getOwnPropertyNames(builder);
        const derived = [];
        for (const key of keys) {
            const v = builder[key];
            let value = v;
            if (!!v && typeof v === "object") {
                if (isPromise(v)) {
                    value = yield v;
                }
                else if (v.constructor === Generator) {
                    value = yield v.build(seqNum);
                }
                else if (v.constructor == Derived) {
                    derived.push({ key, derived: v });
                }
                else if (v.constructor === Sync.Generator) {
                    value = v.build(seqNum);
                }
                else if (v.constructor == Sync.Derived) {
                    derived.push({ key, derived: new Derived(v.func) });
                }
            }
            t[key] = value;
        }
        return { value: t, derived };
    });
}
function makeFactory(builder) {
    return new Factory(builder);
}
exports.makeFactory = makeFactory;
function makeFactoryFromSync(builder) {
    return new Factory(builder);
}
exports.makeFactoryFromSync = makeFactoryFromSync;
//# sourceMappingURL=async.js.map