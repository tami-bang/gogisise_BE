import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';

function IsValidAgeForSpecies(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAgeForSpecies',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const species = (args.object as CreateRawRecordDto).species;
          return species === 'PORK'
            ? value == null
            : value == null || Number.isInteger(value);
        },
        defaultMessage(args: ValidationArguments) {
          return (args.object as CreateRawRecordDto).species === 'PORK'
            ? 'ageInMonths must be null for PORK'
            : 'ageInMonths must be an integer when provided';
        },
      },
    });
  };
}

export class CreateRawRecordDto {
  @IsString()
  @Equals('GEUMCHEON')
  sourceName: string;

  @IsDateString({}, { message: 'collectedAt must be a valid ISO 8601 timestamp' })
  @Matches(/\+09:00$/, { message: 'collectedAt must use the +09:00 KST offset' })
  collectedAt: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'rawProductName must contain a non-space character' })
  @MaxLength(500)
  rawProductName: string;

  @IsInt()
  @IsPositive()
  price: number;

  @IsString()
  @IsIn(['BEEF', 'PORK'])
  species: string;

  @IsString()
  @IsIn(['CHILLED', 'FROZEN'])
  storageType: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  @IsValidAgeForSpecies()
  ageInMonths?: number | null;
}

export class CreateRawRecordBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateRawRecordDto)
  records: CreateRawRecordDto[];
}
