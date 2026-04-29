import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertCategoryConfigDto {
  @ApiProperty({ example: 'lifestyle' })
  @IsString()
  @MaxLength(40)
  categoryId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsPositive()
  budget?: number;
}
