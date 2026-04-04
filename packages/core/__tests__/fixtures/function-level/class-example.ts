/**
 * Fixture: class-example.ts
 * Contains a class with constructor, methods, getter, setter, and static method.
 */

export class Animal {
  private _name: string;
  private _sound: string;

  constructor(name: string, sound: string) {
    this._name = name;
    this._sound = sound;
  }

  speak(): string {
    return `${this._name} says ${this._sound}`;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  static create(name: string, sound: string): Animal {
    return new Animal(name, sound);
  }
}
