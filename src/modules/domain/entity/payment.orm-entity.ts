
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('venta')
export class PaymentsOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  id_transaction: string;

  @Column('decimal', { nullable: true })
  total: number;

  @Column('decimal', { nullable: true })
  impuesto: number;

 
}
