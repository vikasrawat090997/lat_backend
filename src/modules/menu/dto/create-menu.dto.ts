import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ValidateIf,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsNumberString,
} from 'class-validator';

@ValidatorConstraint({ name: 'ParentValidation', async: false })
export class ParentValidationConstraint
  implements ValidatorConstraintInterface
{
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as any;

    if (obj.isParent === '1') {
      return !!obj.parentId;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'parentId is required when isParent is "1"';
  }
}

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  menuLink: string;

  // @IsString()
  // @IsOptional()
  // menuIcon?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  priority: string;

  @IsIn(['0', '1'], { message: 'isParent must be either "0" or "1"' })
  isParent: string;

  @ValidateIf((o) => o.isParent === '1')
  @IsNumberString()
  @IsNotEmpty({ message: 'parentId is required when isParent is 1' })
  @Validate(ParentValidationConstraint)
  parentId: string;
}
