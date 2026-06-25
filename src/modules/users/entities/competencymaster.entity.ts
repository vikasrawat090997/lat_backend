import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('competencymaster')
export class CompetencyMaster {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    gradeId: number;

    @Column({
        length: 500,
    })
    name: string;

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