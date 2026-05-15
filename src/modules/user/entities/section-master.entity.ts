import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PageMaster } from './page-master.entity';

@Entity('section_master')
export class SectionMaster {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ Foreign Key
  @Column({ type: 'int' })
  page_id: number;

  // ✅ Basic Fields
  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'varchar', length: 250 })
  slug: string;

  // ✅ Audit Fields
  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @Column({ type: 'int', nullable: true })
  updatedBy: number;

  // ✅ Timestamps
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updatedAt: Date;

  // ================= RELATIONS =================

  // 🔗 Page Relation
  @ManyToOne(() => PageMaster)
  @JoinColumn({ name: 'page_id' })
  page: PageMaster;

  @Column({ type: 'int', default: '1' })
  status: string;

  @Column({ type: 'int', default: null })
  priority: string;
}
