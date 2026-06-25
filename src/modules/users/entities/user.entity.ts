import { Base } from 'src/modules/base';

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'usermaster' })
export class UserMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roleId: number;

  @Column({ nullable: true })
  languageId: number;

  @Column({ length: 100, nullable: true })
  username: string;

  @Column({
    type: 'enum',
    enum: ['Admin', 'Teacher', 'Student'],
  })
  userType: string;

  @Column({ length: 255, nullable: true })
  firstName: string;

  @Column({ length: 255, nullable: true })
  lastName: string;

  @Column({ length: 255, nullable: true, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  mobileNo: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'tinyint',
    default: 1,
  })
  status: number;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  createdBy: number;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  updatedBy: number;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;


  @Column({ type: 'text', nullable: true })
  token: string | null;
}
