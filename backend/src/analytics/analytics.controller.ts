import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('month/:monthKey')
  @ApiOperation({
    summary:
      'Return spent/budget/ratio + paced + projected EOM for the given month.',
  })
  monthSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('monthKey') monthKey: string,
  ) {
    return this.analytics.monthSummary(user.id, monthKey);
  }

  @Get('mom/:monthKey')
  @ApiOperation({
    summary: 'Month-over-month comparison vs the previous month.',
  })
  monthOverMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('monthKey') monthKey: string,
  ) {
    return this.analytics.monthOverMonth(user.id, monthKey);
  }
}
