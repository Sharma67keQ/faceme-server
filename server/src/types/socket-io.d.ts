declare module "socket.io" {
  export class Server {
    constructor(...args: unknown[]);
    on(event: string, listener: (...args: any[]) => void): this;
    close(): void;
  }
}
