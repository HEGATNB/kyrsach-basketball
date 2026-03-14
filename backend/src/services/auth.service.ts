import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

export class AuthService {
  async register(email: string, password: string, name: string, role: string = 'user') {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: await this.getRoleId(role),
      },
      include: {
        role: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    return {
      user: this.toUserDto(user),
      token,
    };
  }

  async login(identifier: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { email: { startsWith: `${identifier}@`, mode: 'insensitive' } },
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new Error('Invalid login or password');
    }

    if (user.isBlocked) {
      throw new Error('Account is blocked');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid login or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        details: { email: user.email },
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    return {
      user: this.toUserDto(user),
      token,
    };
  }

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.toUserDto(user);
  }

  private async getRoleId(roleName: string): Promise<number> {
    let role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: `Role ${roleName}`,
        },
      });
    }

    return role.id;
  }

  async initRoles() {
    for (const roleName of ['admin', 'operator', 'user']) {
      await this.getRoleId(roleName);
    }
  }

  async initTestUsers() {
    const users = [
      { email: 'admin@sys.com', password: 'admin', name: 'Admin', role: 'admin' },
      { email: 'operator@sys.com', password: 'operator', name: 'Operator', role: 'operator' },
      { email: 'user@sys.com', password: 'user', name: 'User', role: 'user' },
    ];

    for (const user of users) {
      try {
        await this.register(user.email, user.password, user.name, user.role);
      } catch {
        // User already exists.
      }
    }
  }

  private toUserDto(user: { id: number; email: string; name: string; isBlocked?: boolean; role: { name: string } }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.email.includes('@') ? user.email.split('@')[0] : user.name,
      role: user.role.name,
      isBlocked: Boolean(user.isBlocked),
    };
  }
}
