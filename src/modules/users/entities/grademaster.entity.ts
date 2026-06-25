import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('grademaster')
export class GradeMaster {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    gradeGroupId: number;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 50, nullable: true })
    code: string;

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