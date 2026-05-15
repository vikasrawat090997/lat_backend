import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

//City Rituals
@Entity('blog_master')
export class BlogMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  category_Id: number;

  @Column({ type: 'varchar', length: 250, nullable: true })
  title: string;

  @Column({ type: 'longtext', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  slug: string;

  @Column({ type: 'int', nullable: true })
  view_count: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  image_url: string;

  @Column({ type: 'int', nullable: true })
  status: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  created_At: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updated_At: Date;

  @Column({ type: 'int' })
  created_by: number;

  @Column({ type: 'int' })
  updated_by: number;

  @Column({ type: 'varchar', length: 250, nullable: true })
  meta_title: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  keywords: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  meta_desription: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  author_name: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  quotes_words: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  subtitle: string;

  @Column({ type: 'int', nullable: true })
  category_type_id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  banner_image_url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  alt_img: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  alt_banner_img: string;

  @Column({ type: 'text', nullable: true })
  video_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdf_url: string;

  @Column({ type: 'timestamp', nullable: true })
  published_At: Date;
}
