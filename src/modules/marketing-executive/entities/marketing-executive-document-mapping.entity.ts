import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Base } from '../../base';
import { MarketingExecutiveLead } from './marketing-executive-lead.entity';
import { DocumentTypeMaster } from './document-type-master.entity';

@Entity('marketingexecutivedocumentmapping')
export class MarketingExecutiveDocumentMapping extends Base {
  @ManyToOne(() => MarketingExecutiveLead, (lead) => lead.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: MarketingExecutiveLead;

  @Column({ type: 'bigint' })
  leadId: string;

  @ManyToOne(() => DocumentTypeMaster)
  @JoinColumn({ name: 'documentTypeId' })
  documentType: DocumentTypeMaster;

  @Column({ type: 'bigint' })
  documentTypeId: string;

  @Column({ type: 'varchar', length: 255 })
  documentUrl: string;
  
  @Column({ type: 'varchar', length: 255 })
  originalName: string;
}
