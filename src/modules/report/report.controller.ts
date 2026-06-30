import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportFilterDto } from './dto/report-filters.dto';

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
}
