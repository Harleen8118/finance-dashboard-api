import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/register', () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'TestPass123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user.email).toBe(uniqueEmail);
          expect(res.body.user.role).toBe('VIEWER');
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'TestPass123!',
          name: 'Test User 2',
        })
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'TestPass123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'short@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@finance.com',
          password: 'Admin1234!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user.role).toBe('ADMIN');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@finance.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'noone@finance.com',
          password: 'Admin1234!',
        })
        .expect(401);
    });
  });
});

describe('Records (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Get tokens
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@finance.com', password: 'Admin1234!' });
    adminToken = adminRes.body.access_token;

    const viewerRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'viewer@finance.com', password: 'Viewer1234!' });
    viewerToken = viewerRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /records', () => {
    it('should return paginated records for any authenticated user', () => {
      return request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.page).toBe(1);
        });
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/records')
        .expect(401);
    });
  });

  describe('POST /records', () => {
    it('should allow ADMIN to create a record', () => {
      return request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 1500.50,
          type: 'INCOME',
          category: 'Salary',
          date: '2026-03-15T00:00:00.000Z',
          description: 'Test record',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.amount).toBeDefined();
        });
    });

    it('should reject VIEWER creating a record', () => {
      return request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          amount: 1500.50,
          type: 'INCOME',
          category: 'Salary',
          date: '2026-03-15T00:00:00.000Z',
        })
        .expect(403);
    });

    it('should reject invalid amount (negative)', () => {
      return request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: -100,
          type: 'INCOME',
          category: 'Salary',
          date: '2026-03-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should reject too many decimal places', () => {
      return request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100.123,
          type: 'INCOME',
          category: 'Salary',
          date: '2026-03-15T00:00:00.000Z',
        })
        .expect(400);
    });
  });
});

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let viewerToken: string;
  let analystToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@finance.com', password: 'Admin1234!' });
    adminToken = adminRes.body.access_token;

    const viewerRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'viewer@finance.com', password: 'Viewer1234!' });
    viewerToken = viewerRes.body.access_token;

    const analystRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'analyst@finance.com', password: 'Analyst1234!' });
    analystToken = analystRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /dashboard/summary', () => {
    it('should return summary for any authenticated user', () => {
      return request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalIncome');
          expect(res.body).toHaveProperty('totalExpenses');
          expect(res.body).toHaveProperty('netBalance');
          expect(res.body).toHaveProperty('recordCount');
        });
    });
  });

  describe('GET /dashboard/by-category', () => {
    it('should return category breakdown', () => {
      return request(app.getHttpServer())
        .get('/dashboard/by-category')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /dashboard/trends', () => {
    it('should allow ANALYST to access trends', () => {
      return request(app.getHttpServer())
        .get('/dashboard/trends')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(12);
        });
    });

    it('should allow ADMIN to access trends', () => {
      return request(app.getHttpServer())
        .get('/dashboard/trends')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject VIEWER from accessing trends', () => {
      return request(app.getHttpServer())
        .get('/dashboard/trends')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  describe('GET /dashboard/recent', () => {
    it('should return recent records', () => {
      return request(app.getHttpServer())
        .get('/dashboard/recent')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(10);
        });
    });
  });
});
