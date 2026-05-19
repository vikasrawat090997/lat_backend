import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Base } from '../../base';
import { MarketingExecutiveDocumentMapping } from './marketing-executive-document-mapping.entity';
import { UserMaster } from 'src/modules/users/entities/user.entity';
import { LeadStatus } from 'src/utils/enums';
import { LeadEvent } from './lead-event.entity';

@Entity('marketingexecutiveleads')
export class MarketingExecutiveLead extends Base {
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'text' })
  address: string;

  @ManyToOne(() => UserMaster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: UserMaster;

  @Column({ type: 'bigint', nullable: true })
  userId: string;

  @Column({ type: 'bigint', nullable: true })
  siteVisitorUserId: string;

  @Column({ type: 'bigint', nullable: true })
  installerUserId: string;

  @OneToMany(() => MarketingExecutiveDocumentMapping, (doc) => doc.lead, { cascade: true })
  documents: MarketingExecutiveDocumentMapping[];

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.QUERY_SENT, // Automatically starts at the first stage
  })
  status: LeadStatus;

  @OneToMany(() => LeadEvent, (event) => event.lead, { cascade: true })
  events: LeadEvent[];

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ type: 'int', default: 0 })
  pendingamount: number;
}
