import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminExportService } from '../services/admin-export.service';
import { AuditService } from '../services/audit.service';

const sendCsv = (res: Response, filename: string, body: string) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
};

@ApiTags('admin:export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/export', version: '1' })
export class AdminExportController {
  constructor(
    private readonly exporter: AdminExportService,
    private readonly audit: AuditService,
  ) {}

  @Get('users.csv')
  @ApiOperation({ summary: 'Download all users as CSV.' })
  async users(
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const csv = await this.exporter.usersCsv();
    await this.audit.record({
      actorId: actor.id,
      action: 'export.csv',
      targetType: 'users',
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    const today = new Date().toISOString().slice(0, 10);
    sendCsv(res, `users-${today}.csv`, csv);
  }

  @Get('expenses.csv')
  @ApiOperation({ summary: "Download all (or one user's) expenses as CSV." })
  async expenses(
    @Res() res: Response,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    const csv = await this.exporter.expensesCsv({ userId });
    await this.audit.record({
      actorId: actor.id,
      action: 'export.csv',
      targetType: 'expenses',
      targetId: userId ?? null,
      metadata: userId ? { userId } : null,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    const today = new Date().toISOString().slice(0, 10);
    const filename = userId
      ? `expenses-${userId}-${today}.csv`
      : `expenses-${today}.csv`;
    sendCsv(res, filename, csv);
  }
}
