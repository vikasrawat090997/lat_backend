import { Controller, Post, Body, HttpCode, Patch, Get, Param, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/access-control/jwt-auth.guard';

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

  @Get('grade-group/:gradeGroupId/grades')
  async getGradesByGradeGroup(
    @Param('gradeGroupId') gradeGroupId: number,
  ) {
    return this.usersService.getGradesByGradeGroup(
      gradeGroupId,
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
  ) {
    return this.usersService.getStudentList(Number(page), Number(limit), search);
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
  @Patch('students/:userId/status')
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'number', example: 1 } } } })
  async toggleStudentStatus(
    @Param('userId') userId: number,
    @Body('status') status: number,
  ) {
    return this.usersService.toggleStudentStatus(userId, status);
  }
}

