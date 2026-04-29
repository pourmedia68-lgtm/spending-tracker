import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route handler (or whole controller) to one of the listed roles.
 * Combine with `JwtAuthGuard` *before* `RolesGuard` so the request user is
 * resolved before role inspection.
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('ADMIN')
 *   @Get('users')
 *   listAdminUsers() { … }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
