import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingExecutiveController } from './marketing-executive.controller';
import { MarketingExecutiveService } from './marketing-executive.service';
import { MarketingExecutiveLead } from './entities/marketing-executive-lead.entity';
import { MarketingExecutiveDocumentMapping } from './entities/marketing-executive-document-mapping.entity';
import { DocumentTypeMaster } from './entities/document-type-master.entity';
import { LeadEvent } from './entities/lead-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingExecutiveLead, MarketingExecutiveDocumentMapping, DocumentTypeMaster, LeadEvent])],
  controllers: [MarketingExecutiveController],
  providers: [MarketingExecutiveService],
})
export class MarketingExecutiveModule { }
