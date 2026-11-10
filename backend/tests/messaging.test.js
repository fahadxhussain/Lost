const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const authService = require('../src/modules/auth/auth.service');

describe('COMSATS Lost & Found - Messaging Module', () => {
  let userA, userB, userC;
  let tokenA, tokenB, tokenC;
  let conversationId;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'sp23-bse-401@isbstudent.comsats.edu.pk',
            'sp23-bse-402@isbstudent.comsats.edu.pk',
            'sp23-bse-403@isbstudent.comsats.edu.pk',
          ],
        },
      },
    });

    userA = await prisma.user.create({
      data: {
        email: 'sp23-bse-401@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Student A',
        status: 'ACTIVE',
      },
    });
    tokenA = authService.generateToken(userA);

    userB = await prisma.user.create({
      data: {
        email: 'sp23-bse-402@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Student B',
        status: 'ACTIVE',
      },
    });
    tokenB = authService.generateToken(userB);

    userC = await prisma.user.create({
      data: {
        email: 'sp23-bse-403@isbstudent.comsats.edu.pk',
        passwordHash: 'hash',
        name: 'Student C (Outsider)',
        status: 'ACTIVE',
      },
    });
    tokenC = authService.generateToken(userC);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'sp23-bse-401@isbstudent.comsats.edu.pk',
            'sp23-bse-402@isbstudent.comsats.edu.pk',
            'sp23-bse-403@isbstudent.comsats.edu.pk',
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/conversations (Create or Get Conversation)', () => {
    it('should create a new conversation thread between student A and student B', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          otherUserId: userB.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();

      conversationId = res.body.data.id;
    });

    it('should return existing conversation when requested again (idempotent)', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          otherUserId: userA.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(conversationId);
    });

    it('should reject creating conversation with oneself', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          otherUserId: userA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot start a conversation with yourself/i);
    });
  });

  describe('POST & GET /api/v1/conversations/:id/messages', () => {
    it('should allow student A to send a message to student B', async () => {
      const res = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Hi! I saw you found a charger that matches mine. Is it Dell 65W?',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.content).toMatch(/Dell 65W/);
      expect(res.body.data.senderId).toBe(userA.id);
      expect(res.body.data.isRead).toBe(false);
    });

    it('should prevent student C (outsider) from sending message in A & B conversation', async () => {
      const res = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({
          content: 'I am spying on your conversation',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not part of/i);
    });

    it('should prevent student C from viewing messages in A & B conversation', async () => {
      const res = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenC}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow student B to view messages and automatically mark unread messages as read', async () => {
      const res = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify in DB that message was marked isRead: true
      const msg = await prisma.message.findFirst({
        where: { conversationId, senderId: userA.id },
      });
      expect(msg.isRead).toBe(true);
    });

    it('should list conversations for student A including other participant and latest message', async () => {
      const res = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].otherParticipant.id).toBe(userB.id);
      expect(res.body.data[0].latestMessage).toBeDefined();
    });
  });
});
