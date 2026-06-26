import { IsNumber, IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckExamDto {
    @IsNumber()
    @IsNotEmpty()
    studentId: number;

    @IsNumber()
    @IsNotEmpty()
    termId: number;
}

export class StartExamDto extends CheckExamDto {}

export class GetExamQuestionsDto extends CheckExamDto {}

export class ExamAnswerDto {
    @IsNumber()
    @IsNotEmpty()
    questionId: number;

    @IsNumber()
    @IsNotEmpty()
    optionId: number;
}

export class SubmitExamDto {
    @IsNumber()
    @IsNotEmpty()
    studentExamId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExamAnswerDto)
    answers: ExamAnswerDto[];
}
