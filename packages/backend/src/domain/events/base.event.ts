/**
 * Base class for all domain events
 */
export abstract class BaseEvent {
  public readonly occurredOn: Date;
  public readonly eventName: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventName = this.constructor.name;
  }
}
