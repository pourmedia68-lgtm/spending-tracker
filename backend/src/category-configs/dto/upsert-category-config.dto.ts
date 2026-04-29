import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
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

  // Pass `null` to explicitly clear a previously set budget; omit the field
  // to leave it untouched. `@IsPositive()` only runs when the value is not
  // null so the clearing case stays valid.
  @ApiPropertyOptional({ example: 600, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsPositive()
  budget?: number | null;
}
