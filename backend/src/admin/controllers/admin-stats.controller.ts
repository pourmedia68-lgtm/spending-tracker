import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminStatsService } from '../services/admin-stats.service';

@ApiTags('admin:stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/stats', version: '1' })
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'High-level KPIs for the admin dashboard.' })
  kpis() {
    return this.stats.kpis();
  }

  @Get('daily')
  @ApiOperation({
    summary: 'Daily signups + expense series for the last N days.',
  })
  daily(@Query('days') days?: string) {
    return this.stats.daily(days ? Number(days) : 30);
  }

  @Get('expenses-by-category')
  @ApiOperation({ summary: 'Aggregate spending by category, current month.' })
  byCategory() {
    return this.stats.expensesByCategory();
  }

  @Get('top-users')
  @ApiOperation({ summary: 'Top users by spend this month.' })
  topUsers(@Query('take') take?: string) {
    return this.stats.topUsers(take ? Number(take) : 10);
  }
}
