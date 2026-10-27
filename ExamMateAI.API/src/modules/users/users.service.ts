import { NotFoundError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export class UsersService {
  public async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const usersService = new UsersService();
