import { PartialType } from '@nestjs/mapped-types';
import { CreateLuckyNumberDto } from './create-lucky-number.dto';

export class UpdateLuckyNumberDto extends PartialType(CreateLuckyNumberDto) {}
