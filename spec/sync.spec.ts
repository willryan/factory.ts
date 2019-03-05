import * as Factory from "../src/sync";
import { makeFactory } from "../src/sync";

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
  const childFactory = Factory.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Factory.makeFactory<ParentType>({
    name: "Parent",
    birthday: Factory.each(i => new Date(`2017/05/${i + 1}`)),
    children: Factory.each(() => []),
    spouse: null
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
      children: [jimmy, alice]
    });
    expect(susan.children.map(c => c.name)).toEqual(["Jimmy", "Alice"]);
  });
  it("can refer to other factories", () => {
    const parentWithKidsFactory = Factory.makeFactory<ParentType>({
      name: "Timothy",
      birthday: Factory.each(i => new Date(`2017/05/${i}`)),
      children: Factory.each(() => [
        childFactory.build({ name: "Bobby" }),
        childFactory.build({ name: "Jane" })
      ]),
      spouse: null
    });
    const tim = parentWithKidsFactory.build({
      birthday: new Date("2017-02-01")
    });
    expect(tim.children.map(c => c.name)).toEqual(["Bobby", "Jane"]);
  });
  it("can extend existing factories", () => {
    const geniusFactory = childFactory.extend({
      grade: Factory.each(i => (i + 1) * 2)
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
    const personFactory = Factory.makeFactory<Person>({
      firstName: "Double-O",
      lastName: Factory.each(() => "Bond"),
      fullName: ""
    }).withDerivation("fullName", p => `${p.firstName} ${p.lastName}`);
    //.withDerivation2(['firstName','lastName'],'fullName', (fn, ln) => `${fn} ${ln}`);
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
    const timeStamps = makeFactory({
      createdAt: Factory.each(() => new Date()),
      updatedAt: Factory.each(() => new Date())
    });
    const softDelete = makeFactory({
      isDeleted: false
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
    const postFactory: Factory.Factory<Post> = makeFactory({
      content: "lorem ipsum"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Factory.Factory<User> = makeFactory({
      email: "test@user.com"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true
    });
    expect(post.createdAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(post.isDeleted).toEqual(true);
    const user = userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02")
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

    const groceryStoreFactory = Factory.makeFactory<IGroceryStore>({
      aisle: {
        name: "Junk Food Aisle",
        typeOfFood: "Junk Food",
        tags: ["a", "b", "c"]
      }
    });

    // Error: Property 'name' is missing in type '{ budget: number; }
    const aStore = groceryStoreFactory.build({
      aisle: {
        budget: 9999,
        tags: ["a", "b"]
      }
    });
    expect(aStore.aisle.budget).toEqual(9999);
    expect(aStore.aisle.typeOfFood).toEqual("Junk Food");
    expect(aStore.aisle.tags).toEqual(["a", "b"]);
  });
  it("supports recursive factories", () => {
    interface TypeA {
      foo: number;
      bar: string;
      recur: null | TypeA;
    }
    const factoryA = Factory.makeFactory<TypeA>({
      foo: Factory.each(n => n),
      bar: "hello",
      recur: null
    })
    const factoryAPrime = factoryA.withDerivation("foo", (_v, n) => {
      // inner: factoryA.build().foo should be 0, n should be 1
      // outer: factoryA.build().foo should be 1, n should be 2
      const foo = factoryA.build().foo;
      return foo * 100 + n; // 001 : 102
    }).withDerivation("bar", (v, n) => {
      // inner: n should be 2, v.foo should be 001 -> "001:1"
      // outer: n should be 3, v.foo should be 102 -> "102:2"
      return v.foo + ":" + n;
    });
    const justA = factoryAPrime.build({ foo: 99 }); // seq 1
    expect(justA.foo).toEqual(99);
    const aWithA = factoryAPrime.build({ // outer: starts on seq 3
      recur: factoryAPrime.build() // inner: starts on seq 2
    });
    expect(aWithA.foo).toEqual(102);
    expect(aWithA.bar).toEqual("102:2");
    expect(aWithA.recur!.foo).toEqual(1);
    expect(aWithA.recur!.bar).toEqual("1:1");
  });
  it("allows custom seq num start", () => {
    interface TypeA {
      foo: number;
      bar: string;
    }
    const factoryA = Factory.makeFactory<TypeA>({
      foo: Factory.each(n => n + 1),
      bar: "hello",
    }, { startingSequenceNumber: 3 });
    const a = factoryA.build();
    expect(a.foo).toEqual(4);
  })
  it("Can reset sequence number back to non-config default i.e. 0", () => {
    const widgetFactory = Factory.makeFactory<WidgetType>({
      name: "Widget",
      id: Factory.each(i => i)
    });

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(2);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[2].id).toBe(2);
  })
  it("Can reset sequence number back to config default", () => {
    const widgetFactory = Factory.makeFactory<WidgetType>({
      name: "Widget",
      id: Factory.each(i => i)
    }, {
        startingSequenceNumber: 100
      });

    const widgets = widgetFactory.buildList(3);
    expect(widgets[2].id).toBe(102);

    widgetFactory.resetSequenceNumber();

    const moreWidgets = widgetFactory.buildList(3);
    expect(moreWidgets[2].id).toBe(102);
  })
});
it("clones deeply nested values", () => {
  interface TypeA {
    bar: {
      baz: string;
    }
  }
  const factoryA = Factory.makeFactory<TypeA>({
    bar: {
      baz: "should-be-immutable"
    }
  });
  const a = factoryA.build();
  const b = factoryA.build();
  a.bar.baz = "is-not-immutable";
  expect(b.bar.baz).toEqual("should-be-immutable")
});