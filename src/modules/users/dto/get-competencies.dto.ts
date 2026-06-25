import { IsNotEmpty, IsNumber, IsIn, IsString } from 'class-validator';

const ALLOWED_TERMS = ['Term 1', 'Term 2'] as const;

export type AllowedTermType = typeof ALLOWED_TERMS[number];

export class GetCompetenciesDto {
    @IsNotEmpty()
    @IsNumber()
    gradeId: number;

    @IsNotEmpty()
    @IsNumber()
    subjectId: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(ALLOWED_TERMS)
    term: AllowedTermType
}