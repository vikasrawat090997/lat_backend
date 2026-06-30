import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReportFilterDto {
    @ApiPropertyOptional({ description: 'Filter by Region ID', example: 'reg-01' })
    @IsOptional()
    @IsString()
    regionId?: string;

    @ApiPropertyOptional({ description: 'Filter by Grade ID', example: '3' })
    @IsOptional()
    @IsString()
    gradeId?: string;

    @ApiPropertyOptional({ description: 'Filter by Subject ID', example: 'math' })
    @IsOptional()
    @IsString()
    subjectId?: string;

    @ApiPropertyOptional({ description: 'Filter by Academic Year', example: '2023-2024' })
    @IsOptional()
    @IsString()
    academicYear?: string;

    @ApiPropertyOptional({ description: 'Filter by Assessment Cycle', example: 'mid-term' })
    @IsOptional()
    @IsString()
    assessmentCycle?: string;

    @ApiPropertyOptional({ description: 'Filter by School ID', example: 'sch-01' })
    @IsOptional()
    @IsString()
    schoolId?: string;

    @ApiPropertyOptional({ description: 'Filter by Assessment ID' })
    @IsOptional()
    @IsString()
    assessmentId?: string;

    @ApiPropertyOptional({ description: 'Filter by Competency ID' })
    @IsOptional()
    @IsString()
    competencyId?: string;

    @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    dateTo?: string;
}
