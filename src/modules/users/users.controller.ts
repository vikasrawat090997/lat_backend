import { Controller, Post, Body, HttpCode, Patch, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
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
}
