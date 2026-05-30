import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingExecutiveLead } from '../marketing-executive/entities/marketing-executive-lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingExecutiveLead])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
