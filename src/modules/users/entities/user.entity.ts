import { Base } from 'src/modules/base';
import { RoleMaster } from 'src/modules/roles/entities/role.entity';

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';

@Entity({ name: 'usermaster' })
export class UserMaster extends Base {
  @ManyToOne(() => RoleMaster, { nullable: true })
  @JoinColumn({ name: 'roleId' })
  role: RoleMaster | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'tinyint', default: 0 })
  isEmailSent: number;

  /**
   * 0 -> inactive
   * 1 -> active
   * 2 -> deleted
   * 3 -> first time
   */
  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'text', nullable: true })
  token: string | null;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdBy: UserMaster | null;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedBy: UserMaster | null;
}
