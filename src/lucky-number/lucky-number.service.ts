import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LuckyNumber } from './entities/lucky-number.entity';

@Injectable()
export class LuckyNumberService {
  constructor(
    @InjectRepository(LuckyNumber)
    private readonly luckyNumberRepository: Repository<LuckyNumber>,
  ) {}

  async getRandomLuckyNumbers(count: number): Promise<number[]> {
    const queryRunner = this.luckyNumberRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const luckyNumbers = await queryRunner.manager
        .createQueryBuilder(LuckyNumber, 'lucky_number')
        .setLock('pessimistic_write')
        .orderBy('RANDOM()')
        .limit(count)
        .getMany();

      if (luckyNumbers.length < count) {
        throw new Error('Not enough lucky numbers available');
      }

      // Deleta os números sorteados
      await queryRunner.manager.delete(LuckyNumber, {
        id: In(luckyNumbers.map((num) => num.id)),
      });

      await queryRunner.commitTransaction();

      return luckyNumbers.map((num) => num.number);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
