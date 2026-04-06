import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return JWT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'VIEWER',
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return JWT for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Admin1234!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'admin@finance.com',
        name: 'Admin',
        role: 'ADMIN',
        password: hashedPassword,
        isActive: true,
      });

      const result = await service.login({
        email: 'admin@finance.com',
        password: 'Admin1234!',
      });

      expect(result.access_token).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'noone@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'user@example.com',
        password: hashedPassword,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'inactive@example.com',
        password: hashedPassword,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'inactive@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
