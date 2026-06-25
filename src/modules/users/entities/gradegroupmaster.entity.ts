import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('gradegroupmaster')
export class GradeGroupMaster {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ default: 1 })
    priority: number;

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