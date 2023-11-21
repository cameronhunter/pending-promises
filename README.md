# `@cameronhunter/pending-promises`

[![npm package](https://img.shields.io/npm/v/%40cameronhunter/pending-promises?logo=npm)](https://www.npmjs.com/package/@cameronhunter/pending-promises)
[![npm downloads](https://img.shields.io/npm/dm/%40cameronhunter/pending-promises?logo=npm)](https://www.npmjs.com/package/@cameronhunter/pending-promises)
[![main branch status](https://img.shields.io/github/actions/workflow/status/cameronhunter/pending-promises/post-merge.yml?logo=github&label=main)](https://github.com/cameronhunter/pending-promises/actions/workflows/post-merge.yml)

> A map of pending promises that can be resolved/rejected at a later time.

This data structure helps convert event-based APIs to promise-based. Here's an
example that wraps a WebSocket client, providing a promise-based API.

```ts
import { PendingPromises } from '@cameronhunter/pending-promises';

class MyAPI {
    readonly #responses: PendingPromises = new PendingPromises();
    readonly #ws: WebSocket;

    constructor(ws: WebSocket) {
        this.#ws = ws;
        this.#ws.on('message', this.#onMessage.bind(this));
    }

    send(message: string): Promise<string> {
        // Create a new pending promise
        const [id, promise] = this.#responses.create<string>();

        ws.send(JSON.stringify({ id, message }), (err) => {
            if (err) {
                // Reject immediately if sending fails.
                this.#responses.reject(id, err);
            }
        });

        return promise;
    }

    #onMessage(event: WebSocket.MessageEvent): void {
        const { id, result, error } = JSON.parse(event.data as string);

        if (id) {
            if (error) {
                this.#responses.reject(id, error);
            } else {
                this.#responses.resolve(id, result);
            }
        }
    }
}
```
