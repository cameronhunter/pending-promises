import { TimeoutError, TerminationError } from '../src/errors';
import { PendingPromises } from '../src/PendingPromises';

describe('create', () => {
    test('returns a unique ID for each add', async () => {
        const pendingPromises = new PendingPromises();

        const [id1] = pendingPromises.create();
        expect(id1).toEqual(expect.any(Number));

        const [id2] = pendingPromises.create();
        expect(id2).toEqual(expect.any(Number));

        expect(id1).toBeLessThan(id2);
    });

    test('supports timeouts', async () => {
        const pendingPromises = new PendingPromises();

        const [_id, promise] = pendingPromises.create({ timeout: 1 });

        await expect(promise).rejects.toEqual(expect.any(TimeoutError));
        await expect(promise).rejects.toHaveProperty('message', 'Promise timed out after 1ms');
    });

    test('supports timeouts with custom errors', async () => {
        const pendingPromises = new PendingPromises();

        const [_id, promise] = pendingPromises.create({
            timeout: 1,
            rejectionError: new Error('Custom error message'),
        });

        await expect(promise).rejects.toEqual(expect.any(Error));
        await expect(promise).rejects.toHaveProperty('message', 'Custom error message');
        await expect(promise).rejects.toHaveProperty('cause', expect.any(TimeoutError));
        await expect(promise).rejects.toHaveProperty('cause.message', 'Promise timed out after 1ms');
    });
});

describe('size', () => {
    test('grows when creating', async () => {
        const pendingPromises = new PendingPromises();

        expect(pendingPromises.size).toBe(0);

        pendingPromises.create();

        expect(pendingPromises.size).toBe(1);

        pendingPromises.create();

        expect(pendingPromises.size).toBe(2);
    });

    test('shrinks when resolving', async () => {
        const pendingPromises = new PendingPromises();

        expect(pendingPromises.size).toBe(0);

        const [id] = pendingPromises.create();

        expect(pendingPromises.size).toBe(1);

        pendingPromises.resolve(id, 'value');

        expect(pendingPromises.size).toBe(0);
    });

    test('shrinks when rejecting', async () => {
        const pendingPromises = new PendingPromises();

        expect(pendingPromises.size).toBe(0);

        const [id, promise] = pendingPromises.create();

        expect(pendingPromises.size).toBe(1);

        pendingPromises.reject(id, new Error('BANG!'));

        await expect(promise).rejects.toThrow();

        expect(pendingPromises.size).toBe(0);
    });
});

describe('resolve', () => {
    test('resolves a pending promise', async () => {
        const pendingPromises = new PendingPromises();

        const [id, promise] = pendingPromises.create<string>();

        pendingPromises.resolve(id, 'Hello world!');

        await expect(promise).resolves.toBe('Hello world!');
    });
});

describe('reject', () => {
    test('rejects a pending promise', async () => {
        const pendingPromises = new PendingPromises();

        const [id, promise] = pendingPromises.create();

        pendingPromises.reject(id, new Error('BANG!'));

        await expect(promise).rejects.toEqual(expect.any(Error));
        await expect(promise).rejects.toHaveProperty('message', 'BANG!');
    });
});

describe('dispose', () => {
    test('rejects all pending promises', async () => {
        const pendingPromises = new PendingPromises();

        const [_id, promise] = pendingPromises.create();

        pendingPromises[Symbol.dispose]();

        await expect(promise).rejects.toEqual(expect.any(TerminationError));
        await expect(promise).rejects.toHaveProperty('message', 'Disposing of PendingPromises');
    });

    test('rejects pending promises with a custom rejection error', async () => {
        const pendingPromises = new PendingPromises();

        const [_id, promise] = pendingPromises.create({ rejectionError: new Error('Custom termination message') });

        pendingPromises[Symbol.dispose]();

        await expect(promise).rejects.toEqual(expect.any(Error));
        await expect(promise).rejects.toHaveProperty('message', 'Custom termination message');
        await expect(promise).rejects.toHaveProperty('cause', expect.any(TerminationError));
        await expect(promise).rejects.toHaveProperty('cause.message', 'Disposing of PendingPromises');
    });
});
