import { prisma } from '../index';

interface AuditLogData {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: any;
}

export class AuditService {
  async log(data: AuditLogData) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        details: data.details || {}
      }
    });
  }

  async getLogs(filters?: any) {
    return prisma.auditLog.findMany({
      where: filters,
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });
  }
}