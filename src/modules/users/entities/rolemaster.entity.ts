import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('rolemaster')
export class RoleMaster {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'tinyint', default: 1 })
    status: number;

    @Column({ type: 'bigint', nullable: true })
    createdBy: number;

    @Column({ type: 'bigint', nullable: true })
    updatedBy: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}