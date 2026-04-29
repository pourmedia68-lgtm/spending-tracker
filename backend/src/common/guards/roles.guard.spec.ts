import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

const mockContext = (user: { role?: UserRole } | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('allows requests when no @Roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'USER' }))).toBe(true);
  });

  it('allows when the user role matches', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(mockContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects when the user role does not match', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(mockContext({ role: 'USER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when no user is on the request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('reads metadata from both handler and class via getAllAndOverride', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
    guard.canActivate(mockContext({ role: 'ADMIN' }));
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [undefined, undefined]);
  });
});
