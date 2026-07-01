import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportFilterDto } from './dto/report-filters.dto';
import { Response } from 'express';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('competency')
  @ApiOperation({ summary: 'Get Competency Report' })
  @ApiResponse({ status: 200, description: 'Returns competency aggregated data.' })
  async getCompetencyReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getCompetencyReport(filters);
  }

  @Get('school')
  @ApiOperation({ summary: 'Get School Report' })
  @ApiResponse({ status: 200, description: 'Returns school aggregated data.' })
  async getSchoolReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getSchoolReport(filters);
  }

  @Get('region')
  @ApiOperation({ summary: 'Get Region Report' })
  @ApiResponse({ status: 200, description: 'Returns region aggregated data.' })
  async getRegionReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getRegionReport(filters);
  }

  @Get('subject')
  @ApiOperation({ summary: 'Get Subject Report' })
  @ApiResponse({ status: 200, description: 'Returns subject aggregated data.' })
  async getSubjectReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getSubjectReport(filters);
  }

  @Get('grade')
  @ApiOperation({ summary: 'Get Grade Report' })
  @ApiResponse({ status: 200, description: 'Returns grade aggregated data.' })
  async getGradeReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getGradeReport(filters);
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Get Teacher Analytics Report' })
  @ApiResponse({ status: 200, description: 'Returns teacher aggregated data.' })
  async getTeacherReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getTeacherReport(filters);
  }

  @Get('student')
  @ApiOperation({ summary: 'Get Student Performance Report' })
  @ApiResponse({ status: 200, description: 'Returns student aggregated data.' })
  async getStudentReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getStudentReport(filters);
  }

  @Get('term')
  @ApiOperation({ summary: 'Get Term/Exam Report' })
  @ApiResponse({ status: 200, description: 'Returns term aggregated data.' })
  async getTermReport(@Query() filters: ReportFilterDto) {
    return this.reportService.getTermReport(filters);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export Analytics Report' })
  @ApiResponse({ status: 200, description: 'Returns a PDF document.' })
  async exportPdf(@Query() filters: ReportFilterDto, @Res() res: Response) {
    const docBuffer = await this.reportService.generatePdf(filters);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="LAT_Analytics_Report.pdf"',
      'Content-Length': docBuffer.length,
    });
    
    res.end(docBuffer);
  }
}
