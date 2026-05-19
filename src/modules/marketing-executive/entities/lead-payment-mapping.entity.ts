import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Base } from '../../base';
import { MarketingExecutiveLead } from './marketing-executive-lead.entity';

@Entity('leadpaymentmappings')
export class LeadPaymentMapping extends Base {
  @ManyToOne(() => MarketingExecutiveLead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: MarketingExecutiveLead;

  @Column({ type: 'bigint' })
  leadId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;
}
