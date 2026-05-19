import { Entity, Column } from 'typeorm';
import { Base } from '../../base';

@Entity('documenttypemaster')
export class DocumentTypeMaster extends Base {
  @Column({ type: 'varchar', length: 255 })
  typeName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;
}
