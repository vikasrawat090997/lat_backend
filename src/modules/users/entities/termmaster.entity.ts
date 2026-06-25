import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('termmaster')
export class TermMaster {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'date' })
    termStartDate: string;

    @Column({ type: 'date' })
    termEndDate: string;

    @Column({ type: 'date' })
    examStartDate: string;

    @Column({ type: 'date' })
    examEndDate: string;

    @Column({ type: 'time' })
    examTime: string;

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}