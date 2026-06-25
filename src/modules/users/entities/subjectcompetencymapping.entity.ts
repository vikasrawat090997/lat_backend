import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('subjectcompetencymapping')
export class SubjectCompetencyMapping {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    subjectId: number;

    @Column()
    competencyId: number;

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