import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
  Put,
  UploadedFiles,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/access-control/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/utils/multer';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BannerDto } from './dto/create-banner.dto';
import {
  bannerDesciptionBase64Size,
  bannerImageSize,
} from 'src/constants/constants';
import { CreateStatsDto } from './dto/create-stats.dto';
import { StatsUpdateStatusDto } from './dto/update-stats-status.dto';
import { UpdateBannerStatusDto } from './dto/update-banner-status.dto';
import { JoinUsFormDto } from './dto/joinUs-form.dto';
import { GetContactsDto } from './dto/get-join-us-form.dto';
import { SDGAlignmentDto } from './dto/create-sdg-alignment.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateRolePageSectionMappingDto } from './dto/create-role-page-section-mapping.dto';
import { TheoryOfChangeDto } from './dto/create-theory-of-change.dto';
import { CityRitualsDto } from './dto/create-city-rituals.dto';
import { CreateJoinUsFormDto } from './dto/join-us-form.dto';
import {
  PartnerLogoDto,
  PartnerLogoItemDto,
} from './dto/create-partner-logo.dto';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateFooterDto } from './dto/update-footer.dto';
import { SeoDto } from './dto/seo-data.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto.email, loginDto.password);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('banner')
  @HttpCode(200)
  async bannerCarousel() {
    return this.userService.bannerCarousel();
  }

  @UseGuards(JwtAuthGuard)
  @Get('banner/:id')
  @HttpCode(200)
  async bannerCarouselById(@Param('id') id: string) {
    return this.userService.bannerCarouselById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/create')
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.userService.create(createUserDto, +req.user.userId);
  }
  @UseGuards(JwtAuthGuard)
  @Post('banner')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: BannerDto })
  @UseInterceptors(
    FileInterceptor(
      'image',
      multerConfig(bannerImageSize, bannerDesciptionBase64Size),
    ),
  )
  async upsertBanner(
    @Req() request: any,
    @Body() body: BannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body.id && !file) {
      throw new BadRequestException('Image is required');
    }
    // File validation
    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Image must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    //  Dynamic folder (default = carousel)
    const folder = 'carousel';
    return this.userService.upsertBanner(
      body,
      file,
      folder,
      +request.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('banner/status/:id')
  @HttpCode(200)
  async updateBannerStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBannerStatusDto,
    @Req() req: any,
  ) {
    const loginUserId = req.user.userId;

    return this.userService.updateBannerStatus(
      Number(id),
      dto.status,
      loginUserId,
    );
  }

  @Post('join-us')
  @HttpCode(200)
  async joinUs(@Body() dto: JoinUsFormDto) {
    return this.userService.joinUs(dto);
  }

  @Get('join-us')
  @ApiQuery({ name: 'page', required: false, default: 1 })
  @ApiQuery({ name: 'limit', required: false, default: 10 })
  @ApiQuery({ name: 'startDate', required: false, default: '2026-04-01' })
  @ApiQuery({ name: 'endDate', required: false, default: '2026-04-01' })
  getContacts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.userService.getContacts(page, limit, startDate, endDate);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('stats')
  @HttpCode(200)
  async stats() {
    return this.userService.stats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/:id')
  @HttpCode(200)
  async statsById(@Param('id') id: string) {
    return this.userService.statsById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stats/create')
  async upsertStats(@Body() body: CreateStatsDto, @Req() req) {
    return this.userService.upsertStats(body, +req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stats/status')
  async updateStatsStatus(@Body() body: StatsUpdateStatusDto, @Req() req) {
    const userId = req.user?.userId;
    return this.userService.updateStatsStatus(body, userId);
  }

  // ✅ CREATE
  @UseGuards(JwtAuthGuard)
  @Post('page/create')
  pageCreate(@Body() dto: CreatePageDto, @Req() req) {
    return this.userService.pageCreate(dto, +req.user.userId);
  }

  // ✅ GET ALL
  @UseGuards(JwtAuthGuard)
  @Get('pages')
  pagefindAll() {
    return this.userService.pagefindAll();
  }

  // ✅ GET ONE
  @UseGuards(JwtAuthGuard)
  @Get('pages/:id')
  pageFindOne(@Param('id') id: number) {
    return this.userService.pagefindOne(id);
  }

  // ✅ UPDATE
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  pageUpdate(@Param('id') id: number, @Body() dto: UpdatePageDto, @Req() req) {
    return this.userService.pageUpdate(id, dto, +req.user.userId);
  }

  // Admin => GET Section List By Page Id
  @UseGuards(JwtAuthGuard)
  @Get('section/page/:id')
  getSectionsWithCount(@Param('id') id: number) {
    return this.userService.getSectionsWithCount(id);
  }

  // Admin => GET Section Data By SectionId
  @UseGuards(JwtAuthGuard)
  @Get('section-details/section/:id')
  sectionDetailsBySectionId(@Param('id') id: number) {
    return this.userService.sectionDetailsBySectionId(id);
  }

  // Admin => Create Section
  @UseGuards(JwtAuthGuard)
  @Post('section')
  createSection(@Body() dto: CreateSectionDto, @Req() req: any) {
    return this.userService.createSection(dto, req.user.userId);
  }

  // Admin => Update Section
  @UseGuards(JwtAuthGuard)
  @Put('section/:id')
  updateSection(
    @Body() dto: UpdateSectionDto,
    @Req() req: any,
    @Param('id') id: number,
  ) {
    return this.userService.updateSection(dto, req.user.userId, id);
  }

  // Admin => Enable/Disable/Delete Section
  @UseGuards(JwtAuthGuard)
  @Post('section/status/:id')
  @HttpCode(200)
  async updateSectionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBannerStatusDto,
    @Req() req: any,
  ) {
    const loginUserId = req.user.userId;

    return this.userService.updateSectionStatus(
      Number(id),
      dto.status,
      loginUserId,
    );
  }

  //
  // ✅ CREATE
  @Post('faq/create')
  faqCreate(@Body() dto: CreateFaqDto, @Req() req) {
    return this.userService.faqCreate(dto, +req.user.userId);
  }

  // ✅ GET ALL
  @Get('faq/list')
  faqList() {
    return this.userService.faqList();
  }

  // ✅ GET ONE
  @Get('faq/:id')
  faqDetail(@Param('id') id: number) {
    return this.userService.faqDetail(id);
  }

  // ✅ UPDATE
  @Put('faq/update/:id')
  faqUpdate(@Param('id') id: number, @Body() dto: UpdateFaqDto, @Req() req) {
    return this.userService.faqUpdate(id, dto, +req.user.userId);
  }

  // ✅ DELETE
  @Delete('faq/delete/:id')
  faqDelete(@Param('id') id: number) {
    return this.userService.faqDelete(id);
  }

  //--------------------------SDG ALIGNMENT STARTS--------------------------

  @UseGuards(JwtAuthGuard)
  @Post('sdg-alignment')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SDGAlignmentDto })
  @UseInterceptors(
    FileInterceptor(
      'image',
      multerConfig(bannerImageSize, bannerDesciptionBase64Size),
    ),
  )
  async upsertSdgAlignment(
    @Req() request: any,
    @Body() body: SDGAlignmentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body.id && !file) {
      throw new BadRequestException('Image is required');
    }

    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Image must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const folder = 'sdg-alignment';

    const userId = request.user?.userId;

    return this.userService.upsertSdgAlignment(body, file, folder, userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('sdg-alignment')
  @HttpCode(200)
  async sdgAlignment() {
    return this.userService.sdgAlignment();
  }

  @UseGuards(JwtAuthGuard)
  @Get('sdg-alignment/:id')
  @HttpCode(200)
  async sdgAlignmentById(@Param('id') id: string) {
    return this.userService.sdgAlignmentById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sdg-alignment/status')
  async updateSDGAlignmentStatus(
    @Body() body: StatsUpdateStatusDto,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    return this.userService.updateSDGAlignmentStatus(body, userId);
  }
  //--------------------------SDG ALIGNMENT ENDS--------------------------

  // Admin GET ROLE PAGE SECTION MAPPING
  @Get('role-page-section-mapping')
  async getRolePageSetionMapping() {
    return await this.userService.getRolePageSetionMapping();
  }
  // Admin UPSERT ROLE PAGE SECTION MAPPING
  @UseGuards(JwtAuthGuard)
  @Post('role-page-section-mapping')
  async rolePageSectionMapping(
    @Body() createRolePageSectionMappingDto: CreateRolePageSectionMappingDto,
    @Req() request: any,
  ) {
    return this.userService.rolePageSectionMapping(
      createRolePageSectionMappingDto,
      request.user,
    );
  }

  //--------------------------THEORY OF CHANGE STARTS--------------------------

  @UseGuards(JwtAuthGuard)
  @Post('theory-of-change')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: TheoryOfChangeDto })
  @UseInterceptors(
    FileInterceptor(
      'image',
      multerConfig(bannerImageSize, bannerDesciptionBase64Size),
    ),
  )
  async upsertTheoryOfChange(
    @Req() request: any,
    @Body() body: TheoryOfChangeDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body.id && !file) {
      throw new BadRequestException('Image is required');
    }

    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Image must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const folder = 'theory-of-change';

    const userId = request.user?.userId;

    return this.userService.upsertTheoryOfChange(body, file, folder, userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('theory-of-change')
  @HttpCode(200)
  async theoryOfChange() {
    return this.userService.theoryOfChange();
  }

  @UseGuards(JwtAuthGuard)
  @Get('theory-of-change/:id')
  @HttpCode(200)
  async theoryOfChangeById(@Param('id') id: string) {
    return this.userService.theoryOfChangeById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('theory-of-change/status')
  async updateTheoryOfChangeStatus(
    @Body() body: StatsUpdateStatusDto,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    return this.userService.updateTheoryOfChangeStatus(body, userId);
  }

  //--------------------------THEORY OF CHANGE ENDS--------------------------

  //--------------------------CITY RITUALS STARTS--------------------------
  @UseGuards(JwtAuthGuard)
  @Post('city-rituals')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CityRitualsDto })
  @UseInterceptors(
    FileInterceptor(
      'image',
      multerConfig(bannerImageSize, bannerDesciptionBase64Size),
    ),
  )
  async upsertCityRituals(
    @Req() request: any,
    @Body() body: CityRitualsDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!body.id && !file) {
      throw new BadRequestException('Image is required');
    }

    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Image must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const folder = 'city-rituals';

    const userId = request.user?.userId;

    return this.userService.upsertCityRituals(body, file, folder, userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('city-rituals')
  @HttpCode(200)
  async cityRituals() {
    return this.userService.cityRituals();
  }

  @UseGuards(JwtAuthGuard)
  @Get('city-rituals/:id')
  @HttpCode(200)
  async cityRitualsById(@Param('id') id: string) {
    return this.userService.cityRitualsById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('city-rituals/status')
  async updateCityRitualsStatus(
    @Body() body: StatsUpdateStatusDto,
    @Req() req,
  ) {
    const userId = req.user?.userId;
    return this.userService.updateCityRitualsStatus(body, userId);
  }
  //--------------------------CITY RITUALS ENDS--------------------------

  // Admin Header List
  @Get('headers')
  @HttpCode(200)
  async getHeaderList() {
    return this.userService.getHeaderList();
  }

  @Get('headers/:id')
  @HttpCode(200)
  async getHeaderById(@Param('id') id: string) {
    return this.userService.getHeaderById(Number(id));
  }

  //--------------------------JOIN US FORM STARTS--------------------------
  @UseGuards(JwtAuthGuard)
  @Post('join-us-form')
  @ApiBody({ type: CreateJoinUsFormDto })
  async upsertJoinUsForm(
    @Req() request: any,
    @Body() body: CreateJoinUsFormDto,
  ) {
    const userId = request.user?.userId;

    return this.userService.upsertJoinUsForm(body, +userId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('join-us-form')
  @HttpCode(200)
  async joinUsForm() {
    return this.userService.joinUsForm();
  }

  @UseGuards(JwtAuthGuard)
  @Get('join-us-form/:id')
  @HttpCode(200)
  async joinUsFormById(@Param('id') id: string) {
    return this.userService.joinUsFormById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('join-us-form/status')
  async updateJoinUsFormStatus(@Body() body: StatsUpdateStatusDto, @Req() req) {
    const userId = req.user?.userId;
    return this.userService.updateJoinUsFormStatus(body, userId);
  }
  //--------------------------JOIN US FORM ENDS--------------------------

  //--------------------------OUR PARTNER STARTS--------------------------

  @UseGuards(JwtAuthGuard)
  @Post('partner-logo/create')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PartnerLogoDto })
  @UseInterceptors(
    FilesInterceptor('images', 20, multerConfig(bannerImageSize)),
  )
  async createPartnerLogo(
    @Req() request: any,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let parsedLogos =
      typeof body.logos === 'string' ? JSON.parse(body.logos) : body.logos;

    // Normalize single object to array
    if (!Array.isArray(parsedLogos)) {
      parsedLogos = [parsedLogos];
    }

    if (!parsedLogos || parsedLogos.length === 0) {
      throw new BadRequestException('Logos data is required');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Images are required');
    }

    if (parsedLogos.length !== files.length) {
      throw new BadRequestException(
        'Number of logos metadata must match number of images',
      );
    }

    // No IDs allowed in create API
    const hasIds = parsedLogos.some((item) => item.id);
    if (hasIds) {
      throw new BadRequestException(
        'ID should not be provided while creating partner logos',
      );
    }

    for (const file of files) {
      if (file.size > bannerImageSize * 1024 * 1024) {
        throw new BadRequestException(
          `Each image must be <= ${bannerImageSize}MB`,
        );
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files allowed');
      }
    }

    const folder = 'partner-logo';
    const userId = request.user?.userId;

    return this.userService.createPartnerLogo(
      parsedLogos,
      files,
      folder,
      userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('partner-logo')
  async updatePartnerLogo(
    @Req() request: any,
    @Body() body: PartnerLogoItemDto[],
  ) {
    if (!body || !Array.isArray(body) || body.length === 0) {
      throw new BadRequestException('Partner data(altText) is required');
    }

    const userId = request.user?.userId;

    return this.userService.updatePartnerLogo(body, userId);
  }

  @Get('partner-logo')
  @HttpCode(200)
  async partnerLogos() {
    return this.userService.partnerLogos();
  }

  @UseGuards(JwtAuthGuard)
  @Get('partner-logo/:id')
  @HttpCode(200)
  async partnerLogoById(@Param('id') id: string) {
    return this.userService.partnerLogoById(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('partner-logo/:id')
  @HttpCode(200)
  async deletePartnerLogo(@Param('id') id: number) {
    return this.userService.deletePartnerLogo(id);
  }

  //--------------------------OUR PARTNER ENDS--------------------------

  //--------------------------UPDATE HEADER STARTS--------------------------

  @UseGuards(JwtAuthGuard)
  @Patch('headers/update/:id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateHeaderDto })
  @UseInterceptors(FileInterceptor('logo', multerConfig(bannerImageSize)))
  async updateHeader(
    @Param('id') id: string,
    @Req() request: any,
    @Body() body: UpdateHeaderDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Logo must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const folder = 'header';

    return this.userService.updateHeader(
      Number(id),
      body,
      file,
      folder,
      +request.user.userId,
    );
  }

  //--------------------------UPDATE HEADER ENDS--------------------------

  //--------------------------FOOTER STARTS--------------------------
  @Get('footers')
  @HttpCode(200)
  async getFooterList() {
    return this.userService.getFooterList();
  }

  @Get('footers/:id')
  @HttpCode(200)
  async getFooterById(@Param('id') id: string) {
    return this.userService.getFooterById(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('footers/update/:id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateFooterDto })
  @UseInterceptors(FileInterceptor('logo', multerConfig(bannerImageSize)))
  async updateFooter(
    @Param('id') id: string,
    @Req() request: any,
    @Body() body: UpdateFooterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file && file.size > bannerImageSize * 1024 * 1024) {
      throw new BadRequestException(`Logo must be <= ${bannerImageSize}MB`);
    }

    if (file && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const folder = 'header';

    return this.userService.updateFooter(
      Number(id),
      body,
      file,
      folder,
      +request.user.userId,
    );
  }

  //--------------------------FOOTER ENDS--------------------------

  //--------------------------SEO TAGS STARTS--------------------------

  @Get('seo')
  @HttpCode(200)
  async getSeo() {
    return this.userService.getSeo();
  }

  @Get('seo/:pageId')
  @HttpCode(200)
  async getSeoData(@Param('pageId') pageId: string) {
    return this.userService.getSeoData(Number(pageId));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('seo/update')
  @HttpCode(200)
  @ApiBody({ type: SeoDto })
  async updateSeoData(@Body() body: SeoDto, @Req() request: any) {
    return this.userService.updateSeoData(body, +request.user.userId);
  }
  //--------------------------SEO TAGS ENDS--------------------------

  //--------------------------SUBSTACK STARTS--------------------------

  @Get('posts')
  async getPosts() {
    const posts = await this.userService.getPosts();

    return {
      status: true,
      message: 'Success',
      data: posts,
    };
  }

  //--------------------------SUBSTACK ENDS--------------------------
}
