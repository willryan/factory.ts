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
    constructor(builder, config) {
        this.builder = builder;
        this.config = config;
        this.seqNum = this.config && this.config.startingSequenceNumber || 0;
    }
    build(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const seqNum = this.seqNum;
            const base = yield buildBase(seqNum, this.builder);
            let v = Object.assign({}, base.value); //, item);
            if (item) {
                v = Factory.recursivePartialOverride(v, item);
            }
            const keys = Object.keys(item || {});
            for (const der of base.derived) {
                if (keys.indexOf(der.key) < 0) {
                    v[der.key] = yield der.derived.build(v, seqNum);
                }
            }
            this.seqNum++;
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
                if (null != itemKeyVal && typeof itemKeyVal === "object") {
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
        return new Factory(builder, this.config);
    }
    combine(other) {
        const builder = Object.assign({}, this.builder, other.builder);
        return new Factory(builder, this.config);
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
function makeFactory(builder, config) {
    return new Factory(builder, config);
}
exports.makeFactory = makeFactory;
function makeFactoryFromSync(builder, config) {
    return new Factory(builder, config);
}
exports.makeFactoryFromSync = makeFactoryFromSync;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQWEvQixTQUFTLFNBQVMsQ0FBbUIsQ0FBaUI7SUFDcEQsT0FBTyxPQUFRLENBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVLENBQUM7QUFDbEQsQ0FBQztBQUVELFNBQWdCLElBQUksQ0FBSSxDQUFpQjtJQUN2QyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoQixPQUFPLENBQUMsQ0FBQztLQUNWO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0I7QUFDSCxDQUFDO0FBTkQsb0JBTUM7QUFFRCxNQUFhLFNBQVM7SUFDcEIsWUFBcUIsSUFBcUM7UUFBckMsU0FBSSxHQUFKLElBQUksQ0FBaUM7SUFBSSxDQUFDO0lBQ3hELEtBQUssQ0FBQyxHQUFXO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0Y7QUFMRCw4QkFLQztBQUNELE1BQWEsT0FBTztJQUNsQixZQUNXLElBRzBCO1FBSDFCLFNBQUksR0FBSixJQUFJLENBR3NCO0lBQ2pDLENBQUM7SUFDRSxLQUFLLENBQUMsS0FBYSxFQUFFLEdBQVc7UUFDckMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUFWRCwwQkFVQztBQU9ELE1BQWEsT0FBTztJQUVsQixZQUFxQixPQUFtQixFQUFtQixNQUFzQztRQUE1RSxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQW1CLFdBQU0sR0FBTixNQUFNLENBQWdDO1FBQy9GLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJ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