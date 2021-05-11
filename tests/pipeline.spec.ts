import * as Pipe from "../src/pipeline";
import * as Factory from "../src/async";

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

describe("pipelines", () => {
  const childFactory = Factory.makeFactory<ChildType>({
    name: "Kid",
    grade: 1
  });
  const parentFactory = Factory.makeFactoryWithRequired<ParentType, "spouse">(
    {
      name: "Parent",
      birthday: Factory.each(i => Promise.resolve(new Date(`2017/05/${i}`))),
      children: Factory.each(() => [])
    },
    { startingSequenceNumber: 1 }
  );
  const grandpaFactory = parentFactory.transform(parent => {
    return {
      ...parent,
      spoils: true
    };
  });
  it("builds data in steps", async () => {
    const p = Pipe.Pipeline.start()
      .addValues({ hello: "kitty", hola: "espanol" })
      .addValues(() => Promise.resolve({ byebye: "birdie" }))
      .addValues(v => ({
        corner: `${v.hello} corner`,
        golf: v.byebye
      }))
      .addFactory(childFactory, "kiddo", { grade: 2 })
      .addFactory(parentFactory, "dad", v =>
        Promise.resolve({
          name: "Dad",
          children: [v.kiddo],
          spouse: null
        })
      )
      .addTxFactory(grandpaFactory, "gramps", v => ({
        name: "Gramps",
        children: [v.dad],
        spouse: null
      }));
    const data = await p;
    expect(data.hello).toEqual("kitty");
    expect(data.hola).toEqual("espanol");
    expect(data.byebye).toEqual("birdie");
    expect(data.corner).toEqual("kitty corner");
    expect(data.golf).toEqual("birdie");
    expect(data.kiddo.grade).toEqual(2);
    expect(data.kiddo.name).toEqual("Kid");
    expect(data.dad.name).toEqual("Dad");
    expect(data.dad.birthday.getTime()).toEqual(
      new Date("2017/05/01").getTime()
    );
    expect(data.dad.children.length).toEqual(1);
    expect(data.dad.children[0]).toEqual(data.kiddo);
    expect(data.dad.spouse).toBeNull();
    expect(data.gramps.name).toEqual("Gramps");
    expect(data.gramps.spoils).toEqual(true);
    expect(data.gramps.children.length).toEqual(1);
    expect(data.gramps.children[0]).toEqual(data.dad);
    expect(data.gramps.spouse).toBeNull();
  });
});
