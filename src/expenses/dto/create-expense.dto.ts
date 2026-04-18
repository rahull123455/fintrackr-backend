import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @MaxLength(60)
  category!: string;

  @IsDateString()
  spentAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
