import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListAuditDto {
  @ApiPropertyOptional({ description: 'Filter by acting user id.' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by target type ("user", …).' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Filter by action verb.' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp lower bound (inclusive).',
  })
  @IsOptional()
  @IsISO8601()
  since?: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp upper bound (exclusive).',
  })
  @IsOptional()
  @IsISO8601()
  until?: string;

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
}
