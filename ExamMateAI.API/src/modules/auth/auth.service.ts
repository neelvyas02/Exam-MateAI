import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../common/errors.js';
import { config } from '../../config/index.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profilePhoto?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: string;
}

export class AuthService {
  public async register(data: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<AuthResponseDto> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role || 'Student',
      },
    });

    return this.generateTokensForUser(user);
  }

  public async login(data: { email: string; password: string }): Promise<AuthResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase(), isDeleted: false },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    return this.generateTokensForUser(user);
  }

  public async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshToken);

    const user = await prisma.user.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiry: { gt: new Date() },
        isDeleted: false,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // Refresh token rotation
    return this.generateTokensForUser(user);
  }

  public async revokeToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiry: null,
      },
    });
  }

  public async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect.');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(data.newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
        refreshTokenExpiry: null,
      },
    });
  }

  public async getMe(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return this.toUserDto(user);
  }

  public async updateProfile(
    userId: string,
    data: { fullName: string; profilePhoto?: string | null }
  ): Promise<UserDto> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        profilePhoto: data.profilePhoto,
      },
    });

    return this.toUserDto(user);
  }

  private async generateTokensForUser(user: any): Promise<AuthResponseDto> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    // Generate random 40-character refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + config.jwt.refreshTokenExpiryDays);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiry,
      },
    });

    // Approximate expiration string
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 2);

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenExpiration: expirationDate.toISOString(),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private toUserDto(user: any): UserDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
