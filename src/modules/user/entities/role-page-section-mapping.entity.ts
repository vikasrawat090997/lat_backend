import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PageMaster } from './page-master.entity';
import { SectionMaster } from './section-master.entity';
import { RoleMaster } from 'src/modules/roles/entities/role.entity';
import { User } from './user.entity';

@Entity('rolepagemapping')
@Unique('unique_mapping', ['roleId', 'pageId', 'sectionId'])
export class RolePageMapping {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ Role
  @Column()
  roleId: number;

  @ManyToOne(() => RoleMaster)
  @JoinColumn({ name: 'roleId' })
  role: RoleMaster;

  // ✅ Page
  @Column()
  pageId: number;

  @ManyToOne(() => PageMaster)
  @JoinColumn({ name: 'pageId' })
  page: PageMaster;

  // ✅ Section (nullable)
  @Column({ nullable: true })
  sectionId: number;

  @ManyToOne(() => SectionMaster, { nullable: true })
  @JoinColumn({ name: 'sectionId' })
  section: SectionMaster;

  // ✅ Status (checkbox ON/OFF)
  @Column({ type: 'tinyint', default: 1 })
  status: number;

  // ✅ Audit fields
  @Column({ nullable: true })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdUser: User;

  @Column({ nullable: true })
  updatedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedBy' })
  updatedUser: User;

  // ✅ Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
