import { Controller, Post, Body, HttpCode, Patch, Get, Param, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException, Req, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/access-control/jwt-auth.guard';
import { GetCompetenciesDto } from './dto/get-competencies.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

@Controller('')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return await this.usersService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('grade-group')
  async getGradeGroupList() {
    return this.usersService.getGradeGroupList();
  }

  @Get('grades')
  async getGradesByGradeGroup(
  ) {
    return this.usersService.getGradesByGradeGroup(

    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('subjects')
  async getSubjectList() {
    return this.usersService.getSubjectList();
  }

  @UseGuards(JwtAuthGuard)
  @Get('regions')
  async getRegionList() {
    return this.usersService.getRegionList();
  }

  @UseGuards(JwtAuthGuard)
  @Get('regions/:regionId/schools')
  @ApiQuery({ name: 'udisecode', required: false, type: String })
  async getSchoolsByRegion(
    @Param('regionId') regionId: number,
    @Query('udisecode') udisecode?: string,
  ) {
    return this.usersService.getSchoolsByRegion(regionId, udisecode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/dashboard/summary')
  async getDashboardSummary() {
    return this.usersService.getDashboardSummary();
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/dashboard')
  async getTeacherDashboard(@Req() req: any) {
    const userId = req.user?.userId;
    return this.usersService.getTeacherDashboard(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teachers')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'regionId', required: false, type: String })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  async getTeacherList(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('regionId') regionId?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.usersService.getTeacherList(Number(page), Number(limit), search, regionId, schoolId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('teachers')
  async createTeacher(@Body() dto: CreateTeacherDto) {
    return this.usersService.createTeacher(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('teachers/bulk')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async bulkUploadTeachers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.usersService.bulkUploadTeachers(file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('teachers/:userId')
  async updateTeacher(
    @Param('userId') userId: number,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.usersService.updateTeacher(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('teachers/:userId/status')
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'number', example: 1 } } } })
  async toggleTeacherStatus(
    @Param('userId') userId: number,
    @Body('status') status: number,
  ) {
    return this.usersService.toggleTeacherStatus(userId, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('students')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getStudentList(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('gradeId') gradeId?: string,
    @Query('section') section?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.getStudentList(Number(page), Number(limit), search, gradeId, section, status);
  }

  @UseGuards(JwtAuthGuard)
  @Post('students')
  async createStudent(@Req() req: any, @Body() dto: CreateStudentDto) {
    const createdBy = req.user?.userId || null;
    return this.usersService.createStudent(dto, createdBy);
  }

  @UseGuards(JwtAuthGuard)
  @Post('students/bulk')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async bulkUploadStudents(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const createdBy = req.user?.userId || null;
    return this.usersService.bulkUploadStudents(file, createdBy);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('students/:userId')
  async updateStudent(
    @Param('userId') userId: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.usersService.updateStudent(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('students/status')
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'number', example: 1 }, studentId: { type: 'number', example: 1 } } } })
  async toggleStudentStatus(
    @Body('status') status: number,
    @Body('studentId') studentId: number,
  ) {

    return this.usersService.toggleStudentStatus(studentId, status);
  }

  @Post('competencies-list')
  async getCompetenciesList(@Body() dto: GetCompetenciesDto) {
    return await this.usersService.fetchCompetencies(dto);
  }

  @Post('generate-batch')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async generateBatchQuestions(@Body() dto: GenerateQuestionsDto) {
    return await this.usersService.processBatchGeneration(dto);
  }
}

