import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('faq_master')
export class FaqMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 250 })
  question: string;

  @Column({ type: 'mediumtext' })
  answer: string;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'bigint', nullable: true })
  createdBy: number;

  @Column({ type: 'bigint', nullable: true })
  updatedBy: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
