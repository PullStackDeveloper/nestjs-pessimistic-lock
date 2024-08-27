import { Module } from '@nestjs/common';
import { LuckyNumberService } from './lucky-number.service';
import { LuckyNumberController } from './lucky-number.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyNumber } from './entities/lucky-number.entity';

@Module({
  controllers: [LuckyNumberController],
  imports: [TypeOrmModule.forFeature([LuckyNumber])],
  providers: [LuckyNumberService],
})
export class LuckyNumberModule {}
