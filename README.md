### Ensuring Data Integrity in Simultaneous Requests: Implementing AICD and Pessimistic Locking in a Lucky Number Service with NestJS

In a scenario where a website offers lucky number draws, ensuring that each number is unique and cannot be drawn by multiple users simultaneously is paramount. This is especially critical in high-concurrency environments where multiple users might attempt to draw a number at the same time. To tackle this problem, we employ a combination of the Fisher-Yates shuffle algorithm and a robust database management strategy using pessimistic locking. This approach ensures that lucky numbers are not repeated and are securely assigned to individual users without conflicts.

In this tutorial, we will guide you through the steps of building a NestJS application that securely manages lucky numbers. We will cover everything from configuring a PostgreSQL database to implementing pessimistic locking, which is crucial in preventing the same lucky number from being assigned to multiple users simultaneously. Additionally, we'll explore how the Fisher-Yates algorithm is used to shuffle and manage these numbers, and we'll provide a detailed explanation of how the service adheres to AICD (Atomicity, Isolation, Consistency, Durability) principles.

### 1. Project Structure Overview

The project structure remains the same, but the emphasis here will be on how the components work together to manage the unique allocation of lucky numbers:

```
- src
  - lucky-number
    - dto
      - create-lucky-number.dto.ts
      - update-lucky-number.dto.ts
    - entities
      - lucky-number.entity.ts
    - lucky-number.controller.spec.ts
    - lucky-number.controller.ts
    - lucky-number.module.ts
    - lucky-number.service.spec.ts
    - lucky-number.service.ts
  - app.controller.spec.ts
  - app.controller.ts
  - app.module.ts
  - app.service.ts
  - main.ts
- .env
- .eslintrc.js
- .gitignore
- .prettierrc
- estrutura_projeto.txt
- export-tree.ps1
- nest-cli.json
- package.json
- README.md
- tsconfig.build.json
- tsconfig.json
- yarn.lock
```

Each file and folder plays a critical role in ensuring that the lucky number service operates without errors or conflicts.

### 2. Problem Context: Unique Lucky Numbers for Draws

Imagine a website that conducts lucky number draws. The main requirement is that once a number is drawn, it cannot be drawn again by another user. To achieve this, we utilize a Fisher-Yates shuffle algorithm to randomize the numbers and then move them from a source table to a destination table, ensuring they are not drawn again.

However, in a high-traffic environment, where multiple users may request lucky numbers simultaneously, there's a risk that the same number might be assigned to different users. To prevent this, we implement pessimistic locking. This ensures that when a number is being processed for one user, it's locked from access by other users until the transaction is complete.

### 3. Configuring the Database

The database configuration remains the same as in the previous section, but now with the added context of managing the unique draw and transfer of lucky numbers:

1. **Install dependencies**:
   ```bash
   yarn add @nestjs/typeorm typeorm pg @nestjs/config
   ```

2. **Create a `.env` file** with your database configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=your_database
   ```

3. **Configure TypeORM in `app.module.ts`**:
   ```typescript
   import { Module } from '@nestjs/common';
   import { TypeOrmModule } from '@nestjs/typeorm';
   import { ConfigModule, ConfigService } from '@nestjs/config';
   import { LuckyNumberModule } from './lucky-number/lucky-number.module';

   @Module({
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
           database: configService.get<string>('DB_DATABASE'),
           autoLoadEntities: true,
           synchronize: true, // Disable in production
         }),
         inject: [ConfigService],
       }),
       LuckyNumberModule,
     ],
   })
   export class AppModule {}
   ```

### 4. Implementing the Fisher-Yates Shuffle with Pessimistic Locking

Pessimistic locking is essential to ensure that each number, once selected, is locked from being drawn by another user until it is successfully transferred to the destination table.

1. **Define the `LuckyNumber` entity**:
   ```typescript
   import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

   @Entity()
   export class LuckyNumber {
     @PrimaryGeneratedColumn()
     id: number;

     @Column()
     number: number;
   }
   ```

2. **Implement the `LuckyNumberService` with Pessimistic Locking**:

   Let's delve into the key components of this service implementation:

   ```typescript
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

         // Use Fisher-Yates algorithm to shuffle and delete drawn numbers
         for (let i = luckyNumbers.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [luckyNumbers[i], luckyNumbers[j]] = [luckyNumbers[j], luckyNumbers[i]];
         }

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
   ```

   ### Explanation:

   #### Fetching Lucky Numbers Randomly

   The code snippet uses PostgreSQL's `ORDER BY RANDOM()` to fetch a specified number of lucky numbers in a random order. Here's how it works:

- **`ORDER BY RANDOM()`**: This part of the query tells PostgreSQL to randomly shuffle the rows of the `LuckyNumber` table before selecting any. PostgreSQL internally uses a random number generator to assign a random value to each row and then sorts the rows based on these values. This is a convenient way to fetch random records from a table without having to manually shuffle them in the application layer.

- **`limit(count)`**: The `limit` clause restricts the number of rows fetched to the `count` parameter, which is the number of lucky numbers you want to retrieve. This ensures that the number of lucky numbers selected is exactly what was requested.

#### Ensuring Data Integrity with Pessimistic Locking

To prevent the same lucky number from being selected by multiple simultaneous requests, the `setLock('pessimistic_write')` method is used:

- **`setLock('pessimistic_write')`**: This method ensures that any rows involved in the current transaction are locked for writing. This means that once a row (in this case, a lucky number) is selected in one transaction, it cannot be selected or modified by another transaction until the current transaction is either committed or rolled back. This locking mechanism is crucial for maintaining data integrity, especially in high-concurrency environments where multiple requests might attempt to draw lucky numbers at the same time.

#### Shuffling and Deleting Drawn Numbers

After fetching the random lucky numbers, the service uses the Fisher-Yates algorithm to further shuffle them before deletion:

- **Fisher-Yates Shuffle**: The Fisher-Yates algorithm is a well-known method for shuffling an array of items. In this implementation, it's used to randomly shuffle the selected lucky numbers, adding an additional layer of randomness. Even though the numbers are already fetched randomly by PostgreSQL, the algorithm ensures that the order in which the numbers are processed remains unpredictable.

- **Deletion of Drawn Numbers**: After shuffling, the service proceeds to delete the selected lucky numbers from the `LuckyNumber` table to ensure they cannot be drawn again. The deletion is handled within the same transaction to guarantee atomicity:

  ```typescript
  await queryRunner.manager.delete(LuckyNumber, {
    id: In(luckyNumbers.map((num) => num.id)),
  });
  ```

   - **`In(luckyNumbers.map((num) => num.id))`

**: This part of the query constructs an array of IDs corresponding to the lucky numbers that were selected and shuffled. The `delete` method then removes these records from the table in one atomic operation.

#### Transaction Management

The entire operation, from fetching to shuffling to deletion, is wrapped inside a database transaction managed by a query runner:

- **Transaction Start**: `await queryRunner.startTransaction();` initiates a new transaction, ensuring that all subsequent operations are performed within this transaction.

- **Commit or Rollback**: If the operation is successful, `await queryRunner.commitTransaction();` commits the transaction, permanently applying all changes (i.e., deletion of lucky numbers). If any error occurs during the process, `await queryRunner.rollbackTransaction();` rolls back the transaction, undoing any changes that were made, ensuring the system's consistency.

- **Releasing Resources**: Finally, the query runner is released with `await queryRunner.release();`, freeing up database resources.

#### Returning the Lucky Numbers

Finally, the service returns the drawn lucky numbers, ensuring that each number returned to the user is unique and has been securely removed from the pool of available numbers:

   ```typescript
   return luckyNumbers.map((num) => num.number);
   ```

This line maps the `LuckyNumber` entities to just their numeric values, which are then returned to the caller.

### 5. The Role of Pessimistic Locking in Ensuring Unique Draws

**Pessimistic Locking** plays a critical role in this implementation. Here's why:

- **Isolation**: When a transaction is in progress (a user is drawing a lucky number), the pessimistic lock ensures that no other transaction can access the same data until the current one is complete. This isolation is crucial for maintaining the uniqueness of each lucky number.
- **Consistency**: Pessimistic locking guarantees that numbers are consistently managed and that once a number is drawn and locked, it cannot be accessed by another process. This consistency prevents the risk of two users receiving the same lucky number.

### 6. Testing the Service

Testing is vital to confirm that the service correctly handles concurrent requests, ensuring no two users ever receive the same lucky number.

1. **Setup the Test Environment** in `lucky-number.service.spec.ts`:
   ```typescript
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
   ```

### 7. Running the Application and Tests

1. **Run the Application**:
   ```bash
   yarn start
   ```

2. **Run the Tests**:
   ```bash
   yarn test
   ```

   Ensure all tests pass, confirming that the service correctly handles concurrent requests and adheres to the AICD principles.
