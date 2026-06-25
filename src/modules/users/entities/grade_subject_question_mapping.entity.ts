import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,

} from 'typeorm';

@Entity('grade_subject_question_mapping')
export class GradeSubjectQuestionMapping {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    gradeId: number;

    @Column()
    subjectId: number;

    @Column({
        name: 'mandatory_question_count',
        type: 'int',
        default: 0,
    })
    mandatoryQuestionCount: number;

    @Column({
        name: 'optional_question_count',
        type: 'int',
        default: 0,
    })
    optionalQuestionCount: number;

    @Column({
        type: 'tinyint',
        default: 1,
    })
    status: number;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt: Date;


}