import { Test, TestingModule } from '@nestjs/testing';
import { LuckyNumberController } from './lucky-number.controller';
import { LuckyNumberService } from './lucky-number.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyNumber } from './entities/lucky-number.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('LuckyNumberController', () => {
  let controller: LuckyNumberController;
  let repository: Repository<LuckyNumber>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: 'test',
            entities: [LuckyNumber],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([LuckyNumber]),
      ],
      controllers: [LuckyNumberController],
      providers: [LuckyNumberService],
    }).compile();

    controller = module.get<LuckyNumberController>(LuckyNumberController);
    repository = module.get<Repository<LuckyNumber>>(
      getRepositoryToken(LuckyNumber),
    );

    await repository.save([
      { number: 1 },
      { number: 2 },
      { number: 3 },
      { number: 4 },
      { number: 5 },
      { number: 6 },
      { number: 7 },
      { number: 8 },
      { number: 9 },
      { number: 10 },
      { number: 11 },
      { number: 12 },
      { number: 13 },
      { number: 14 },
      { number: 15 },
      { number: 16 },
      { number: 17 },
      { number: 18 },
      { number: 19 },
      { number: 20 },
    ]);
  });

  afterEach(async () => {
    await repository.query('DELETE FROM lucky_number');
  });

  afterAll(async () => {
    const connection = repository.manager.connection;
    await connection.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle simultaneous requests without returning duplicate numbers', async () => {
    const firstRequest = controller.drawLuckyNumbers(5);
    const secondRequest = controller.drawLuckyNumbers(5);

    const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

    const allNumbers = [...firstResult, ...secondResult];
    const uniqueNumbers = new Set(allNumbers);

    expect(uniqueNumbers.size).toEqual(allNumbers.length);
    expect(allNumbers.length).toEqual(10);
  });

  it('should handle high concurrency without duplicating numbers', async () => {
    const results = await Promise.all([
      controller.drawLuckyNumbers(5),
      controller.drawLuckyNumbers(5),
      controller.drawLuckyNumbers(5),
    ]);

    const allNumbers = results.flat();
    const uniqueNumbers = new Set(allNumbers);

    expect(uniqueNumbers.size).toEqual(allNumbers.length);
  });

  it('should only return remaining numbers after previous requests', async () => {
    const firstResult = await controller.drawLuckyNumbers(3);
    const remainingNumbers = await controller.drawLuckyNumbers(2);

    expect(firstResult.length).toBe(3);
    expect(remainingNumbers.length).toBe(2);

    firstResult.forEach((num) => {
      expect(remainingNumbers).not.toContain(num);
    });
  });

  it('should throw an error when no numbers are available', async () => {
    await controller.drawLuckyNumbers(20); // Remove todos os números

    await expect(controller.drawLuckyNumbers(1)).rejects.toThrow('Not enough lucky numbers available');
  });
});
