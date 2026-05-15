import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('page_master')
export class PageMaster {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ Basic Fields
  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'varchar', length: 250, default: '0' })
  slug: string;

  // ✅ Flags
  @Column({ type: 'int', default: 1, nullable: true })
  isHeader: number;

  @Column({ type: 'int', default: 1, nullable: true })
  isFooter: number;

  @Column({ type: 'int', nullable: true })
  headerPriority: number;

  @Column({ type: 'int', nullable: true })
  footerPriority: number;

  // ✅ Self Relation (Parent Page)
  @Column({ type: 'int', default: 0, nullable: true })
  parentId: number;

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

  // 🔗 Parent Page
  @ManyToOne(() => PageMaster, (page) => page.children)
  @JoinColumn({ name: 'parentId' })
  parent: PageMaster;

  // 🔗 Child Pages
  @OneToMany(() => PageMaster, (page) => page.parent)
  children: PageMaster[];
}
