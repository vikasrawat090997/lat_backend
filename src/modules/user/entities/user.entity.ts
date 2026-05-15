import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('usermaster')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  // ✅ Role
  @Column({ type: 'int', nullable: true })
  roleId: number;

  // ✅ Self reference (createdBy)
  @Column({ type: 'bigint', nullable: true })
  createdBy: number;

  @Column({ type: 'bigint', nullable: true })
  updatedBy: number;

  // ✅ Basic Info
  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  // ✅ Flags
  @Column({ type: 'tinyint', default: 0, nullable: true })
  isEmailSent: number;

  @Column({
    type: 'tinyint',
    default: 1,
    nullable: true,
    comment: '0->inactive, 1->active, 2->delete,3->firsttime',
  })
  status: number;

  // ✅ Token
  @Column({ type: 'text', nullable: true })
  token: string;

  // ✅ Dates
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

  // 🔗 Self Relation (createdBy)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  // 🔗 Role Relation
  @ManyToOne('RoleMaster', 'users') // assuming RoleMaster entity exists
  @JoinColumn({ name: 'roleId' })
  role: any;
}
