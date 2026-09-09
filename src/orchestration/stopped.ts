export class Stopped extends Error {
  constructor(public status: 'conflict' | 'unsupported' | 'canceled', message: string) { super(message); }
}
