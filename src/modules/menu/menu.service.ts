import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MenuMaster } from './entities/menu.entity';
import { Repository } from 'typeorm';
import { calculateOffset } from 'src/utils/utils';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { RoleMenuMapping } from '../role-menu-mapping/entities/role-menu-mapping.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuMaster)
    private readonly menuMasterRepository: Repository<MenuMaster>,
    @InjectRepository(RoleMenuMapping)
    private readonly roleMenuMappingRepository: Repository<RoleMenuMapping>,
  ) {}

  async findAll(page: number, limit: number, search: string) {
    try {
      const offset = calculateOffset(page, limit);

      const query = await this.menuMasterRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.parent', 'parentMenu')
        .select([
          'mm.id as id',
          'mm.name as menuName',
          'mm.menulink as menuLink',
          'mm.priority as priority',
          'mm.remarks as remarks',
          'mm.parentId as parentId',
          'parentMenu.name as parentMenu',
          'mm.status as status',
        ])
        .addSelect(
          `CASE 
                WHEN mm.parentId IS NULL THEN TRUE
                ELSE FALSE
              END`,
          'isParent',
        )
        .limit(limit)
        .offset(offset);
      if (search) {
        query.where('mm.name LIKE :search', { search: `%${search}%` });
      }

      const menus = await query.getRawMany();
      // Count query with same search filter
      const countQuery = this.menuMasterRepository.createQueryBuilder('mm');

      if (search) {
        countQuery.where('mm.name LIKE :search', { search: `%${search}%` });
      }

      const totalCount = await countQuery.getCount();

      return {
        results: menus,
        page: page,
        limit: limit,
        totalCount: totalCount,
      };
    } catch (err) {
      if (err.status) throw err;
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(menuId: number) {
    try {
      const menu = await this.menuMasterRepository
        .createQueryBuilder('mm')
        .leftJoin('mm.parent', 'parentMenu')
        .select([
          'mm.id as id',
          'mm.name as menuName',
          'mm.menulink as menuLink',
          'mm.priority as priority',
          'mm.remarks as remarks',
          'mm.parentId as parentId',
          'parentMenu.name as parentMenu',
          'mm.status as status',
        ])
        .addSelect(
          `CASE 
      WHEN mm.parentId IS NULL THEN TRUE
      ELSE FALSE
    END`,
          'isParent',
        )
        .where('mm.id = :menuId', { menuId })
        .getRawOne();

      if (!menu) {
        throw new HttpException('Menu not found', HttpStatus.NOT_FOUND);
      }

      return menu;
    } catch (err) {
      if (err.status) throw err;
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async create(createMenuDto: CreateMenuDto, user: any) {
    try {
      // Check if the menu name already exists
      const existingMenu = await this.menuMasterRepository.findOne({
        where: { name: createMenuDto.name },
      });

      if (existingMenu) {
        throw new HttpException('Menu already exists', HttpStatus.BAD_REQUEST);
      }

      // Create menu instance
      const menuInstance = this.menuMasterRepository.create({
        ...createMenuDto,
        createdBy: user.id ?? null,
      });

      // Assign parent if applicable
      if (
        createMenuDto.isParent == '0' &&
        createMenuDto.parentId &&
        createMenuDto.parentId != '1'
      ) {
        menuInstance.parent = await this.menuMasterRepository.findOne({
          where: { id: createMenuDto.parentId },
        });
      } else {
        menuInstance.parent = null;
      }
      await this.menuMasterRepository.save(menuInstance);
      return 'Menu created successfully';
    } catch (err) {
      if (err.status) {
        throw err;
      }
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateMenu(
    menuId: string,
    updateMenuDto: UpdateMenuDto,
    tokenDetails: any,
  ) {
    try {
      const menu = await this.menuMasterRepository.findOne({
        where: { id: menuId },
      });
      if (!menu) {
        throw new HttpException('No Menu Found', HttpStatus.NOT_FOUND);
      }
      // Check if the Menu name already exists
      const existingMenu = await this.menuMasterRepository.findOne({
        where: { name: updateMenuDto.name },
      });

      if (existingMenu && existingMenu.id != menuId) {
        throw new HttpException('Menu already exists', HttpStatus.BAD_REQUEST);
      }

      menu.name = updateMenuDto.name ?? menu.name;
      menu.menuLink = updateMenuDto.menuLink ?? menu.menuLink;
      // menu.menuIcon = updateMenuDto.menuIcon ?? menu.menuIcon;
      menu.remarks = updateMenuDto.remarks ?? menu.remarks;
      menu.priority = updateMenuDto.priority ?? menu.priority;
      // Assign parent if applicable sh
      if (
        updateMenuDto.isParent == '0' &&
        updateMenuDto.parentId &&
        updateMenuDto.parentId != '1'
      ) {
        menu.parent = await this.menuMasterRepository.findOne({
          where: { id: updateMenuDto.parentId },
        });
      } else {
        menu.parent = null;
      }
      menu.updatedBy = tokenDetails.userId;
      await this.menuMasterRepository.save(menu);
      return 'Update successfully';
    } catch (err) {
      if (err.status) {
        throw err;
      }
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateStatus(id: string, status: number, uid: any) {
    try {
      if (![0, 1].includes(status)) {
        throw new BadRequestException('Invalid status value.');
      }

      const menu = await this.menuMasterRepository.findOneBy({ id });

      if (!menu) {
        throw new NotFoundException('Menu not found.');
      }

      if (menu.status === 1) {
        if (status === 0 || status === 2) {
          const mappingExists = await this.roleMenuMappingRepository.findOne({
            where: {
              menu: { id: Number(id) } as any,
            },
          });

          if (mappingExists) {
            throw new BadRequestException(
              'Menu cannot be disabled because it is assigned to a role.',
            );
          }
        }
      }

      if (menu.status === status) {
        throw new BadRequestException(
          status === 1 ? 'Menu already enabled.' : 'Menu already disabled.',
        );
      }

      menu.status = status;
      menu.updatedBy = uid;

      await this.menuMasterRepository.save(menu);
      return menu;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(error);
    }
  }
}
