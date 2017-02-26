import * as Factory from '../src/factory';
import { expect } from 'chai';

interface ParentType {
  name: string
  birthday: Date
  children: ChildType[]
  spouse: ParentType | null
}

interface ChildType {
  name: string
  grade: number
}

describe('factories build stuff', () => {
  const childFactory = Factory.makeFactory<ChildType>({
    name: 'Kid',
    grade: 1
  });
  const parentFactory = Factory.makeFactory<ParentType>({
    name: 'Parent',
    birthday: Factory.each(i => new Date(`2017/05/${i}`)),
    children: Factory.each(() => []),
    spouse: null
  });
  it('makes an object from a factory', () => {
    const jimmy = childFactory.build({ name: 'Jimmy' });
    expect(jimmy.name).to.eq('Jimmy');
    expect(jimmy.grade).to.eq(1);
  });
  it('can make use of sequence #', () => {
    const susan = parentFactory.build({ name: 'Susan' });
    const edward = parentFactory.build({ name: 'Edward' });
    expect(susan.birthday.getTime()).to.eq(new Date('2017/05/01').getTime());
    expect(edward.birthday.getTime()).to.eq(new Date('2017/05/02').getTime());
  });
  it('can handle has many', () => {
    const jimmy = childFactory.build({ name: 'Jimmy' });
    const alice = childFactory.build({ name: 'Alice', grade: 3 });
    const susan = parentFactory.build({ name: 'Susan', children: [ jimmy, alice ] });
    expect(susan.children.map(c => c.name)).to.deep.eq(['Jimmy', 'Alice']);
  });
  it('can refer to other factories', () => {
    const parentWithKidsFactory = Factory.makeFactory<ParentType>({
      name: 'Timothy',
      birthday: Factory.each(i => new Date(`2017/05/${i}`)),
      children: Factory.each(() => [
        childFactory.build({ name: 'Bobby' }),
        childFactory.build({ name: 'Jane' })
      ]),
      spouse: null
    });
    const tim = parentWithKidsFactory.build({ birthday: new Date('2017-02-01')});
    expect(tim.children.map(c => c.name)).to.deep.eq(['Bobby', 'Jane']);
  });
  it('can extend existing factories', () => {
    const geniusFactory = childFactory.extend({
      grade: Factory.each(i => i*2)
    });
    const colin = geniusFactory.build({name: "Colin"});
    expect(colin.grade).to.eq(2);
    const albert = geniusFactory.build({name: "Albert"});
    expect(albert.grade).to.eq(4);
  });
  it('can derive one value based on another value', () => {
    interface Person {
      readonly firstName : string
      readonly lastName : string
      readonly fullName : string
    }
    const personFactory = Factory.makeFactory<Person>({
      firstName: '',
      lastName: 'Bond',
      fullName: ''
    }).withDerivation('fullName', (p) => `${p.firstName} ${p.lastName}`);
    //.withDerivation2(['firstName','lastName'],'fullName', (fn, ln) => `${fn} ${ln}`);
    const bond = personFactory.build({firstName: 'James'});
    expect(bond.fullName).to.eq('James Bond');
  });
});

