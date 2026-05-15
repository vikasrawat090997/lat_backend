import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('partner_logo')
export class PartnerLogo {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({
    name: 'img_url',
    type: 'varchar',
    length: 255,
    default: '',
  })
  img_url: string;

  @Column({
    name: 'alt_img',
    type: 'varchar',
    length: 50,
    default: '',
  })
  alt_img: string;

  @Column({
    name: 'created_by',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  created_by: number;

  @Column({
    name: 'updated_by',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  updated_by: number;

  @Column({
    type: 'tinyint',
    width: 1,
    default: 0,
    comment: '0 = inactive, 1 = active, 2 = deleted',
  })
  status: number;

  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
