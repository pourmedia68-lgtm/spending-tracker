import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpsertBudgetDto {
  @ApiProperty({ example: '2025-04' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'monthKey must be in YYYY-MM format',
  })
  monthKey!: string;

  @ApiProperty({ example: 3000 })
  @IsPositive()
  globalBudget!: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 31 })
  @IsInt()
  @Min(1)
  @Max(31)
  startDay!: number;

  @ApiPropertyOptional({
    description:
      'Map of categoryId -> per-category budget. Missing categories use the global budget.',
    example: { lifestyle: 600, transport: 200 },
  })
  @IsOptional()
  @IsObject()
  categoryBudgets?: Record<string, number>;
}
