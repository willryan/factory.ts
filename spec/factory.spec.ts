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

describe('factories do stuff', () => {
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
    const jimmy = childFactory({ name: 'Jimmy' });
    expect(jimmy.name).to.eq('Jimmy');
    expect(jimmy.grade).to.eq(1);
  });
  it('can make use of sequence #', () => {
    const susan = parentFactory({ name: 'Susan' });
    const edward = parentFactory({ name: 'Edward' });
    expect(susan.birthday.getTime()).to.eq(new Date('2017/05/01').getTime());
    expect(edward.birthday.getTime()).to.eq(new Date('2017/05/02').getTime());
  });
  it('can handle has many', () => {
    const jimmy = childFactory({ name: 'Jimmy' });
    const alice = childFactory({ name: 'Alice', grade: 3 });
    const susan = parentFactory({ name: 'Susan', children: [ jimmy, alice ] });
    expect(susan.children.map(c => c.name)).to.deep.eq(['Jimmy', 'Alice']);
  });
  it('can refer to other factories', () => {
    const parentWithKidsFactory = Factory.makeFactory<ParentType>({
      name: 'Timothy',
      birthday: Factory.each(i => new Date(`2017/05/${i}`)),
      children: Factory.each(() => [
        childFactory({ name: 'Bobby' }),
        childFactory({ name: 'Jane' })
      ]),
      spouse: null
    });
    const tim = parentWithKidsFactory({ birthday: new Date('2017-02-01')});
    expect(tim.children.map(c => c.name)).to.deep.eq(['Bobby', 'Jane']);
  });
})

