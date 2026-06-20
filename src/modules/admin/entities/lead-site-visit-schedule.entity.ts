import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('leadsitevisitschedules')
export class LeadSiteVisitSchedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  leadId: number;

  @Column({ type: 'date' })
  visitDate: Date;

  @Column({ type: 'varchar', length: 100 })
  timeSlot: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'bigint', nullable: true })
  createdBy: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt: Date;
}
