import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PageMaster } from './page-master.entity';
import { SectionMaster } from './section-master.entity';

@Entity('content_master')
export class ContentMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, default: '1' })
  status: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'mediumtext', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  event: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  videoUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alt_img: string;

  // ✅ Foreign Keys
  @Column({ type: 'bigint', nullable: true })
  createdBy: number;

  @Column({ type: 'bigint', nullable: true })
  updatedBy: number;

  @Column({ type: 'int', nullable: true })
  page_id: number;

  @Column({ type: 'int', nullable: true })
  section_id: number;

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

  // 🔗 Created By User
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  // 🔗 Updated By User
  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser: User;

  // 🔗 Page Relation
  @ManyToOne(() => PageMaster)
  @JoinColumn({ name: 'page_id' })
  page: PageMaster;

  // 🔗 Section Relation
  @ManyToOne(() => SectionMaster)
  @JoinColumn({ name: 'section_id' })
  section: SectionMaster;

  @Column({ type: 'varchar', length: 50, nullable: true })
  button: string;
}
