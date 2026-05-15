import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('header_master')
export class HeaderMaster {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  slug: string;

  @Column({ type: 'int', default: 0, nullable: true })
  parentId: number;

  @Column({ type: 'int', default: 1, nullable: true })
  priority: number;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updatedAt: Date;

  @Column({ type: 'int', default: 1, nullable: true })
  isHeader: number;

  @Column({ type: 'int', default: 1, nullable: true })
  IsFooter: number;

  @Column({ type: 'int', default: 1, nullable: true })
  footerPriority: number;

  @Column({ type: 'mediumtext', nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 525, nullable: true })
  url: string;

  @Column({ type: 'mediumtext', nullable: true })
  description: string;
}
