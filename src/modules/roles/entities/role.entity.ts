// export class Role {}

// import { UserMaster } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'rolemaster' })
export class RoleMaster {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * 0 -> inactive
   * 1 -> active
   */
  @Column({ type: 'tinyint', default: 1 })
  status: number;

  // @ManyToOne(() => UserMaster, {
  //   nullable: true,
  //   onDelete: 'RESTRICT',
  //   onUpdate: 'RESTRICT',
  // })
  // @JoinColumn({ name: 'createdBy' })
  // createdBy: UserMaster | null;

  // @ManyToOne(() => UserMaster, {
  //   nullable: true,
  //   onDelete: 'RESTRICT',
  //   onUpdate: 'RESTRICT',
  // })
  // @JoinColumn({ name: 'updatedBy' })
  // updatedBy: UserMaster | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
