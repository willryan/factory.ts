import * as Async from "../src/async";
import * as Sync from "../src/sync";
import { makeFactory } from "../src/async";

interface ParentType {
  name: string;
  birthday: Date;
  children: ChildType[];
  spouse: ParentType | null;
}

interface ChildType {
  name: string;
  grade: number;
}

describe("async factories build stuff", () => {
  const childFactory = Async.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Async.makeFactory<ParentType>({
    name: "Parent",
    birthday: Async.each(i => Promise.resolve(new Date(`2017/05/${i}`))),
    children: Async.each(() => []),
    spouse: null
  });
  it("makes an object from a factory", async () => {
    const jimmy = await childFactory.build({ name: "Jimmy" });
    expect(jimmy.name).toEqual("Jimmy");
    expect(jimmy.grade).toEqual(1);
  });
  it("makes an object with default field from a factory", async () => {
    const jimmy = await childFactory.build();
    expect(jimmy.name).toEqual("Kid");
    expect(jimmy.grade).toEqual(1);
  });
  it("can make use of sequence #", async () => {
    const susan = await parentFactory.build({ name: "Susan" });
    const edward = await parentFactory.build({ name: "Edward" });
    expect(susan.birthday.getTime()).toEqual(new Date("2017/05/01").getTime());
    expect(edward.birthday.getTime()).toEqual(new Date("2017/05/02").getTime());
  });
  it("can handle has many", async () => {
    const jimmy = await childFactory.build({ name: "Jimmy" });
    const alice = await childFactory.build({ name: "Alice", grade: 3 });
    const susan = await parentFactory.build({
      name: "Susan",
      children: [jimmy, alice]
    });
    expect(susan.children.map(c => c.name)).toEqual(["Jimmy", "Alice"]);
  });
  it("can refer to other factories", async () => {
    const parentWithKidsFactory = Async.makeFactory<ParentType>({
      name: "Timothy",
      birthday: Async.each(i => new Date(`2017/05/${i}`)),
      children: Async.each(async () => [
        await childFactory.build({ name: "Bobby" }),
        await childFactory.build({ name: "Jane" })
      ]),
      spouse: null
    });
    const tim = await parentWithKidsFactory.build({
      birthday: new Date("2017-02-01")
    });
    expect(tim.children.map(c => c.name)).toEqual(["Bobby", "Jane"]);
  });
  it("can extend existing factories", async () => {
    const geniusFactory = childFactory.extend({
      grade: Async.each(i => {
        return new Promise((res, _rej) => {
          setTimeout(() => {
            res(i * 2);
          }, 1);
        });
      })
    });
    const colin = await geniusFactory.build({ name: "Colin" });
    expect(colin.grade).toEqual(2);
    const albert = await geniusFactory.build({ name: "Albert" });
    expect(albert.grade).toEqual(4);
  });
  it("can derive one value based on another value", async () => {
    interface Person {
      readonly firstName: string;
      readonly lastName: string;
      readonly fullName: string;
    }
    const personFactory = Async.makeFactory<Person>({
      firstName: "",
      lastName: "Bond",
      fullName: ""
    }).withDerivation("fullName", p => `${p.firstName} ${p.lastName}`);
    //.withDerivation2(['firstName','lastName'],'fullName', (fn, ln) => `${fn} ${ln}`);
    const bond = await personFactory.build({ firstName: "James" });
    expect(bond.fullName).toEqual("James Bond");
  });
  it("can build a list of items", async () => {
    const children = await childFactory.buildList(3, { name: "Bruce" });
    expect(children.length).toEqual(3);
    for (let child of children) {
      expect(child.name).toEqual("Bruce");
      expect(child.grade).toEqual(1);
    }
  });
  it("can combine factories", async () => {
    const timeStamps = makeFactory({
      createdAt: Async.each(async () => new Date()),
      updatedAt: Async.each(async () => new Date())
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
    const postFactory: Async.Factory<Post> = makeFactory({
      content: "lorem ipsum"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const userFactory: Async.Factory<User> = makeFactory({
      email: "test@user.com"
    })
      .combine(timeStamps)
      .combine(softDelete);
    const post = await postFactory.build({
      content: "yadda yadda yadda",
      isDeleted: true
    });
    expect(post.createdAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(post.isDeleted).toEqual(true);
    const user = await userFactory.build({
      email: "foo@bar.com",
      createdAt: new Date("2018/01/02")
    });
    expect(user.createdAt.getTime()).toEqual(new Date("2018/01/02").getTime());
    expect(post.updatedAt.getTime() - new Date().getTime()).toBeLessThan(100);
    expect(user.email).toEqual("foo@bar.com");
  });
  it("supports nested factories", async () => {
    interface IGroceryStore {
      aisle: {
        name: string;
        typeOfFood: string;
        budget: number;
        tags: string[];
      };
    }

    const groceryStoreFactory = Async.makeFactory<IGroceryStore>({
      aisle: {
        name: "Junk Food Aisle",
        typeOfFood: "Junk Food",
        budget: 3000,
        tags: ["a", "b", "c"]
      }
    });

    // Error: Property 'name' is missing in type '{ budget: number; }
    const aStore = await groceryStoreFactory.build({
      aisle: {
        budget: 9999,
        tags: ["a", "b"]
      }
    });
    expect(aStore.aisle.budget).toEqual(9999);
    expect(aStore.aisle.typeOfFood).toEqual("Junk Food");
    expect(aStore.aisle.tags).toEqual(["a", "b"]);
  });
  it("can transform type", async () => {
    const makeAdult = childFactory.transform<ParentType>(t => {
      const birthday = `${2018 - t.grade - 25}/05/10`;
      return {
        name: t.name,
        birthday: new Date(birthday),
        spouse: null,
        children: []
      };
    });
    const susan = await makeAdult.build({ name: "Susan", grade: 5 });
    expect(susan.birthday.getTime()).toEqual(new Date("1988/05/10").getTime());
    expect(susan.name).toEqual("Susan");
    expect(susan.spouse).toEqual(null);
    expect(susan.children.length).toEqual(0);
  });
  type Saved<T extends Object> = T & { id: number };
  function saveRecord<T extends Object>(t: T): Promise<Saved<T>> {
    return new Promise<Saved<T>>(res => {
      setTimeout(() => {
        const saved: Saved<T> = {
          ...(t as any),
          id: Math.random() * 10000
        };
        res(saved);
      }, 1);
    });
  }
  it("can model db factories", async () => {
    interface SavedParentType {
      name: string;
      birthday: Date;
      children: Saved<ChildType>[];
      spouse: Saved<SavedParentType> | null;
    }
    const dbChildFactory = childFactory.transform(saveRecord);
    const savedParentFactory = Async.makeFactory<SavedParentType>({
      name: "Parent",
      birthday: Async.each(i => Promise.resolve(new Date(`2017/05/${i}`))),
      children: Async.each(() => []),
      spouse: null
    });
    const dbParentFactory = savedParentFactory.transform(saveRecord);
    const familyFactory = savedParentFactory
      .extend({
        name: "Ted",
        children: Promise.all([
          await dbChildFactory.build({ name: "Billy" }),
          await dbChildFactory.build({ name: "Amy" })
        ]),
        spouse: await dbParentFactory.build({ name: "Susan" })
      })
      .transform(saveRecord);
    const ted = await familyFactory.build({ birthday: new Date("1980/09/23") });
    expect(ted.id).toBeGreaterThan(0);
    expect(ted.birthday.getTime()).toEqual(new Date("1980/09/23").getTime());
    expect(ted.name).toEqual("Ted");
    expect(ted.spouse!.id).toBeGreaterThan(0);
    expect(ted.spouse!.name).toEqual("Susan");
    expect(ted.spouse!.id).toBeGreaterThan(0);
    expect(ted.children[0]!.name).toEqual("Billy");
    expect(ted.children[1]!.name).toEqual("Amy");
  });
  it("can create async factories from sync builders", async () => {
    const parentFactory = Async.makeFactoryFromSync<ParentType>({
      name: "Parent",
      birthday: Sync.each(i => new Date(`2017/05/${i}`)),
      children: Sync.each(() => []),
      spouse: null
    });
    const susan = await parentFactory.build({ name: "Susan" });
    expect(susan.name).toEqual("Susan");
    expect(susan.birthday.getTime()).toEqual(new Date("2017/05/01").getTime());
  });
});
