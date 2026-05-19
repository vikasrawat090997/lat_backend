import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

import { UserMaster } from 'src/modules/users/entities/user.entity';
import { Base } from 'src/modules/base';

@Entity({ name: 'rolemaster' })
export class RoleMaster extends Base {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'createdBy' })
  createdBy: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updatedBy' })
  updatedBy: UserMaster;
}
