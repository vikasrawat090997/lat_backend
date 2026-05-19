import { Base } from 'src/modules/base';
import { UserMaster } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('menumaster')
export class MenuMaster extends Base {
  @Column({ type: 'varchar' })
  name: string;

  @ManyToOne(() => MenuMaster)
  @JoinColumn({ name: 'parentId' })
  parent: MenuMaster;

  @Column({ type: 'int' })
  priority: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'varchar' })
  menuLink: string;

  // @Column({ type: 'varchar' })
  // menuIcon: string;

  @Column({ type: 'varchar' })
  remarks: string;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'createdBy' })
  createdBy: UserMaster;

  @ManyToOne(() => UserMaster)
  @JoinColumn({ name: 'updatedBy' })
  updatedBy: UserMaster;
}
