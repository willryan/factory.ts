"use strict";
class Generator {
    constructor(func) {
        this.func = func;
    }
    build(seq) {
        return this.func(seq);
    }
}
exports.Generator = Generator;
class Derived {
    constructor(func) {
        this.func = func;
    }
    build(owner, seq) {
        const ret = this.func(owner, seq);
        return ret;
    }
}
exports.Derived = Derived;
class Factory {
    constructor(builder) {
        this.builder = builder;
        this.seqNum = 0;
    }
    build(item) {
        this.seqNum++;
        const base = buildBase(this.seqNum, this.builder);
        const v = Object.assign({}, base.value, item);
        if (item) {
            const keys = Object.keys(item);
            for (const der of base.derived) {
                if (keys.indexOf(der.key) < 0) {
                    v[der.key] = der.derived.build(v, this.seqNum);
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
        return ts;
    }
    extend(def) {
        const builder = Object.assign({}, this.builder, def);
        return new Factory(builder);
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
function val(val) {
    return new Generator(() => val);
}
exports.val = val;
function each(f) {
    return new Generator(f);
}
exports.each = each;
function buildBase(seqNum, builder) {
    const t = {};
    const keys = Object.getOwnPropertyNames(builder);
    const derived = [];
    for (const key of keys) {
        const v = builder[key];
        let value = v;
        if (!!v && typeof v === "object") {
            if (v.constructor === Generator) {
                value = v.build(seqNum);
            }
            else if (v.constructor == Derived) {
                derived.push({ key, derived: v });
            }
        }
        t[key] = value;
    }
    return { value: t, derived };
}
function makeFactory(builder) {
    return new Factory(builder);
}
exports.makeFactory = makeFactory;
//# sourceMappingURL=index.js.map