import { Test, TestingModule } from '@nestjs/testing';
import { LuckyNumberService } from './lucky-number.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyNumber } from './entities/lucky-number.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('LuckyNumberService', () => {
  let service: LuckyNumberService;
  let repository: Repository<LuckyNumber>;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true, // Torna o ConfigModule global
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
      providers: [LuckyNumberService],
    }).compile();

    service = module.get<LuckyNumberService>(LuckyNumberService);
    repository = module.get<Repository<LuckyNumber>>(getRepositoryToken(LuckyNumber));
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    const connection = repository.manager.connection;
    await connection.close();
  });

  it('should lock and prevent simultaneous access', async () => {
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
    ]);

    const firstTransaction = service.getRandomLuckyNumbers(5);
    const secondTransaction = service.getRandomLuckyNumbers(5);

    const [firstResult, secondResult] = await Promise.all([firstTransaction, secondTransaction]);

    const allNumbers = [...firstResult, ...secondResult];
    const uniqueNumbers = new Set(allNumbers);

    expect(uniqueNumbers.size).toEqual(allNumbers.length);
    expect(allNumbers.length).toEqual(10);
  });
});
