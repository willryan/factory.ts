import { isArray } from "util";
import * as Sync from "../src/sync";

interface ParentType {
  name: string;
  birthday: Date;
  children: ChildType[];
  spouse: ParentType | null;
}

interface ChildType {
  name: string | null;
  grade: number;
}

interface WidgetType {
  name: string;
  id: number;
}

describe("factories build stuff", () => {
  const childFactory = Sync.makeFactory<ChildType>({
    name: "Kid",
    grade: 1,
  });
  const parentFactory = Sync.makeFactory<ParentType>({
    name: "Parent",
    birthday: Sync.each((i) => new Date(`2017/05/${i + 1}`)),
    children: Sync.each(() => []),
    spouse: null,
  });
  it("makes an object from a factory", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    expect(jimmy.name).toEqual("Jimmy");
    expect(jimmy.grade).toEqual(1);
  });
  it("makes an object with default field from a factory", () => {
    const jimmy = childFactory.build();
    expect(jimmy.name).toEqual("Kid");
    expect(jimmy.grade).toEqual(1);
  });
  it("makes an object with default field explicitly set to null", () => {
    const anon = childFactory.build({ name: null });
    expect(anon.name).toBeNull();
    expect(anon.grade).toEqual(1);
  });
  it("can make use of sequence #", () => {
    const susan = parentFactory.build({ name: "Susan" });
    const edward = parentFactory.build({ name: "Edward" });
    expect(susan.birthday.getTime()).toEqual(new Date("2017/05/01").getTime());
    expect(edward.birthday.getTime()).toEqual(new Date("2017/05/02").getTime());
  });
  it("can handle has many", () => {
    const jimmy = childFactory.build({ name: "Jimmy" });
    const alice = childFactory.build({ name: "Alice", grade: 3 });
    const susan = parentFactory.build({
      name: "Susan",
      children: [jimmy, alice],
    });
    expect(susan.children.map((c) => c.name)).toEqual(["Jimmy", "Alice"]);
  });
  it("can refer to other factories", () => {
    const parentWithKidsFactory = Sync.makeFactory<ParentType>({
      name: "Timothy",
      birthday: Sync.each((i) => new Date(`2017/05/${i}`)),
      children: Sync.each(() => [
        childFactory.build({ name: "Bobby" }),
        childFactory.build({ name: "Jane" }),
      ]),
      spouse: null,
    });
    const tim = parentWithKidsFactory.build({
      birthday: new Date("2017-02-01"),
    });
    expect(tim.children.map((c) => c.name)).toEqual(["Bobby", "Jane"]);
  });
  it("can extend existing factories", () => {
    const geniusFactory = childFactory.extend({
      grade: Sync.each((i) => (i + 1) * 2),
    });
    const colin = geniusFactory.build({ name: "Colin" });
    expect(colin.grade).toEqual(2);
    const albert = geniusFactory.build({ name: "Albert" });
    expect(albert.grade).toEqual(4);
  });
  it("can derive one value based on another value", () => {
    interface Person {
      readonly firstName: string;
      readonly lastName: string;
      readonly fullName: string;
    }
    const personFactory = Sync.makeFactory<Person>({
      firstName: "Double-O",
      lastName: Sync.each(() => "Bond"),
      fullName: "",
    }).withDerivation("fullName", (p) => `${p.firstName} ${p.lastName}`);
    const bond = personFactory.build({ firstName: "James" });
    expect(bond.fullName).toEqual("James Bond");
    const doubleO = personFactory.build();
    expect(doubleO.fullName).toEqual("Double-O Bond");
  });
  it("can build a list of items", () => {
    const children = childFactory.buildList(3, { name: "Bruce" });
    expect(children.length).toEqual(3);
    for (let child of children) {
      expect(child.name).toEqual("Bruce");
      expect(child.grade).toEqual(1);
    }
  });
  it("can combine factories", () => {
    const timeStamps = Sync.makeFactory({
      createdAt: Sync.each(() => new Date()),
      updatedAt: Sync.each(() => new Date()),
    });
    const softDelete = Sync.makeFactory({
      isDeleted: false,
    });
    interface Post {
      content: string;
      createdAt: Date;
      updatedAt: Date;
      isDeleted: boolean;
    }
    interface User {
      email: string;
      createdAt: Date;
      updatedAt: Date;
      isDeleted: boolean;
    }
    const postFactory: Sync.Factory<Post> = Sync.makeFactory({
      content: "lorem ipsum",
    })
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Sync.Factory<User> = Sync.makeFactory({
      email: "test@user.com",
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true,
    });
    expect(post.createdAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(post.isDeleted).toEqual(true);
    const user = userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02"),
    });
    expect(user.createdAt.getTime()).toEqual(new Date("2018/01/02").getTime());
    expect(post.updatedAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(user.email).toEqual("foo@bar.com");
  });
  it("supports nested factories", () => {
    interface IGroceryStore {
      aisle: {
        name: string;
        typeOfFood: string;
        budget?: number;
        tags: string[];
      };
    }

    const groceryStoreFactory = Sync.makeFactory<IGroceryStore>({
      aisle: {
        name: "Junk Food Aisle",
        typeOfFood: "Junk Food",
        tags: ["a", "b", "c"],
      },
    });

    // Error: Property 'name' is missing in type '{ budget: number; }
    const aStore = groceryStoreFactory.build({
      aisle: {
        budget: 9999,
        tags: ["a", "b"],
      },
    });
    expect(aStore.aisle.budget).toEqual(9999);
    expect(aStore.aisle.typeOfFood).toEqual("Junk Food");
    expect(aStore.aisle.tags).toEqual(["a", "b"]);
  });
  it("supports self-recursion with generator", () => {
    interface TypeA {
      foo: number;
    }
    const factoryA = Sync.makeFactory<TypeA>({
      foo: Sync.each((n) => n + 2),
    });
    const tenXFactory = factoryA.withSelfDerivation("foo", (v) => {
      return v.foo * 10;
    });
    const obj1 = tenXFactory.build();
    expect(obj1.foo).toEqual(20);
    const obj2 = tenXFactory.build({ foo: 25 });
    expect(obj2.foo).toEqual(25);
  });
  it("supports self-recursion with default", () => {
    interface TypeA {
      fooz: number;
    }
    const factoryA = Sync.makeFactory<TypeA>({
      fooz: 15,
    });
    const tenXFactory = factoryA.withSelfDerivation("fooz", (v) => {
      return v.fooz * 10;
    });
    const obj1 = tenXFactory.build();
    expect(obj1.fooz).toEqual(150);
    const obj2 = tenXFactory.build({ fooz: 25 });
    expect(obj2.fooz).toEqual(25);
  });
  it.skip("supports tuples at root (TODO)", () => {
    const generator: Sync.Generator<[number, number]> = Sync.each<
      [number, number]
    >((seq) => [seq * 2, seq * 2 + 1]);
    const factory = Sync.makeFactory<[number, number]>(generator.build(1));
    const value = factory.build();
    expect(isArray(value)).toEqual(true);
    expect(value).toEqual([2, 3]);
  });
  it("supports tuples as members", () => {
    const factory = Sync.makeFactory<{ foo: [number, number] }>(
      {
        foo: Sync.each((seq) => [seq * 2, seq * 2 + 1]),
      },
      { startingSequenceNumber: 1 }
    );
    const value = factory.build();
    expect(isArray(value.foo)).toEqual(true);
    expect(value.foo).toEqual([2, 3]);
  });
  it("supports recursive factories", () => {
    interface TypeA {
      foo: number;
      bar: string;
      recur: null | TypeA;
    }
    const factoryA = Sync.makeFactory<TypeA>({
      foo: Sync.each((n) => {
        console.log("  original 'foo'", n);
        console.trace();
        return n;
      }),
      bar: "hello",
      recur: null,
    });
    const factoryAPrime = factoryA
      .withDerivation("foo", (v, n) => {
        // recur: factoryA.build().foo should be 0, n should be 1
        // aWithA: factoryA.build().foo should be 1, n should be 2
        console.log(`  derive 'foo':`, { v, n });
        const foo = factoryA.build().foo;
        console.trace();
        const output = foo * 100 + n; // 001 : 102
        console.log(`  derivation 'foo':`, { output, foo, v, n });
        return output;
      })
      .withDerivation("bar", (v, n) => {
        // recur: n should be 2, v.foo should be 001 -> "001:1"
        // aWithA: n should be 3, v.foo should be 102 -> "102:2"
        return v.foo + ":" + n;
      });
    console.log("build justA");
    const justA = factoryAPrime.build({ foo: 99 }); // seq 1
    expect(justA.foo).toEqual(99);
    console.log("AWITHA STARTS");
    const aWithA = factoryAPrime.build({
      // outer: starts on seq 3
      recur: (() => {
        console.log("RECUR STARTS");
        const val = factoryAPrime.build(); // first call, with seqN 0
        console.log("RECUR ENDS", { val });
        return val;
      })(), // inner: starts on seq 2
    });
    console.log("AWITHA ENDS", aWithA);
    expect(aWithA.foo).toEqual(102);
    expect(aWithA.bar).toEqual("102:2");
    expect(aWithA.recur!.foo).toEqual(1);
    expect(aWithA.recur!.bar).toEqual("1:1");
  });
  it("recursion does not call unnecessary functions overridden by derivation", () => {
    interface TypeA {
      foo: number;
      bar: string;
      recur: null | TypeA;
    }
    let firstBarFunctionCallCount = 0;
    const factoryA = Sync.makeFactory<TypeA>({
      foo: Sync.each((n) => n),
      bar: Sync.each(() => {
        firstBarFunctionCallCount += 1;
        return "hello";
      }),
      recur: null,
    });
    const factoryAPrime = factoryA
      .withDerivation("foo", (_v, n) => {
        // recur: factoryA.build().foo should be 0, n should be 1
        // aWithA: factoryA.build().foo should be 1, n should be 2
        const foo = factoryA.build().foo;
        const output = foo * 100 + n; // 001 : 102
        return output;
      })
      .withDerivation("bar", (v, n) => {
        // recur: n should be 2, v.foo should be 001 -> "001:1"
        // aWithA: n should be 3, v.foo should be 102 -> "102:2"
        return v.foo + ":" + n;
      });
    firstBarFunctionCallCount = 0;
    const justA = factoryAPrime.build({ foo: 99 }); // seq 1
    expect(justA.foo).toEqual(99);
    expect(firstBarFunctionCallCount).toEqual(1);
  });
  it("recursion does not call unnecessary functions overridden by derivation", () => {
    interface TypeA {
      foo: number;
      bar: string;
      recur: null | TypeA;
    }
    let firstBarFunctionCallCount = 0;
    const factoryA = Sync.makeFactory<TypeA>({
      foo: Sync.each((n) => n),
      bar: Sync.each(() => {
        firstBarFunctionCallCount += 1;
        return "hello";
      }),
      recur: null,
    });
    const factoryAPrime = factoryA
      .withSelfDerivation("foo", (_v, n) => {
        // inner: factoryA.build().foo should be 0, n should be 1
        // outer: factoryA.build().foo should be 1, n should be 2
        const foo = factoryA.build().foo;
        return foo * 100 + n; // 001 : 102
      })
      .withSelfDerivation("bar", (v, n) => {
        // inner: n should be 2, v.foo should be 001 -> "001:1"
        // outer: n should be 3, v.foo should be 102 -> "102:2"
        return v.foo + ":" + n;
      });
    firstBarFunctionCallCount = 0;
    const justA = factoryAPrime.build({ foo: 99 }); // seq 1
    expect(justA.foo).toEqual(99);
    expect(firstBarFunctionCallCount).toEqual(1);
  });
  it("allows custom seq num start", () => {
    interface TypeA {
      foo: number;
      bar: string;
    }
    const factoryA = Sync.makeFactory<TypeA>(
      {
        foo: Sync.each((n) => n + 1),
        bar: "hello",
      },
      { startingSequenceNumber: 3 }
    );
    const a = factoryA.build();
    expect(a.foo).toEqual(4);
  });
  it("Can reset sequence number back to non-config default i.e. 0", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>({
      name: "Widget",
      id: Sync.each((i) => i),
    });

    const widgets = widgetFactory.buildList(3);
    expect(widgets.map((w) => w.id)).toEqual([0, 1, 2]);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets.map((w) => w.id)).toEqual([0, 1, 2]);
  });
  it("Can reset sequence number back to config default", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>(
      {
        name: "Widget",
        id: Sync.each((i) => i),
      },
      {
        startingSequenceNumber: 100,
      }
    );

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(102);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[2].id).toBe(102);
  });
  it("Can reset sequence number to an arbitrary value", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>({
      name: "Widget",
      id: Sync.each((i) => i),
    });

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(2);

    widgetFactory.resetSequenceNumber(5);

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[0].id).toBe(5);
  });
  it("clones deeply nested values", () => {
    interface TypeA {
      bar: {
        baz: string;
      };
    }
    const factoryA = Sync.makeFactory<TypeA>({
      bar: {
        baz: "should-be-immutable",
      },
    });
    const a = factoryA.build();
    const b = factoryA.build();
    a.bar.baz = "is-not-immutable";
    expect(b.bar.baz).toEqual("should-be-immutable");
  });
  it("supports required fields", () => {
    interface DbRecord {
      foreignId: string;
      name: string;
    }
    const factoryA = Sync.makeFactoryWithRequired<DbRecord, "foreignId">({
      name: "hello",
    });
    // compile failures
    //const z = factoryA.build();
    //const z = factoryA.build({ });
    //const z = factoryA.build({ name: "uhoh" });

    // data checks
    const a = factoryA.build({ foreignId: "fk1" });
    expect(a).toEqual({ name: "hello", foreignId: "fk1" });
    const b = factoryA.build({ foreignId: "fk2", name: "goodbye" });
    expect(b).toEqual({ name: "goodbye", foreignId: "fk2" });

    // more compile failures
    //const [y,z] = factoryA.buildList(5);
    //const [y,z] = factoryA.buildList(5, {});
    //const [y,z] = factoryA.buildList(5, { name: 'hello' });

    // data checks
    const [c, d] = factoryA.buildList(2, { foreignId: "fk3" });
    expect(c).toEqual({ name: "hello", foreignId: "fk3" });
    expect(d).toEqual({ name: "hello", foreignId: "fk3" });
  });
  it("can build item using BuilderFactory", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>(() => ({
      name: "Widget",
      id: Sync.each((i) => i + 1),
    }));

    const widget = widgetFactory.build({
      name: "New widget",
    });

    expect(widget).toStrictEqual({
      name: "New widget",
      id: 1,
    });
  });
  it("can extend factory with BuilderFactory", () => {
    const widgetFactory = Sync.makeFactory<WidgetType>(() => ({
      name: "Widget",
      id: Sync.each((i) => i + 1),
    }));

    const newWidgetFactory = widgetFactory.extend({
      name: "Extended widget",
    });

    const widget = newWidgetFactory.build({
      name: "New widget",
    });

    expect(widget).toStrictEqual({
      name: "New widget",
      id: 1,
    });
  });
  it("can combine factories with BuilderFactory", () => {
    const timeStamps = Sync.makeFactory(() => ({
      createdAt: Sync.each(() => new Date()),
      updatedAt: Sync.each(() => new Date()),
    }));
    const softDelete = Sync.makeFactory(() => ({
      isDeleted: false,
    }));
    interface Post {
      content: string;
      createdAt: Date;
      updatedAt: Date;
      isDeleted: boolean;
    }
    interface User {
      email: string;
      createdAt: Date;
      updatedAt: Date;
      isDeleted: boolean;
    }
    const postFactory: Sync.Factory<Post> = Sync.makeFactory(() => ({
      content: "lorem ipsum",
    }))
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Sync.Factory<User> = Sync.makeFactory({
      email: "test@user.com",
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true,
    });
    expect(post.createdAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(post.isDeleted).toEqual(true);
    const user = userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02"),
    });
    expect(user.createdAt.getTime()).toEqual(new Date("2018/01/02").getTime());
    expect(post.updatedAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(user.email).toEqual("foo@bar.com");
  });
  it("stops RecPartial at unknown (will fail to compile with null value otherwise)", () => {
    interface Data {
      id: string;
      description: string;
      payload: unknown;
    }
    const dataFactory = Sync.makeFactoryWithRequired<Data, "payload">({
      id: Sync.each((i) => i.toString()),
      description: "lorem ipsum",
    });
    const instanceOfData = dataFactory.build({
      id: "1",
      payload: null,
    });
    expect(instanceOfData.payload).toEqual(null);
  });
});

// const userFactory = Sync.makeFactory({
//   firstName: "Peter",
//   lastName: "Parker",
// });

// // Doesn't work - firstName is an empty object
// const userWithMiddleNameFactory = userFactory.withDerivation(
//   "firstName",
//   (user) => {
//     console.log("ummm", user);
//     return user.firstName + " Benjamin";
//   }
// );

// // Also doesn't work
// const altUserWithMiddleNameFactory = userFactory.withDerivation1(
//   ["firstName"],
//   "firstName",
//   (firstName) => {
//     return firstName + " Benjamin";
//   }
// );

// // Works for different fields
// const userWithSameNamesFactory = userFactory.withDerivation(
//   "firstName",
//   (user) => {
//     return user.lastName;
//   }
// );

// console.log(
//   JSON.stringify(
//     {
//       userFactory: userFactory.build({}),
//       userWithMiddleNameFactory: userWithMiddleNameFactory.build({}),
//       altUserWithMiddleNameFactory: altUserWithMiddleNameFactory.build({}),
//       userWithSameNamesFactory: userWithSameNamesFactory.build({}),
//     },
//     null,
//     2
//   )
// );
