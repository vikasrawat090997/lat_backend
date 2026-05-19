import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
  Post,
  Body,
  Req,
  Put,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuQueryDto } from './dto/menuQuery.dto';

@UseGuards(JwtAuthGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  findAll(@Query() query: MenuQueryDto) {
    const { page = 1, limit = 10, search } = query;
    return this.menuService.findAll(page, limit, search);
  }

  @Get(':menuId')
  findOne(@Param('menuId') menuId: string) {
    return this.menuService.findOne(+menuId);
  }

  @Post()
  menuCreate(@Body() createMenuDto: CreateMenuDto, @Req() request: any) {
    return this.menuService.create(createMenuDto, request.user);
  }

  @Put(':menuId')
  updateMenu(
    @Req() request: any,
    @Param('menuId') menuId: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ) {
    return this.menuService.updateMenu(menuId, updateMenuDto, request.user);
  }

  @Post('status/:id/:status')
  async updateStatus(
    @Req() request: any,
    @Param('id') id: string,
    @Param('status') status: string,
  ) {
    const uid = Number(request?.user?.userId) || null;
    return this.menuService.updateStatus(id, +status, uid);
  }
}
