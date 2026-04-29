import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminExportController } from './controllers/admin-export.controller';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminExportService } from './services/admin-export.service';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminUsersService } from './services/admin-users.service';
import { AuditService } from './services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminStatsController,
    AdminAuditController,
    AdminExportController,
  ],
  providers: [
    AdminUsersService,
    AdminStatsService,
    AdminExportService,
    AuditService,
  ],
  exports: [AdminUsersService, AuditService],
})
export class AdminModule {}
