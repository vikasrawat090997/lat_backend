import { IsNotEmpty, IsNumber, IsIn, IsString, IsArray, IsOptional } from 'class-validator';

const ALLOWED_TERMS = ['Term 1', 'Term 2'] as const;
export type AllowedTermType = typeof ALLOWED_TERMS[number];

export class GenerateQuestionsDto {
    @IsNotEmpty({ message: 'displayGradeId should not be empty.' })
    @IsNumber({}, { message: 'displayGradeId must be a valid number.' })
    displayGradeId: number;

    @IsNotEmpty({ message: 'subjectId should not be empty.' })
    @IsNumber({}, { message: 'subjectId must be a valid number.' })
    subjectId: number;

    @IsNotEmpty({ message: 'term selection is mandatory.' })
    @IsString({ message: 'term must be a valid string.' })
    @IsIn(ALLOWED_TERMS, { message: 'term must be "Term 1" or "Term 2".' })
    term: AllowedTermType;

    @IsArray({ message: 'competencyIds must be a valid array of numbers.' })
    @IsNumber({}, { each: true, message: 'Each competency ID inside the array must be a number.' })
    competencyIds: number[]; // e.g., [] for ALL, or for specific ones

    @IsOptional()
    @IsNumber({}, { message: 'count must be a valid number.' })
    count?: number;
}