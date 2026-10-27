import { beforeEach, describe, it, expect, vi } from 'vitest';
import app from '@/app';

const mocks = vi.hoisted(() => ({
    verifyIdToken: vi.fn(),
    findUserByFirebaseId: vi.fn(),
}));

vi.mock('@/services/firebase', () => ({
    verifyIdToken: mocks.verifyIdToken,
    getFirebaseUidByEmail: vi.fn(),
}));
vi.mock('@/services/user.service', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/user.service')>()),
    userService: { findByFirebaseId: mocks.findUserByFirebaseId },
}));
vi.mock('@/services/admin.service', () => ({
    adminService: { findByFirebaseId: vi.fn().mockResolvedValue(null) },
}));

const AUTH = { Authorization: 'Bearer good' };

beforeEach(() => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'fb-u1', email: 'u@x.com' });
    mocks.findUserByFirebaseId.mockResolvedValue({ id: 'u1', firebaseId: 'fb-u1' });
});

describe('Storage Routes Integration (/storage/upload-url)', () => {
    it('POST /storage/upload-url generates signed upload URL for valid request', async () => {
        const payload = {
            fileName: 'student_id.png',
            contentType: 'image/png',
            fileSize: 1024 * 1024,
            purpose: 'id_card',
        };

        const res = await app.request('/storage/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AUTH },
            body: JSON.stringify(payload),
        });

        expect(res.status).toBe(201);
        const body = (await res.json()) as any;
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('uploadUrl');
        expect(body.data).toHaveProperty('fileUrl');
        expect(body.data).toHaveProperty('key');
        expect(body.data.uploadUrl).toContain('signature');
        expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('POST /storage/upload-url rejects missing contentType with 400', async () => {
        const payload = {
            fileName: 'student_id.png',
        };

        const res = await app.request('/storage/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AUTH },
            body: JSON.stringify(payload),
        });

        expect(res.status).toBe(400);
        const body = (await res.json()) as any;
        expect(body.success).toBe(false);
        expect(body.message).toBe('Validation failed');
    });

    it('GET /storage/url/:key returns the file URL', async () => {
        const res = await app.request('/storage/url/id_card/test-file.png', { headers: AUTH });
        expect(res.status).toBe(200);

        const body = (await res.json()) as any;
        expect(body.success).toBe(true);
        expect(body.data.fileUrl).toContain('test-file.png');
    });

    it('rejects unauthenticated requests with 401', async () => {
        const res = await app.request('/storage/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: 'a.png', contentType: 'image/png' }),
        });
        expect(res.status).toBe(401);
        expect((await app.request('/storage/url/id_card/x.png')).status).toBe(401);
    });

    it('rejects signed-in identities that have no user record with 403', async () => {
        mocks.findUserByFirebaseId.mockResolvedValue(null);
        const res = await app.request('/storage/url/id_card/x.png', { headers: AUTH });
        expect(res.status).toBe(403);
    });
});
