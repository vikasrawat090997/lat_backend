import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('languagemaster')
export class LanguageMaster {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 20 })
    code: string;

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