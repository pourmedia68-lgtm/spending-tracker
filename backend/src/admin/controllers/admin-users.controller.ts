import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListUsersDto } from '../dto/list-users.dto';
import { AdminUpdateUserDto } from '../dto/update-user.dto';
import { AdminUsersService } from '../services/admin-users.service';

const requestContext = (req: Request) => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

@ApiTags('admin:users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search, filters, pagination.' })
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full detail for one user.' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getDetail(id);
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Recent expenses for one user.' })
  expenses(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.users.listExpenses(
      id,
      parsePagination(take, 50, 200),
      parsePagination(skip, 0, Number.MAX_SAFE_INTEGER, /* allowZero */ true),
    );
  }

  @Get(':id/budgets')
  @ApiOperation({ summary: 'All monthly budgets for one user.' })
  budgets(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.listBudgets(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fields on one user (incl. role).' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.update(id, actor.id, dto, requestContext(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a user (revokes all sessions).' })
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.softDelete(id, actor.id, requestContext(req));
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user.' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.restore(id, actor.id, requestContext(req));
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: 'Generate a one-time temp password and revoke active sessions.',
  })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.users.resetPassword(id, actor.id, requestContext(req));
  }
}

// Defensive parser: rejects NaN / non-finite / negative values from query
// strings so that hostile or malformed inputs cannot reach Prisma (which would
// throw at runtime and bubble up as a 500 instead of a 400).
function parsePagination(
  raw: string | undefined,
  fallback: number,
  max: number,
  allowZero = false,
): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const floored = Math.floor(n);
  if (floored < 0) return fallback;
  if (!allowZero && floored === 0) return fallback;
  return Math.min(floored, max);
}
