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
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'budgets', version: '1' })
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List monthly budgets for the user (incremental sync).',
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SyncQueryDto) {
    return this.budgets.list(user.id, query);
  }

  @Put()
  @ApiOperation({
    summary: 'Upsert the budget for a given month (idempotent).',
  })
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertBudgetDto) {
    return this.budgets.upsert(user.id, dto);
  }

  @Delete(':monthKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete the budget for a given month.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('monthKey') monthKey: string,
  ): Promise<void> {
    await this.budgets.softDelete(user.id, monthKey);
  }
}
