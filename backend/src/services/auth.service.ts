import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';


export class AuthService {
  async register(email: string, password: string, name: string, role: string = 'user') {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roleId: await this.getRoleId(role)
      },
      include: {
        role: true
      }
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name
      },
      token
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true
      }
    });

    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    if (user.isBlocked) {
      throw new Error('Аккаунт заблокирован');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Неверный email или пароль');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        details: { email: user.email }
      }
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name
      },
      token
    };
  }

  private async getRoleId(roleName: string): Promise<number> {
    let role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: `Роль ${roleName}`
        }
      });
    }

    return role.id;
  }

  async initRoles() {
    const roles = ['admin', 'operator', 'user'];
    for (const roleName of roles) {
      await this.getRoleId(roleName);
    }
    console.log('✅ Роли созданы');
  }

  async initTestUsers() {
    const users = [
      { email: 'admin@sys.com', password: 'admin', name: 'Admin', role: 'admin' },
      { email: 'operator@sys.com', password: 'operator', name: 'Operator', role: 'operator' },
      { email: 'user@sys.com', password: 'user', name: 'User', role: 'user' }
    ];

    for (const u of users) {
      try {
        await this.register(u.email, u.password, u.name, u.role);
        console.log(`✅ Создан пользователь: ${u.email}`);
      } catch (error) {
        console.log(`⚠️ Пользователь ${u.email} уже существует`);
      }
    }
  }
}