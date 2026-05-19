import { Base } from 'src/modules/base';
import { MenuMaster } from 'src/modules/menu/entities/menu.entity';
import { RoleMaster } from 'src/modules/roles/entities/role.entity';
import { UserMaster } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('rolemenumapping')
export class RoleMenuMapping extends Base {
  @Column({ name: 'roleId', type: 'int' })
  roleId: number;

  @Column({ name: 'menuId', type: 'int' })
  menuId: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  // 🔗 Relation with RoleMaster
  @ManyToOne(() => RoleMaster)
  @JoinColumn({ name: 'roleId' })
  role: RoleMaster | null;

  // 🔗 Relation with MenuMaster
  @ManyToOne(() => MenuMaster)
  @JoinColumn({ name: 'menuId' })
  menu: MenuMaster;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdBy: UserMaster | null;

  @ManyToOne(() => UserMaster, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedBy: UserMaster | null;
}
