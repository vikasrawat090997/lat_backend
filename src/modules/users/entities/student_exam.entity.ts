import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('student_exam')
export class StudentExam {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    studentId: number;

    @Column({ type: 'bigint' })
    termId: number;

    @Column({
        type: 'enum',
        enum: ['STARTED', 'COMPLETED'],
        default: 'STARTED'
    })
    status: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
