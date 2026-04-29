import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListUsersDto {
  @ApiPropertyOptional({ description: 'Free text on email or displayName.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description:
      'When true, include soft-deleted users (default false). Use "any" to ignore the filter.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number = 50;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    enum: ['createdAt', 'email', 'displayName', 'role'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sort?: 'createdAt' | 'email' | 'displayName' | 'role' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
