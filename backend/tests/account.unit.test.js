const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../src/config', () => ({
  nodeEnv: 'test',
  publicApiUrl: 'https://campus.example',
  jwt: { secret: 'isolated-account-test-secret', expiresIn: '1h' },
  university: {
    allowedDomains: ['isbstudent.comsats.edu.pk'],
    otpExpiryMinutes: 15,
    otpMaxAttempts: 5,
  },
  email: { provider: 'smtp' },
  storage: { uploadDir: 'uploads' },
}));
jest.mock('../src/config/prisma', () => ({
  user: { findUnique: jest.fn(), update: jest.fn() },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));
jest.mock('../src/services/email/emailService', () => ({
  transporter: {},
  sendPasswordReset: jest.fn(),
}));
jest.mock('../src/services/storage/storageService', () => {
  const multer = require('multer');
  return {
    upload: multer({ storage: multer.memoryStorage() }),
    getPublicImageUrl: jest.fn(
      async () => 'https://campus.example/uploads/avatar.jpg',
    ),
  };
});
const prisma = require('../src/config/prisma');
const config = require('../src/config');
const email = require('../src/services/email/emailService');
const account = require('../src/modules/auth/account.service');
const app = require('../src/app');
const crypto = require('crypto');
const student = {
  id: 'student-id',
  email: 'account-test@isbstudent.comsats.edu.pk',
  name: 'Student',
  rollNumber: 'FA26-BCS-000',
  status: 'ACTIVE',
  tokenVersion: 0,
  avatarUrl: null,
};
const rawToken = 'a'.repeat(64);
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const session = (version = 0) =>
  jwt.sign({ id: student.id, tokenVersion: version }, config.jwt.secret);
const record = () => ({
  id: 'reset-id',
  userId: student.id,
  tokenHash: hash(rawToken),
  expiresAt: new Date(Date.now() + 60000),
  consumedAt: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  config.publicApiUrl = 'https://campus.example';
  email.transporter = {};
  email.sendPasswordReset.mockResolvedValue(true);
  prisma.user.findUnique.mockResolvedValue(student);
  prisma.user.update.mockImplementation(async ({ data }) => ({
    ...student,
    ...data,
  }));
  prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
  prisma.passwordResetToken.create.mockResolvedValue({});
  prisma.passwordResetToken.findUnique.mockResolvedValue(record());
  prisma.$transaction.mockImplementation((action) => action(prisma));
});

test('reset requests normalize email, store only a hash, invalidate older links, and email a fragment token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: ` ${student.email.toUpperCase()} ` });
  expect(response.status).toBe(200);
  expect(response.body.message).toMatch(/If an active account exists/);
  expect(prisma.user.findUnique).toHaveBeenCalledWith({
    where: { email: student.email },
  });
  const link = new URL(email.sendPasswordReset.mock.calls[0][1]);
  const token = new URLSearchParams(link.hash.slice(1)).get('token');
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(link.origin).toBe('https://campus.example');
  expect(link.search).toBe('');
  expect(prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash).toBe(
    hash(token),
  );
  expect(JSON.stringify(response.body)).not.toContain(token);
  expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { userId: student.id, consumedAt: null },
    }),
  );
});

test('unknown and suspended accounts have the same reset response and do not send email', async () => {
  const existing = await account.requestPasswordReset(student.email);
  email.sendPasswordReset.mockClear();
  prisma.user.findUnique.mockResolvedValue(null);
  expect(await account.requestPasswordReset(student.email)).toEqual(existing);
  prisma.user.findUnique.mockResolvedValue({ ...student, status: 'SUSPENDED' });
  expect(await account.requestPasswordReset(student.email)).toEqual(existing);
  expect(email.sendPasswordReset).not.toHaveBeenCalled();
});

test('mail delivery failure invalidates its link without exposing account existence', async () => {
  email.sendPasswordReset.mockRejectedValue(new Error('SMTP secret error'));
  const response = await account.requestPasswordReset(student.email);
  expect(response.message).toMatch(/If an active account exists/);
  expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
});

test('missing delivery configuration fails consistently and invalid student email is rejected', async () => {
  email.transporter = null;
  await expect(
    account.requestPasswordReset(student.email),
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
  await expect(
    account.requestPasswordReset('outside@gmail.com'),
  ).rejects.toMatchObject({ statusCode: 400 });
});

test('reset hashes the new password, consumes the token, and revokes previous sessions', async () => {
  const disconnectSockets = jest.fn();
  const emit = jest.fn();
  const room = { disconnectSockets, emit };
  const io = { to: jest.fn(() => room), in: jest.fn(() => room) };
  app.set('io', io);
  const response = await request(app).post('/api/v1/auth/reset-password').send({
    token: rawToken,
    password: 'NewPassword123!',
    confirmation: 'NewPassword123!',
  });
  expect(response.status).toBe(200);
  expect(response.body.message).toMatch(/Return to the app/);
  expect(response.body.userId).toBeUndefined();
  expect(io.in).toHaveBeenCalledWith(`user_${student.id}`);
  expect(disconnectSockets).toHaveBeenCalledWith(true);
  app.set('io', undefined);
  const update = prisma.user.update.mock.calls.find(
    ([arg]) => arg.data.passwordHash,
  )[0];
  expect(
    await bcrypt.compare('NewPassword123!', update.data.passwordHash),
  ).toBe(true);
  expect(update.data.tokenVersion).toEqual({ increment: 1 });
  expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        id: 'reset-id',
        consumedAt: null,
        expiresAt: expect.any(Object),
      }),
    }),
  );
});

test.each([
  ['expired', () => ({ ...record(), expiresAt: new Date(0) })],
  ['used', () => ({ ...record(), consumedAt: new Date() })],
  ['unknown', () => null],
])(
  '%s reset links fail without changing the password',
  async (_label, makeRecord) => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(makeRecord());
    await expect(
      account.resetPassword({
        token: rawToken,
        password: 'NewPassword123!',
        confirmation: 'NewPassword123!',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);

test('concurrent token consumption is rejected atomically and mismatching passwords never reach the database', async () => {
  await expect(
    account.resetPassword({
      token: rawToken,
      password: 'NewPassword123!',
      confirmation: 'WrongPassword123!',
    }),
  ).rejects.toThrow(/do not match/);
  expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
  await expect(
    account.resetPassword({
      token: rawToken,
      password: 'NewPassword123!',
      confirmation: 'NewPassword123!',
    }),
  ).rejects.toThrow(/already used/);
  expect(
    prisma.user.update.mock.calls.some(([arg]) => arg.data.passwordHash),
  ).toBe(false);
});

test('new password checks include the bcrypt UTF-8 boundary', () => {
  expect(() => account.validatePassword('a'.repeat(72))).not.toThrow();
  for (const password of [
    'short',
    '        ',
    'a'.repeat(73),
    '😀'.repeat(19),
    {},
    null,
  ])
    expect(() => account.validatePassword(password)).toThrow();
});

test('profile update allows username/photo while rejecting fixed account fields', async () => {
  let response = await request(app)
    .patch('/api/v1/auth/me')
    .set('Authorization', `Bearer ${session()}`)
    .send({ name: '  New username  ' });
  expect(response.status).toBe(200);
  expect(prisma.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: student.id },
      data: { name: 'New username' },
    }),
  );
  response = await request(app)
    .patch('/api/v1/auth/me')
    .set('Authorization', `Bearer ${session()}`)
    .send({
      rollNumber: 'different',
      email: 'different@example.com',
      tokenVersion: 42,
    });
  expect(response.status).toBe(400);
  expect(response.body.message).toMatch(/Only your username/);
  await expect(
    account.updateProfile(student.id, { name: ' ' }),
  ).rejects.toThrow(/username/);
  await expect(account.updateProfile(student.id, {})).rejects.toThrow(
    /choose a profile photo/,
  );
});

test('profile upload persists an avatar and existing JWTs fail after password reset', async () => {
  const response = await request(app)
    .patch('/api/v1/auth/me')
    .set('Authorization', `Bearer ${session()}`)
    .field('name', 'Student')
    .attach('avatar', Buffer.from('image fixture'), {
      filename: 'avatar.jpg',
      contentType: 'image/jpeg',
    });
  expect(response.status).toBe(200);
  expect(prisma.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        avatarUrl: 'https://campus.example/uploads/avatar.jpg',
      }),
    }),
  );
  prisma.user.findUnique.mockResolvedValue({ ...student, tokenVersion: 1 });
  expect(
    (
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session(0)}`)
    ).status,
  ).toBe(401);
  const current = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${session(1)}`);
  expect(current.status).toBe(200);
  expect(current.body.data.user.tokenVersion).toBeUndefined();
});

test('browser reset page works without an authenticated session and suppresses referrers', async () => {
  const response = await request(app).get('/reset-password');
  expect(response.status).toBe(200);
  expect(response.headers['referrer-policy']).toBe('no-referrer');
  expect(response.headers['cache-control']).toMatch(/no-store/);
  expect(response.text).toContain('/account-assets/reset-password.js');
  expect(
    (await request(app).get('/account-assets/reset-password.js')).status,
  ).toBe(200);
});
