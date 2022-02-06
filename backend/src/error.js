export class InputError extends Error {
  constructor (message) {
    // Error实例上就有message属性，其属性值就是下面这个message的值。
    super(message);
    this.name = 'InputError';
  }
}

export class AccessError extends Error {
  constructor (message) {
    super(message);
    this.name = 'AccessError';
  }
}
