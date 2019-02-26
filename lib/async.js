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
        this.getStartingSequenceNumber = () => this.config && this.config.startingSequenceNumber || 0;
        this.seqNum = this.getStartingSequenceNumber();
    }
    resetSequenceNumber() {
        this.seqNum = this.getStartingSequenceNumber();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQWEvQixTQUFTLFNBQVMsQ0FBbUIsQ0FBaUI7SUFDcEQsT0FBTyxPQUFRLENBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVLENBQUM7QUFDbEQsQ0FBQztBQUVELFNBQWdCLElBQUksQ0FBSSxDQUFpQjtJQUN2QyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoQixPQUFPLENBQUMsQ0FBQztLQUNWO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0I7QUFDSCxDQUFDO0FBTkQsb0JBTUM7QUFFRCxNQUFhLFNBQVM7SUFDcEIsWUFBcUIsSUFBcUM7UUFBckMsU0FBSSxHQUFKLElBQUksQ0FBaUM7SUFBSSxDQUFDO0lBQ3hELEtBQUssQ0FBQyxHQUFXO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0Y7QUFMRCw4QkFLQztBQUNELE1BQWEsT0FBTztJQUNsQixZQUNXLElBRzBCO1FBSDFCLFNBQUksR0FBSixJQUFJLENBR3NCO0lBQ2pDLENBQUM7SUFDRSxLQUFLLENBQUMsS0FBYSxFQUFFLEdBQVc7UUFDckMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUFWRCwwQkFVQztBQU9ELE1BQWEsT0FBTztJQUlsQixZQUFxQixPQUFtQixFQUFtQixNQUFzQztRQUE1RSxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQW1CLFdBQU0sR0FBTixNQUFNLENBQWdDO1FBRnpGLDhCQUF5QixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFN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