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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQVMvQixTQUFTLFNBQVMsQ0FBbUIsQ0FBaUI7SUFDcEQsT0FBTyxPQUFRLENBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVLENBQUM7QUFDbEQsQ0FBQztBQUVELFNBQWdCLElBQUksQ0FBSSxDQUFpQjtJQUN2QyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoQixPQUFPLENBQUMsQ0FBQztLQUNWO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0I7QUFDSCxDQUFDO0FBTkQsb0JBTUM7QUFFRCxNQUFhLFNBQVM7SUFDcEIsWUFBcUIsSUFBcUM7UUFBckMsU0FBSSxHQUFKLElBQUksQ0FBaUM7SUFBRyxDQUFDO0lBQ3ZELEtBQUssQ0FBQyxHQUFXO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0Y7QUFMRCw4QkFLQztBQUNELE1BQWEsT0FBTztJQUNsQixZQUNXLElBRzBCO1FBSDFCLFNBQUksR0FBSixJQUFJLENBR3NCO0lBQ2xDLENBQUM7SUFDRyxLQUFLLENBQUMsS0FBYSxFQUFFLEdBQVc7UUFDckMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUFWRCwwQkFVQztBQU9ELE1BQWEsT0FBTztJQUVsQixZQUFxQixPQUFtQjtRQUFuQixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFFWSxLQUFLLENBQUMsSUFBb0I7O1lBQ3JDLElBQUksQ0FBQyxN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