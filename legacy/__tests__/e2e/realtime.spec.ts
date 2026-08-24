import 'reflect-metadata';
import { Server } from 'socket.io';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import supertest from 'supertest';
import { container } from 'tsyringe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app.js';
import { socketConfig } from '../../src/config/app.js';
import { closeDatabase, connectDatabase } from '../../src/database/connection.js';
import { registerRealtime } from '../../src/modules/realtime/realtime.handler.js';
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from '../../src/modules/realtime/realtime.types.js';

let httpPort = 0;
let server: ReturnType<typeof import('express').express>['listen'] extends (...args: any) => infer R ? R : never;
const clients: ClientSocket<ServerToClientEvents, ClientToServerEvents>[] = [];

async function registerAndLogin(): Promise<{ accessToken: string }> {
    const email = `rt-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    await supertest(server)
        .post('/api/v1/auth/register')
        .send({
            name: 'RT User',
            phoneNumber: `08${Math.floor(Math.random() * 1e10)}`,
            email,
            password: 'password123',
        });
    const res = await supertest(server).post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });
    expect(res.status).toBe(200);
    return res.body.data;
}

function connect(token?: string): Promise<ClientSocket<ServerToClientEvents, ClientToServerEvents>> {
    const client = Client(`http://localhost:${httpPort}`, {
        auth: token ? { token } : {},
        transports: ['websocket'],
    });
    clients.push(client);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('connect timeout')), 10_000);
        client.on('connect', () => {
            clearTimeout(timeout);
            resolve(client);
        });
        client.on('connect_error', (err) => {
            clearTimeout(timeout);
            (client as any).__connectError = err.message;
            // surface the rejection to whoever awaits via error field
            resolve(client);
        });
    });
}

beforeAll(async () => {
    await connectDatabase(3, 1000);
    // migrations + seed already applied once in global-setup

    const app = container.resolve(App).instance;
    server = app.listen(0);
    httpPort = (server.address() as any).port;

    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, socketConfig());
    registerRealtime(io);
});

afterAll(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    server.close();
    await closeDatabase();
});

describe('realtime (socket.io)', () => {
    it('rejects unauthenticated handshakes', async () => {
        const client = await connect(undefined);
        expect((client as any).__connectError).toMatch(/Unauthorized/i);
        expect(client.connected).toBe(false);
    });

    it('rejects invalid tokens', async () => {
        const client = await connect('not.a.jwt');
        expect((client as any).__connectError).toMatch(/Unauthorized/i);
    });

    it('authenticates with a bearer token, joins a room, receives broadcasts', async () => {
        const { accessToken } = await registerAndLogin();
        const alice = await connect(accessToken);

        const joined = await new Promise<{ joined: boolean; error?: string }>((resolve) => {
            alice.emit('room:join', 'lobby', resolve);
        });
        expect(joined.joined).toBe(true);

        // second authenticated member in the same room
        const { accessToken: bobToken } = await registerAndLogin();
        const bob = await connect(bobToken);
        await new Promise<{ joined: boolean; error?: string }>((resolve) => {
            bob.emit('room:join', 'lobby', resolve);
        });

        const received = new Promise<any>((resolve) => {
            alice.on('message', resolve);
        });

        bob.emit('message:send', { room: 'lobby', message: 'hello from bob' });

        const message = await received;
        expect(message.room).toBe('lobby');
        expect(message.message).toBe('hello from bob');
    });

    it('rejects joining rooms with unsafe names', async () => {
        const { accessToken } = await registerAndLogin();
        const client = await connect(accessToken);

        const result = await new Promise<{ joined: boolean; error?: string }>((resolve) => {
            client.emit('room:join', '../etc-passwd', resolve);
        });
        expect(result.joined).toBe(false);
        expect(result.error).toBeDefined();
    });
});
