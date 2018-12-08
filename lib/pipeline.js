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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcGlwZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLGlDQUFpQztBQVFqQyxNQUFhLFFBQVE7SUFDbkIsWUFBb0IsT0FBbUI7UUFBbkIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtJQUFJLENBQUM7SUFFNUMsTUFBTSxDQUFDLEtBQUs7UUFDVixPQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsaUdBQWlHO0lBQzFGLFNBQVMsQ0FDZCxHQUE0QjtRQUU1QixPQUFPLElBQUksUUFBUSxDQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFNLENBQUMsRUFBQyxFQUFFO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFFLEdBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQzdGLHlCQUNNLENBQVMsRUFDVCxDQUFTLEVBQ2I7UUFDSixDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0lBRUQsc0RBQXNEO0lBQ3RELG1EQUFtRDtJQUNuRCxnREFBZ0Q7SUFDaEQsZ0NBQWdDO0lBQ3pCLGNBQWMsQ0FDbkIsT0FBZ0MsRUFDaEMsR0FBTSxFQUNOLE9BQTBCO1FBRTFCLE9BQU8sSUFBSSxRQUFRLENBQ2pCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQU0sQ0FBQyxFQUFDLEVBQUU7WUFDMUIsTUFBTSxDQUFDLEdBQ0wsT0FBTyxPQUFPLEtBQUssVUFBVTtnQkFDM0IsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDZCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUN6Qix5QkFDTSxDQUFTLEVBQ1YsSUFBSSxFQUNQO1FBQ0osQ0FBQyxDQUFBLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVNLFVBQVUsQ0FDZixPQUF5QixFQUN6QixHQUFNLEVBQ04sT0FBMEI7UUFFMUIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLFlBQVksQ0FDakIsT0FBcUMsRUFDckMsR0FBTSxFQUNOLE9BQTBCO1FBRTFCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxJQUFJLENBQ0YsV0FBNEQsRUFDNUQsVUFBOEQ7UUFFOUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNGO0FBdEVELDRCQXNFQyJ9