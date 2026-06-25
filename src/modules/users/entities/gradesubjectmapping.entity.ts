import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('gradesubjectmapping')
export class GradeSubjectMapping {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    gradeGroupId: number;

    @Column()
    subjectId: number;

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