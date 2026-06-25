import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum SectionEnum {
    SECTION_A = 'Section A',
    SECTION_B = 'Section B',
    SECTION_C = 'Section C',
    SECTION_D = 'Section D',
}

@Entity('studentmaster')
export class StudentMaster {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    userId: number;

    @Column({ length: 50, nullable: true })
    admissionNo: string;

    @Column({ length: 50, nullable: true })
    rollNo: string;

    @Column({ length: 50, nullable: true })
    udiseCode: string;

    @Column()
    gradeId: number;

    @Column({
        type: 'enum',
        enum: SectionEnum,
        nullable: true,
    })
    section: SectionEnum;

    @Column({ length: 255, nullable: true })
    fatherName: string;

    @Column({ length: 255, nullable: true })
    motherName: string;

    @Column({
        type: 'enum',
        enum: ['Male', 'Female', 'Other'],
        nullable: true,
    })
    gender: string;

    @Column({ type: 'date', nullable: true })
    dob: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ length: 500, nullable: true })
    profileImage: string;

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