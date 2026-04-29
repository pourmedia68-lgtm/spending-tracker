import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListUsersDto } from './list-users.dto';

const violations = async (input: Record<string, unknown>) =>
  (await validate(plainToInstance(ListUsersDto, input))).map((v) => v.property);

describe('ListUsersDto', () => {
  it('accepts the documented sort fields', async () => {
    for (const sort of ['createdAt', 'email', 'displayName', 'role']) {
      expect(await violations({ sort })).toEqual([]);
    }
  });

  it.each([
    'passwordHash',
    'googleSub',
    'id',
    "createdAt'; DROP TABLE users; --",
  ])('rejects sort=%p (sorting oracle defence)', async (sort) => {
    expect(await violations({ sort })).toEqual(['sort']);
  });

  it('rejects unknown order values', async () => {
    expect(await violations({ order: 'random' })).toEqual(['order']);
  });

  it('accepts asc and desc', async () => {
    expect(await violations({ order: 'asc' })).toEqual([]);
    expect(await violations({ order: 'desc' })).toEqual([]);
  });

  it('rejects an unknown role value', async () => {
    expect(await violations({ role: 'SUPERADMIN' })).toEqual(['role']);
  });
});
