export class Session extends EventTarget { 
  #callbacks: {
    [id: number]: (response: { error?: unknown; result?: unknown }) => void;
  };

  #nextCommandId: number;
  #socket: WebSocket;

  constructor(socket: WebSocket) {
    super();

    this.#callbacks = {};
    this.#nextCommandId = 1;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if ("id" in message) {
        const { id, result, error } = message;
        const callback = this.#callbacks[id];
        callback({ error, result });
      } else {
        const { method, params } = message;
        this.dispatchEvent(
          new MessageEvent(method, {
            data: params,
          }),
        );
      }
    });

    this.#socket = socket;
  }

  send(method: string, params: unknown = {}): Promise<unknown> {
    const id = this.#nextCommandId++;
    const message = { id, method, params };

    return new Promise((resolve, reject) => {
      this.#callbacks[id] = ({ error, result }) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };

      this.#socket.send(JSON.stringify(message));
    });
  }

  close() {
    this.#socket.close();
  }
}

export interface ConnectOptions {
  url: string;
}

export function connect(
  options: ConnectOptions,
): Promise<Session> {
  const socket = new WebSocket(options.url);
  return new Promise((resolve, reject) => {
    socket.onopen = () => {
      const session = new Session(socket);
      resolve(session);
    };

    socket.onerror = (event) => {
      reject(event);
    };
  });
}
