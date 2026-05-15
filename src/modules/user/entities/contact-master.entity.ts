import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('contact_master')
export class ContactMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 250 })
  email: string;

  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'varchar', length: 250 })
  phone: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '1=>Volunteer,2=>Collaborate,3=>Both',
  })
  interestType: string;

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
}
