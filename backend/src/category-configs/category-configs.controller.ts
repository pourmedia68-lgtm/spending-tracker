import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { SyncQueryDto } from '../common/dto/sync-query.dto';
import { CategoryConfigsService } from './category-configs.service';
import { UpsertCategoryConfigDto } from './dto/upsert-category-config.dto';

@ApiTags('category-configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'category-configs', version: '1' })
export class CategoryConfigsController {
  constructor(private readonly categories: CategoryConfigsService) {}

  @Get()
  @ApiOperation({ summary: 'List per-user category overrides.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SyncQueryDto) {
    return this.categories.list(user.id, query);
  }

  @Put()
  @ApiOperation({ summary: 'Upsert a per-user category override.' })
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertCategoryConfigDto,
  ) {
    return this.categories.upsert(user.id, dto);
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a per-user category override.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('categoryId') categoryId: string,
  ): Promise<void> {
    await this.categories.softDelete(user.id, categoryId);
  }
}
