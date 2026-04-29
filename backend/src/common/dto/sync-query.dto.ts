import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';

/**
 * Query params shared by all "list" endpoints to support incremental sync.
 *
 * - `since` — ISO timestamp; the server returns only rows whose `updatedAt`
 *   is strictly greater than that value (including soft-deleted rows so the
 *   client can apply tombstones).
 * - `includeDeleted` — when true, soft-deleted rows are returned with their
 *   `deletedAt` populated so the client can purge its local cache.
 */
export class SyncQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? new Date(value) : value,
  )
  @IsDate()
  since?: Date;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true ? true : false,
  )
  @IsBoolean()
  includeDeleted?: boolean;
}
