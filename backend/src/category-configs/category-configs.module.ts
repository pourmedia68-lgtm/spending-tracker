import { Module } from '@nestjs/common';

import { CategoryConfigsController } from './category-configs.controller';
import { CategoryConfigsService } from './category-configs.service';

@Module({
  controllers: [CategoryConfigsController],
  providers: [CategoryConfigsService],
})
export class CategoryConfigsModule {}
