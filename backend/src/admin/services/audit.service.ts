import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditDto } from '../dto/list-audit.dto';

export interface RecordAuditInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an entry to the audit log. Failures are logged but never thrown so
   * that an admin action is never silently blocked by an audit write error.
   */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          metadata:
            input.metadata === null || input.metadata === undefined
              ? Prisma.DbNull
              : input.metadata,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit entry action=${input.action} actor=${input.actorId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async list(query: ListAuditDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;
    if (query.action) where.action = query.action;
    if (query.since || query.until) {
      where.createdAt = {};
      if (query.since) where.createdAt.gte = new Date(query.since);
      if (query.until) where.createdAt.lt = new Date(query.until);
    }
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          actor: { select: { id: true, email: true, displayName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, take, skip };
  }
}
