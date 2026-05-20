import { Entity, Column } from 'typeorm';
import { Base } from '../../base';
import { DocumentType } from 'src/utils/enums';

@Entity('documenttypemaster')
export class DocumentTypeMaster extends Base {
  @Column({ type: 'varchar', length: 255 })
  typeName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType;
}
