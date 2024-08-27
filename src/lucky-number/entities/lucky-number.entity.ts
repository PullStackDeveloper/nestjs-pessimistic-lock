import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LuckyNumber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number;
}
