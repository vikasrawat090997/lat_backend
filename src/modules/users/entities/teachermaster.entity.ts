import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('teachermaster')
export class TeacherMaster {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    userId: number;

    @Column({
        nullable: true,
    })
    employeeCode: string;

    @Column()
    schoolId: number;

    @Column({ length: 50, nullable: true })
    udiseCode: string;

    @Column({
        nullable: true,
    })
    qualification: string;

    @Column({
        nullable: true,
    })
    experienceYears: number;

    @Column({
        type: 'date',
        nullable: true,
    })
    joiningDate: string;

    @Column({
        type: 'enum',
        enum: ['Male', 'Female', 'Other'],
        nullable: true,
    })
    gender: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    address: string;

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