import { TerminationError, TimeoutError } from './errors';
import { withTimeout } from '@cameronhunter/async-with-timeout';
import { type DebugLogger, createDebugLogger } from './createDebugLogger';
import { cloneError } from '@cameronhunter/clone-error';

type PendingPromise<T = unknown> = {
    resolve(item: T): void;
    reject(error?: Error): void;
    rejectionError?: Error;
};

export type Options = Partial<{
    name: string;
    signal: AbortSignal;
}>;

export type CreateOptions = {
    timeout?: number;
    rejectionError?: Error;
};

export class PendingPromises implements Disposable {
    readonly #debug: DebugLogger = createDebugLogger(this.constructor.name);
    readonly #map: Map<number, PendingPromise<unknown>> = new Map();
    readonly #signal?: AbortSignal;

    #id: number = 0;

    constructor(options?: Options) {
        this.#signal = options?.signal;
        if (options?.name) {
            this.#debug = this.#debug.extend(options.name);
        }
    }

    /**
     * Create a pending promise. This will return the pending promise and an
     * identifier that can be used to reference it for future resolution or
     * rejection.
     */
    create<T = unknown>(options?: CreateOptions): [id: number, promise: Promise<T>] {
        const id = ++this.#id;

        const timeout = options?.timeout || 0;
        const rejectionError = options?.rejectionError;
        const timeoutError = new TimeoutError(`Promise timed out after ${timeout}ms`);

        const promise = withTimeout(
            timeout,
            () => {
                return new Promise<T>((resolve, reject) => {
                    this.#map.set(id, {
                        resolve,
                        reject,
                        rejectionError: rejectionError,
                    });
                });
            },
            {
                signal: this.#signal,
                rejectionError: rejectionError ? cloneError(rejectionError, { cause: timeoutError }) : timeoutError,
            },
        );

        return [id, promise];
    }

    get size(): number {
        return this.#map.size;
    }

    resolve(id: number, value: unknown) {
        this.#map.get(id)?.resolve(value);
        return this.#map.delete(id);
    }

    reject(id: number, err?: Error) {
        const pendingPromise = this.#map.get(id);

        if (pendingPromise) {
            const error = pendingPromise.rejectionError
                ? cloneError(pendingPromise.rejectionError, { cause: err })
                : err;

            pendingPromise.reject(error);

            this.#debug(`Rejected Promise<${id}> with: %O`, error);

            return this.#map.delete(id);
        }
    }

    dispose(): void {
        this[Symbol.dispose]();
    }

    [Symbol.dispose](): void {
        if (this.#map.size > 0) {
            this.#debug(`Disposing of pending ${this.#map.size} promise(s).`);

            const terminationError = new TerminationError(`Disposing of ${this.constructor.name}`);

            for (const pendingPromise of this.#map.values()) {
                pendingPromise.reject(
                    pendingPromise.rejectionError
                        ? cloneError(pendingPromise.rejectionError, { cause: terminationError })
                        : terminationError,
                );
            }

            this.#map.clear();
        }
    }
}
