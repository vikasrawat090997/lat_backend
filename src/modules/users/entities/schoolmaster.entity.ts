import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum SchoolTypeEnum {
    GOVERNMENT = 'Government',
    PRIVATE = 'Private',
    AIDED = 'Aided',
    KENDRIYA_VIDYALAYA = 'Kendriya Vidyalaya',
    NAVODAYA_VIDYALAYA = 'Navodaya Vidyalaya',
}

@Entity('schoolmaster')
export class SchoolMaster {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    regionId: number;

    @Column()
    udiseCode: string;

    @Column()
    schoolName: string;

    @Column({
        nullable: true,
    })
    principalName: string;

    @Column({
        nullable: true,
    })
    email: string;

    @Column({
        nullable: true,
    })
    mobileNo: string;

    @Column({
        type: 'text',
        nullable: true,
    })
    address: string;

    @Column({
        nullable: true,
    })
    pincode: string;

    @Column({
        type: 'enum',
        enum: SchoolTypeEnum,
        nullable: true,
    })
    schoolType: SchoolTypeEnum;

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