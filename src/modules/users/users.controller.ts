import { Controller, Post, Body, HttpCode, Patch, Get, Param, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
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
  async getTeacherList(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.usersService.getTeacherList(Number(page), Number(limit), search);
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
}

