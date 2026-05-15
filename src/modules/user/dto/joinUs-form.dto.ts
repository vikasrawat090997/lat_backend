import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsIn,
} from 'class-validator';

export class JoinUsFormDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;

  @IsOptional()
  @IsIn(['1', '2', '3']) //1=>Volunteer,2=>Collaborate,3=>Both
  interestType?: string;
}
