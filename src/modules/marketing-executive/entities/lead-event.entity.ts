import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Base } from '../../base';
import { MarketingExecutiveLead } from './marketing-executive-lead.entity';
import { UserMaster } from '../../users/entities/user.entity';

@Entity('leadevent')
export class LeadEvent extends Base {
  @ManyToOne(() => MarketingExecutiveLead, (lead) => lead.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leadId' })
  lead: MarketingExecutiveLead;

  @Column({ type: 'bigint' })
  leadId: string;

  @Column({ type: 'varchar', length: 255 })
  eventName: string;

  @ManyToOne(() => UserMaster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: UserMaster;

  @Column({ type: 'bigint', nullable: true })
  userId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 256 })
  fileUrl: string;
}
