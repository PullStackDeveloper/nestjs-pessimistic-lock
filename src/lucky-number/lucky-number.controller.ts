import { Controller, Get, Query } from '@nestjs/common';
import { LuckyNumberService } from './lucky-number.service';

@Controller('lucky-number')
export class LuckyNumberController {
  constructor(private readonly luckyNumberService: LuckyNumberService) {}

  @Get('draw')
  async drawLuckyNumbers(@Query('count') count: number) {
    return await this.luckyNumberService.getRandomLuckyNumbers(Number(count));
  }
}
