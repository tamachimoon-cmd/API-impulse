export class CheckHistory {
  #items = [];
  #limit;

  constructor(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new TypeError('O limite do histórico deve ser um inteiro positivo.');
    }

    this.#limit = limit;
  }

  add(item) {
    this.#items.unshift(structuredClone(item));
    this.#items = this.#items.slice(0, this.#limit);
    return this.list();
  }

  list() {
    return structuredClone(this.#items);
  }

  clear() {
    this.#items = [];
  }
}
