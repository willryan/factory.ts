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
const Async = require("./async");
class Pipeline {
    constructor(current) {
        this.current = current;
    }
    static start() {
        return new Pipeline(Promise.resolve({}));
    }
    //add<T,U>(factory: Async.IFactory<T,U> | Async.FactoryFunc<T,U>, val: Parti (p:P) => Partial<T>)
    addValues(val) {
        return new Pipeline(this.current.then((c) => __awaiter(this, void 0, void 0, function* () {
            const v = typeof val === "function" ? yield Async.lift(val(c)) : val;
            return Object.assign({}, c, v);
        })));
    }
    // NOTE: want to combine all addFactory() methods, but
    // Typescript and or ts-node seems to have problems
    // also want use object { key: partial } instead
    // but can't get the types right
    addFactoryFunc(factory, key, partial) {
        return new Pipeline(this.current.then((c) => __awaiter(this, void 0, void 0, function* () {
            const p = typeof partial === "function"
                ? yield Async.lift(partial(c))
                : partial;
            const val = yield factory(p);
            const newV = {};
            newV[key] = val;
            return Object.assign({}, c, newV);
        })));
    }
    addFactory(factory, key, partial) {
        return this.addFactoryFunc(v => factory.build(v), key, partial);
    }
    addTxFactory(factory, key, partial) {
        return this.addFactoryFunc(v => factory.build(v), key, partial);
    }
    then(onfulfilled, onrejected) {
        return this.current.then(onfulfilled, onrejected);
    }
}
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map