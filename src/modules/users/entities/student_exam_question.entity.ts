import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('student_exam_question')
export class StudentExamQuestion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    studentExamId: number;

    @Column({ type: 'bigint' })
    questionId: number;

    @Column({ type: 'bigint', nullable: true })
    optionId: number;

    @Column({ type: 'tinyint', nullable: true })
    isCorrect: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
