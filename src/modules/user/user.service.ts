import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Connection, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ContentMaster } from './entities/content-master.entity';
import { SectionMaster } from './entities/section-master.entity';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { generateSlug, generateStrongPassword } from 'src/utils/utils';
import { BannerDto } from './dto/create-banner.dto';
import { validateBase64Images } from 'src/utils/utils';
import * as fs from 'fs';
import * as path from 'path';
import { CreateStatsDto } from './dto/create-stats.dto';
import { StatsUpdateStatusDto } from './dto/update-stats-status.dto';
import {
  adminEmailTemplate,
  bannerDesciptionImageSize,
} from 'src/constants/constants';
import { JoinUsFormDto } from './dto/joinUs-form.dto';
import { ContactMaster } from './entities/contact-master.entity';
import { GetContactsDto } from './dto/get-join-us-form.dto';
import { SDGAlignmentDto } from './dto/create-sdg-alignment.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageMaster } from './entities/page-master.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { PartnerLogo } from './entities/partner-logo.entity';
import { BlogMaster } from './entities/city-rituals.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { FaqMaster } from './entities/faq.entity';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { rolePageSetionMappingQuery } from 'src/utils/rawQueries';
import { CreateRolePageSectionMappingDto } from './dto/create-role-page-section-mapping.dto';
import { RolePageMapping } from './entities/role-page-section-mapping.entity';
import { Section } from 'src/utils/enums';
import { HeaderMaster } from './entities/header.entity';
import { TheoryOfChangeDto } from './dto/create-theory-of-change.dto';
import { CityRitualsDto } from './dto/create-city-rituals.dto';
import { CreateJoinUsFormDto } from './dto/join-us-form.dto';
import {
  PartnerLogoDto,
  PartnerLogoItemDto,
} from './dto/create-partner-logo.dto';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateFooterDto } from './dto/update-footer.dto';
import { PageSeoKeywordMapping } from './entities/page-seo-keyword-mapping.entity';
import { SeoDto } from './dto/seo-data.dto';
import * as Parser from 'rss-parser';

@Injectable()
export class UserService {
  // ✅ Initialize RSS Parser
  private parser = new Parser();
  private FEED_URL = 'https://nithinkamath.substack.com/feed';
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @InjectRepository(ContentMaster)
    private readonly contentMasterRepository: Repository<ContentMaster>,
    @InjectRepository(SectionMaster)
    private readonly sectionMasterRepository: Repository<SectionMaster>,
    @InjectRepository(ContactMaster)
    private readonly contactMasterRepository: Repository<ContactMaster>,
    @InjectRepository(PageMaster)
    private readonly pageRepository: Repository<PageMaster>,
    @InjectRepository(PartnerLogo)
    private readonly partnerLogoRepository: Repository<PartnerLogo>,
    //City Rituals
    @InjectRepository(BlogMaster)
    private readonly blogMasterRepository: Repository<BlogMaster>,
    // FAQ
    @InjectRepository(FaqMaster)
    private readonly faqRepository: Repository<FaqMaster>,
    private readonly connection: Connection,
    @InjectRepository(RolePageMapping)
    private readonly rolePageMappingRepository: Repository<RolePageMapping>,
    @InjectRepository(HeaderMaster)
    private readonly headerRepository: Repository<HeaderMaster>,
    @InjectRepository(PageSeoKeywordMapping)
    private readonly seoRepository: Repository<PageSeoKeywordMapping>,
  ) {}
  async login(email: string, password: string) {
    try {
      const user: any = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.role', 'rm')
        .where('user.email = :email', { email })
        .getOne();
      if (!user) {
        throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
      }
      if (user.status !== 1) {
        throw new HttpException('Inactive user', HttpStatus.UNAUTHORIZED);
      }
      if (!user.password) {
        throw new HttpException('Password not set', HttpStatus.UNAUTHORIZED);
      }

      const passwordStatus = await bcrypt.compare(password, user.password);
      if (!passwordStatus) {
        throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);
      }

      delete user.password;

      const token = this.jwtService.sign({
        userId: user.id,
        email: user.email,
        roleId: user.role.id,
      });
      return {
        token: token,
        Message: 'Login Successfully',
        data: user,
      };
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async bannerCarousel() {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.alt_img AS altText',
          'cm.title AS title',
          'cm.event AS subTitle',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.button AS button',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: Section.Hero_Section })
        .getRawMany();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async bannerCarouselById(id: string) {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.alt_img AS altText',
          'cm.title AS title',
          'cm.event AS subTitle',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.button AS button',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .getRawOne();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      body,
      html: `${body}`,
    };

    return transporter.sendMail(mailOptions);
  }

  async sendUserCredentialsEmail(
    email: string,
    username: string,
    password: string,
  ) {
    const subject = 'Your Account Credentials';

    const emailBody = `
    <p>Hello,</p>

    <p>Your account has been created successfully.</p>

    <p><b>Username:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>

    <br/>
    <p>Regards,<br/>CAA Team</p>
  `;

    await this.sendEmail(email, subject, emailBody);
  }

  async create(createUserDto: CreateUserDto, userId: number) {
    const { email, fullName, roleId, phone } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('Email already exists');
      }
    }

    const plainPassword = generateStrongPassword(8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      roleId,
      fullName,
      email,
      phone: phone || null,
      password: hashedPassword,
      isEmailSent: 1,
      status: 1,
      createdBy: userId,
    });

    const savedUser = await this.userRepository.save(user);

    await this.sendUserCredentialsEmail(email, fullName, plainPassword);

    return {
      message: 'User created successfully',
      userId: savedUser.id,
    };
  }
  async upsertBanner(
    body: BannerDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      // Validate base64
      validateBase64Images(body.description, bannerDesciptionImageSize);

      let existingBanner = null;
      //  Only check if id exists
      if (body.id) {
        existingBanner = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        //  If id given but not found → error
        if (!existingBanner) {
          throw new BadRequestException('Invalid banner id');
        }
      }
      // ================= SAVE DB FIRST =================
      const banner = this.contentMasterRepository.create({
        id: body.id ? Number(body.id) : undefined,
        title: body.title,
        event: body.subTitle,
        description: body.description,
        button: body.button,
        alt_img: body.altText,
        imageUrl: existingBanner?.imageUrl || '',
        // types: 'carousel',
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existingBanner.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });
      const saved = await this.contentMasterRepository.save(banner);
      // ================= FILE SAVE =================
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const imagePath = `uploads/${folder}/${fileName}`;

        //  Delete old image (only in update)
        if (existingBanner?.imageUrl) {
          const oldPath = path.join(process.cwd(), existingBanner.imageUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.contentMasterRepository.update(saved.id, {
          imageUrl: imagePath,
        });
      }

      return {
        message: body.id
          ? 'Banner updated successfully'
          : 'Banner created successfully',
        id: saved.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateBannerStatus(id: number, status: string, loginUserId: number) {
    try {
      const banner = await this.contentMasterRepository.findOne({
        where: { id },
      });

      if (!banner) {
        throw new NotFoundException('Banner not found');
      }

      // ✅ Check already same state
      if (banner.status == status) {
        let msg = '';

        if (status == '1') msg = 'Banner already enabled';
        if (status === '0') msg = 'Banner already disabled';
        if (status == '2') msg = 'Banner already deleted';

        throw new BadRequestException(msg);
      }

      // ✅ Update status
      banner.status = status;
      banner.updatedBy = loginUserId;

      await this.contentMasterRepository.save(banner);

      return {
        message:
          status == '1'
            ? 'Banner enabled successfully'
            : status == '0'
              ? 'Banner disabled successfully'
              : 'Banner deleted successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async joinUs(dto: JoinUsFormDto) {
    try {
      const { email, name, phone, interestType } = dto;

      const contact = this.contactMasterRepository.create({
        email,
        name,
        phone,
        interestType,
      });

      await this.contactMasterRepository.save(contact);
      //Send EMail Function
      this.sendEmailAfterJoinUsForm(dto);
      return 'Successfully Submitted';
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Send EMail After Join Us Form
  async sendEmailAfterJoinUsForm(dto: any) {
    //
    let html = adminEmailTemplate({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      interest_label: this.getInterestLabel(dto.interestType),
    });
    //get super admin email to send email after join form submission
    const superAdminEmail = (
      await this.userRepository.findOne({
        where: { roleId: 1 },
        select: ['email'],
      })
    )?.email;

    await this.sendEmail(superAdminEmail, 'New Join Us Form Submission', html);
  }
  //Find Interest Label
  getInterestLabel(type: string | number): string {
    switch (Number(type)) {
      case 1:
        return 'Volunteer';
      case 2:
        return 'Collaborate';
      case 3:
        return 'Both';
      default:
        return '';
    }
  }

  async getContacts(
    page: number,
    limit: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      const qb = this.contactMasterRepository.createQueryBuilder('cm');

      // ✅ Date filter
      if (startDate && endDate) {
        qb.andWhere('DATE(cm.createdAt) BETWEEN :startDate AND :endDate', {
          startDate: startDate,
          endDate: endDate,
        });
      }

      // ✅ Total count
      const total = await qb.getCount();

      // ✅ Pagination + sorting
      const data = await qb
        .orderBy('cm.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      // ✅ Transform for UI
      const result = data.map((item) => ({
        id: item.id,
        requestDate: item.createdAt,
        name: item.name,
        email: item.email,
        phone: item.phone,
        interest: this.getInterestLabel(item.interestType),
      }));

      return {
        page,
        limit,
        total,
        data: result,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async stats() {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.title AS title',
          'cm.event AS subTitle',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: 2 })
        // .andWhere('cm.status IN (:...status)', { status: [0, 1] })
        .getRawMany();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async statsById(id: string) {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.title AS title',
          'cm.event AS subTitle',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .andWhere('cm.section_id = :secId', { secId: 2 })
        .getRawOne();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async upsertStats(body: CreateStatsDto, userId: number) {
    try {
      let existingStats = null;

      // Check if updating
      if (body.id) {
        existingStats = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        if (!existingStats) {
          throw new BadRequestException('Invalid stats id');
        }
      }

      // Create or Update object
      const stats = this.contentMasterRepository.create({
        id: body.id ? Number(body.id) : undefined,
        title: body.title,
        description: body.description,
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existingStats.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });

      const savedStats = await this.contentMasterRepository.save(stats);

      return {
        message: body.id
          ? 'Stats updated successfully'
          : 'Stats created successfully',
        id: savedStats.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateStatsStatus(body: StatsUpdateStatusDto, userId: number) {
    try {
      const existingStats = await this.contentMasterRepository.findOne({
        where: { id: body.id },
      });

      if (!existingStats) {
        throw new BadRequestException('Stats not found');
      }

      const currentStatus = Number(existingStats.status);
      const newStatus = body.status;

      if (currentStatus === newStatus) {
        return {
          message:
            newStatus === 2
              ? 'Stats already deleted'
              : newStatus === 1
                ? 'Stats already active'
                : 'Stats already inactive',
        };
      }

      existingStats.status = String(body.status);
      existingStats.updatedBy = userId;

      await this.contentMasterRepository.save(existingStats);

      return {
        message:
          body.status === 2
            ? 'Stats deleted successfully'
            : body.status === 1
              ? 'Stats activated successfully'
              : 'Stats deactivated successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async pageCreate(dto: CreatePageDto, userId: number) {
    try {
      const page = this.pageRepository.create({
        ...dto,
        createdBy: userId,
      });

      return await this.pageRepository.save(page);
    } catch (error) {
      throw error;
    }
  }

  async pageUpdate(id: number, dto: UpdatePageDto, userId: number) {
    try {
      const page = await this.pagefindOne(id);

      Object.assign(page, {
        ...dto,
        updatedBy: userId,
      });

      return await this.pageRepository.save(page);
    } catch (error) {
      throw error;
    }
  }

  // ✅ GET ALL
  async pagefindAll() {
    try {
      return await this.pageRepository.find({
        relations: ['parent', 'children'],
        order: { id: 'DESC' },
      });
    } catch (error) {
      throw error;
    }
  }

  // ✅ GET ONE
  async pagefindOne(id: number) {
    try {
      const page = await this.pageRepository.findOne({
        where: { id },
        relations: ['parent', 'children'],
      });

      if (!page) {
        throw new NotFoundException('Page not found');
      }

      return page;
    } catch (error) {
      throw error;
    }
  }

  // GET Section List By Page Id

  async getSectionsWithCount(pageId: number) {
    try {
      const sections = await this.sectionMasterRepository.find({
        where: { page_id: pageId, status: '1' },
        order: { priority: 'ASC' },
      });

      // ✅ content_master counts
      const contentCounts = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .select('cm.section_id', 'section_id')
        .addSelect('COUNT(*)', 'count')
        .where('cm.page_id = :pageId', { pageId })
        .andWhere('cm.status = :status', { status: 1 })
        .groupBy('cm.section_id')
        .getRawMany();

      const contentMap = new Map(
        contentCounts.map((c) => [c.section_id, Number(c.count)]),
      );

      //  partner_logo count
      const partnerCount = await this.partnerLogoRepository.count({
        where: { status: 1 },
      });

      //  faq count
      // const faqCount = await this.faqRepository.count({
      //   where: { status: 1 },
      // });

      // City Rituals/Blog count
      const cityRitualsCount = await this.blogMasterRepository.count({
        where: { status: 1 },
      });

      // ✅ central mapping
      const specialSectionMap: Record<string, number> = {
        'our-partners': partnerCount, // slug-name : variableName
        // // faq: faqCount,
        // city-rituals:cityRitualsCount
      };

      const result = sections.map((section) => {
        const count =
          specialSectionMap[section.slug] ?? contentMap.get(section.id) ?? 0;

        return {
          id: section.id,
          name: section.name,
          slug: section.slug,
          total_count: count,
        };
      });

      return result;
    } catch (err: any) {
      throw new HttpException(
        err.message || 'Failed to fetch sections',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async sectionDetailsBySectionId(sectionId: number) {
    try {
      // ✅ get section details
      const section = await this.sectionMasterRepository.findOne({
        where: { id: sectionId },
      });

      if (!section) {
        throw new HttpException('Section not found', HttpStatus.NOT_FOUND);
      }

      let data: any[] = [];

      //  Partners Section
      if (section.slug === 'our-partners') {
        data = await this.partnerLogoRepository.find({
          where: { status: 1 },
          order: { id: 'DESC' },
        });
      }

      //  FAQ Section
      // else if (section.slug === 'faq') {
      //   data = await this.faqRepository.find({
      //     where: { status: 1 },
      //     order: { id: 'DESC' },
      //   });
      // }

      //  City Rituals/Blog Section
      else if (section.slug === 'city-rituals') {
        data = await this.blogMasterRepository.find({
          where: { status: 1 },
          order: { id: 'DESC' },
        });
      }

      // ✅ Default → content_master
      else {
        data = await this.contentMasterRepository.find({
          where: {
            section_id: sectionId,
            page_id: section.page_id,
            status: '1',
          },
          order: { id: 'DESC' },
        });
      }

      return {
        section: {
          id: section.id,
          name: section.name,
          slug: section.slug,
        },
        data,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Failed to fetch section data',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSection(dto: CreateSectionDto, loginUserId: number) {
    try {
      const { pageId, name, priority } = dto;

      // ✅ Generate slug automatically
      const slug = generateSlug(name);

      // ✅ Duplicate check (name)
      const existing = await this.sectionMasterRepository
        .createQueryBuilder('sm')
        .where('sm.page_id = :page_id AND LOWER(sm.name) = LOWER(:name)', {
          page_id: dto.pageId,
          name: dto.name,
        })
        .getOne();

      if (existing) {
        throw new HttpException(
          'Section name already exists for this page',
          HttpStatus.BAD_REQUEST,
        );
      }

      // ✅ Save
      const section = this.sectionMasterRepository.create({
        page_id: pageId,
        name,
        slug,
        priority,
        createdBy: loginUserId,
      });

      const created = await this.sectionMasterRepository.save(section);
      return {
        message: 'Section created successfully',
        data: created,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Failed to create section',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSection(
    dto: UpdateSectionDto,
    loginUserId: number,
    sectionId: number,
  ) {
    try {
      const { name, pageId, priority } = dto;

      //  Check section exists
      const section = await this.sectionMasterRepository.findOne({
        where: { id: sectionId },
      });

      if (!section) {
        throw new HttpException('Section not found', HttpStatus.NOT_FOUND);
      }

      const existing = await this.sectionMasterRepository
        .createQueryBuilder('sm')
        .where(
          'sm.page_id = :page_id AND LOWER(sm.name) = LOWER(:name) AND sm.id != :id',
          {
            page_id: dto.pageId,
            name: name,
            id: sectionId,
          },
        )
        .getOne();

      if (existing) {
        throw new HttpException(
          'Section name already exists ',
          HttpStatus.BAD_REQUEST,
        );
      }

      // ✅ Update user
      section.name = name;
      section.priority = priority;
      section.updatedBy = loginUserId;

      const updated = await this.sectionMasterRepository.save(section);

      return {
        message: 'Section updated successfully',
        data: updated,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Failed to update section',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSectionStatus(id: number, status: string, loginUserId: number) {
    try {
      const section = await this.sectionMasterRepository.findOne({
        where: { id },
      });

      if (!section) {
        throw new NotFoundException('Section not found');
      }

      // ✅ Check already same status
      if (section.status == status) {
        let msg = '';

        if (status == '1') msg = 'Section already enabled';
        if (status === '0') msg = 'Section already disabled';
        if (status == '2') msg = 'Section already deleted';

        throw new BadRequestException(msg);
      }

      // ✅ Update status
      section.status = status;
      section.updatedBy = loginUserId;

      await this.sectionMasterRepository.save(section);

      return {
        message:
          status == '1'
            ? 'Section enabled successfully'
            : status == '0'
              ? 'Section disabled successfully'
              : 'Section deleted successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  // FAQ Section
  async faqCreate(dto: CreateFaqDto, userId: number) {
    try {
      const faq = this.faqRepository.create({
        ...dto,
        createdBy: userId,
      });

      return await this.faqRepository.save(faq);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  async faqList() {
    return await this.faqRepository.find({
      order: { id: 'DESC' },
    });
  }

  async faqDetail(id: number) {
    const faq = await this.faqRepository.findOne({ where: { id } });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    return faq;
  }

  async faqUpdate(id: number, dto: UpdateFaqDto, userId: number) {
    const faq = await this.faqDetail(id);

    Object.assign(faq, {
      ...dto,
      updatedBy: userId,
    });

    return await this.faqRepository.save(faq);
  }

  async faqDelete(id: number) {
    const faq = await this.faqDetail(id);

    await this.faqRepository.remove(faq);

    return { message: 'FAQ deleted successfully' };
  }

  //--------------------------SDG ALIGNMENT STARTS--------------------------

  async upsertSdgAlignment(
    body: SDGAlignmentDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      let existing = null;

      if (body.id) {
        existing = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        if (!existing) {
          throw new BadRequestException('Invalid SDG alignment id');
        }
      }

      const sdg = this.contentMasterRepository.create({
        id: body.id ? body.id : undefined,
        title: body.title,
        description: body.description,
        alt_img: body.altText,
        imageUrl: existing?.imageUrl || '',
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existing.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });

      const saved = await this.contentMasterRepository.save(sdg);

      // ================= FILE SAVE =================
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const imagePath = `uploads/${folder}/${fileName}`;

        // Delete old image
        if (existing?.imageUrl) {
          const oldPath = path.join(process.cwd(), existing.imageUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.contentMasterRepository.update(saved.id, {
          imageUrl: imagePath,
        });
      }

      return {
        message: body.id
          ? 'SDG Alignment updated successfully'
          : 'SDG Alignment created successfully',
        id: saved.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async sdgAlignment() {
    try {
      const sdgCards = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.description AS description',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: Section.SDG_Alignment })
        .getRawMany();
      return sdgCards;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async sdgAlignmentById(id: string) {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.description AS description',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .andWhere('cm.section_id = :secId', { secId: Section.SDG_Alignment })
        .getRawOne();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateSDGAlignmentStatus(body: StatsUpdateStatusDto, userId: number) {
    try {
      const existingStats = await this.contentMasterRepository.findOne({
        where: { id: body.id },
      });

      if (!existingStats) {
        throw new BadRequestException('SDG Alignment not found');
      }

      const currentStatus = Number(existingStats.status);
      const newStatus = body.status;

      if (currentStatus === newStatus) {
        return {
          message:
            newStatus === 2
              ? 'SDG Alignment already deleted'
              : newStatus === 1
                ? 'SDG Alignment already active'
                : 'SDG Alignment already inactive',
        };
      }

      existingStats.status = String(body.status);
      existingStats.updatedBy = userId;

      await this.contentMasterRepository.save(existingStats);

      return {
        message:
          body.status === 2
            ? 'SDG Alignment deleted successfully'
            : body.status === 1
              ? 'SDG Alignment activated successfully'
              : 'SDG Alignment deactivated successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //--------------------------SDG ALIGNMENT ENDS--------------------------

  async getRolePageSetionMapping() {
    const rawData = await this.connection.query(rolePageSetionMappingQuery);

    const pages = [];

    for (const row of rawData) {
      let page = pages.find((p) => p.pageId === row.pageId);

      if (!page) {
        page = {
          pageId: row.pageId,
          pageName: row.pageName,
          sections: [],
          roles: [], // ✅ add this
        };
        pages.push(page);
      }

      // ✅ CASE 1: Page has NO section
      if (!row.sectionId) {
        // avoid duplicate roles
        const alreadyExists = page.roles.find((r) => r.roleId === row.roleId);

        if (!alreadyExists) {
          page.roles.push({
            roleId: row.roleId,
            roleName: row.roleName,
            checked: !!row.mappingId,
          });
        }

        continue;
      }

      // ✅ CASE 2: Page HAS sections
      let section = page.sections.find((s) => s.sectionId === row.sectionId);

      if (!section) {
        section = {
          sectionId: row.sectionId,
          sectionName: row.sectionName,
          roles: [],
        };
        page.sections.push(section);
      }

      section.roles.push({
        roleId: row.roleId,
        roleName: row.roleName,
        checked: !!row.mappingId,
      });
    }

    // ✅ CLEANUP: remove empty roles if sections exist
    for (const page of pages) {
      if (page.sections.length > 0) {
        delete page.roles;
      }
    }

    return pages;
  }

  async rolePageSectionMapping(
    createRolePageSectionMappingDto: CreateRolePageSectionMappingDto,
    user: any,
  ) {
    try {
      const { mappings } = createRolePageSectionMappingDto;

      const response = [];

      for (const item of mappings) {
        const { roleId, pageId, sectionId } = item;

        const section = await this.sectionMasterRepository.findOne({
          where: { id: Number(sectionId), status: '1' },
        });

        if (!section) {
          response.push({
            roleId,
            pageId,
            sectionId,
            message: 'Section not found',
          });
          continue;
        }

        const existingMapping = await this.rolePageMappingRepository.findOne({
          where: {
            roleId: Number(roleId),
            pageId: Number(pageId),
            sectionId: Number(sectionId),
          },
        });

        if (existingMapping) {
          await this.rolePageMappingRepository.remove(existingMapping);
          response.push({
            roleId,
            pageId,
            sectionId,
            message: 'Unmapped Successfully',
          });
        } else {
          const newMapping = this.rolePageMappingRepository.create({
            roleId: +roleId,
            pageId: +pageId,
            sectionId: +sectionId,
            createdBy: user.userId,
          });

          await this.rolePageMappingRepository.save(newMapping);

          response.push({
            roleId,
            pageId,
            sectionId,
            message: 'Mapped Successfully',
          });
        }
      }

      return {
        message: 'Processed Successfully',
        data: response,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //--------------------------THEORY OF CHANGE STARTS--------------------------

  async upsertTheoryOfChange(
    body: TheoryOfChangeDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      let existing = null;

      if (body.id) {
        existing = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        if (!existing) {
          throw new BadRequestException('Invalid theory-of-change id');
        }
      }

      const toc = this.contentMasterRepository.create({
        id: body.id ? body.id : undefined,
        title: body.title,
        description: body.description,
        alt_img: body.altText,
        imageUrl: existing?.imageUrl || '',
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existing.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });

      const saved = await this.contentMasterRepository.save(toc);

      // ================= FILE SAVE =================
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const imagePath = `uploads/${folder}/${fileName}`;

        // Delete old image
        if (existing?.imageUrl) {
          const oldPath = path.join(process.cwd(), existing.imageUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.contentMasterRepository.update(saved.id, {
          imageUrl: imagePath,
        });
      }

      return {
        message: body.id
          ? 'Theory of Change updated successfully'
          : 'Theory of Change created successfully',
        id: saved.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async theoryOfChange() {
    try {
      const tocCards = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.description AS description',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: Section.Theory_Of_Change })
        .getRawMany();
      return tocCards;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async theoryOfChangeById(id: string) {
    try {
      const toc = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.description AS description',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .andWhere('cm.section_id = :secId', { secId: Section.Theory_Of_Change })
        .getRawOne();
      return toc;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateTheoryOfChangeStatus(body: StatsUpdateStatusDto, userId: number) {
    try {
      const existingStats = await this.contentMasterRepository.findOne({
        where: { id: body.id },
      });

      if (!existingStats) {
        throw new BadRequestException('Theory of Change not found');
      }

      const currentStatus = Number(existingStats.status);
      const newStatus = body.status;

      if (currentStatus === newStatus) {
        return {
          message:
            newStatus === 2
              ? 'Theory of Change already deleted'
              : newStatus === 1
                ? 'Theory of Change already active'
                : 'Theory of Change already inactive',
        };
      }

      existingStats.status = String(body.status);
      existingStats.updatedBy = userId;

      await this.contentMasterRepository.save(existingStats);

      return {
        message:
          body.status === 2
            ? 'Theory of Change deleted successfully'
            : body.status === 1
              ? 'Theory of Change activated successfully'
              : 'Theory of Change deactivated successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //--------------------------THEORY OF CHANGE ENDS--------------------------

  //--------------------------CITY RITUALS STARTS--------------------------
  async upsertCityRituals(
    body: CityRitualsDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      let existing = null;

      if (body.id) {
        existing = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        if (!existing) {
          throw new BadRequestException('Invalid city-rituals id');
        }
      }

      const toc = this.contentMasterRepository.create({
        id: body.id ? body.id : undefined,
        title: body.title,
        event: body.venue,
        name: body.date,
        videoUrl: body.time,
        description: body.description,
        alt_img: body.altText,
        imageUrl: existing?.imageUrl || '',
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existing.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });

      const saved = await this.contentMasterRepository.save(toc);

      // ================= FILE SAVE =================
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const imagePath = `uploads/${folder}/${fileName}`;

        // Delete old image
        if (existing?.imageUrl) {
          const oldPath = path.join(process.cwd(), existing.imageUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.contentMasterRepository.update(saved.id, {
          imageUrl: imagePath,
        });
      }

      return {
        message: body.id
          ? 'City Rituals updated successfully'
          : 'City Rituals created successfully',
        id: saved.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async cityRituals() {
    try {
      const tocCards = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.description AS description',
          'cm.event AS venue',
          'cm.name AS date',
          'cm.videoUrl time',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: Section.City_Rituals })
        .getRawMany();
      return tocCards;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async cityRitualsById(id: string) {
    try {
      const toc = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', cm.imageUrl), '') AS imageUrl`,
          'cm.title AS title',
          'cm.event AS venue',
          'cm.name AS date',
          'cm.videoUrl time',
          'cm.description AS description',
          'cm.alt_img AS altText',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .andWhere('cm.section_id = :secId', { secId: Section.City_Rituals })
        .getRawOne();
      return toc;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateCityRitualsStatus(body: StatsUpdateStatusDto, userId: number) {
    try {
      const existingStats = await this.contentMasterRepository.findOne({
        where: { id: body.id },
      });

      if (!existingStats) {
        throw new BadRequestException('City Rituals not found');
      }

      const currentStatus = Number(existingStats.status);
      const newStatus = body.status;

      if (currentStatus === newStatus) {
        return {
          message:
            newStatus === 2
              ? 'City Rituals already deleted'
              : newStatus === 1
                ? 'City Rituals already active'
                : 'City Rituals already inactive',
        };
      }

      existingStats.status = String(body.status);
      existingStats.updatedBy = userId;

      await this.contentMasterRepository.save(existingStats);

      return {
        message:
          body.status === 2
            ? 'City Rituals deleted successfully'
            : body.status === 1
              ? 'City Rituals activated successfully'
              : 'City Rituals deactivated successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  //--------------------------CITY RITUALS ENDS--------------------------

  async getHeaderList() {
    try {
      const headers = await this.headerRepository.find({
        where: { isHeader: 1 },
        order: { priority: 'ASC' },
      });

      const baseUrl = process.env.FILE_BASE_URL || '';

      const buildTree = (parentId: number = 0) => {
        return headers
          .filter((h) => h.parentId === parentId)
          .map((h) => {
            const children = buildTree(h.id);
            return {
              ...h,
              logo: h.logo ? `${baseUrl}${h.logo}` : null,
              children: children,
            };
          });
      };

      return buildTree(0);
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getHeaderById(id: number) {
    try {
      const header = await this.headerRepository.findOne({
        where: { id },
      });

      if (!header) {
        throw new NotFoundException('Header not found');
      }

      const baseUrl = process.env.FILE_BASE_URL || '';

      // return header;
      return {
        ...header,
        logo: header.logo ? `${baseUrl}${header.logo}` : null,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //--------------------------JOIN US FORM STARTS--------------------------

  async upsertJoinUsForm(body: CreateJoinUsFormDto, userId: number) {
    try {
      let existingStats = null;

      // Check if updating
      if (body.id) {
        existingStats = await this.contentMasterRepository.findOne({
          where: { id: body.id },
        });

        if (!existingStats) {
          throw new BadRequestException('Invalid Join Us id');
        }
      }

      // Create or Update object
      const joinUsCards = this.contentMasterRepository.create({
        id: body.id ? Number(body.id) : undefined,
        title: body.title,
        description: body.description,
        status: '1',
        page_id: body.pageId,
        section_id: body.sectionId,
        createdBy: body.id ? existingStats.createdBy : userId,
        updatedBy: body.id ? userId : null,
      });

      const savedStats = await this.contentMasterRepository.save(joinUsCards);

      return {
        message: body.id
          ? 'Join Us updated successfully'
          : 'Join Us created successfully',
        id: savedStats.id,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async joinUsForm() {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.title AS title',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.section_id = :id', { id: Section.Join_Us_Form })
        .getRawMany();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async joinUsFormById(id: string) {
    try {
      const banner = await this.contentMasterRepository
        .createQueryBuilder('cm')
        .innerJoin(SectionMaster, 'sm', 'sm.id = cm.section_id')
        .select([
          'cm.id AS id',
          'cm.title AS title',
          'cm.description AS description',
          'cm.page_Id AS pageId',
          'cm.section_Id AS sectionId',
          'sm.slug AS slug',
        ])
        .where('cm.id = :id', { id })
        .andWhere('cm.section_id = :secId', { secId: Section.Join_Us_Form })
        .getRawOne();
      return banner;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateJoinUsFormStatus(body: StatsUpdateStatusDto, userId: number) {
    try {
      const existingStats = await this.contentMasterRepository.findOne({
        where: { id: body.id },
      });

      if (!existingStats) {
        throw new BadRequestException('Join Us Card not found');
      }

      const currentStatus = Number(existingStats.status);
      const newStatus = body.status;

      if (currentStatus === newStatus) {
        return {
          message:
            newStatus === 2
              ? 'Join Us Card already deleted'
              : newStatus === 1
                ? 'Join Us Card already active'
                : 'Join Us Card already inactive',
        };
      }

      existingStats.status = String(body.status);
      existingStats.updatedBy = userId;

      await this.contentMasterRepository.save(existingStats);

      return {
        message:
          body.status === 2
            ? 'Join Us Card deleted successfully'
            : body.status === 1
              ? 'Join Us Card activated successfully'
              : 'Join Us Card deactivated successfully',
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  //--------------------------JOIN US FORM ENDS--------------------------

  //--------------------------OUR PARTNER STARTS--------------------------

  async createPartnerLogo(
    logos: PartnerLogoItemDto[],
    files: Express.Multer.File[],
    folder: string,
    userId: number,
  ) {
    try {
      const response = [];

      const uploadPath = path.join(process.cwd(), 'uploads', folder);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      for (let i = 0; i < logos.length; i++) {
        const item = logos[i];
        const file = files[i];

        if (!file) {
          throw new BadRequestException(
            `Image missing for logo at position ${i + 1}`,
          );
        }

        // Generate file name
        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          '-' +
          i +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const imagePath = `uploads/${folder}/${fileName}`;

        // Save DB
        const partner = this.partnerLogoRepository.create({
          alt_img: item.altText,
          img_url: imagePath,
          status: 1,
          created_by: userId,
          updated_by: 0,
        });

        const savedPartner = await this.partnerLogoRepository.save(partner);

        response.push({
          id: savedPartner.id,
          message: 'Partner logo created successfully',
        });
      }

      return {
        message: 'Partner logos created successfully',
        data: response,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updatePartnerLogo(logos: PartnerLogoItemDto[], userId: number) {
    try {
      const response = [];

      for (const item of logos) {
        const existingPartner = await this.partnerLogoRepository.findOne({
          where: { id: Number(item.id) },
        });

        if (!existingPartner) {
          throw new BadRequestException(
            `Partner logo not found for id: ${item.id}`,
          );
        }

        existingPartner.alt_img = item.altText;
        existingPartner.updated_by = userId;

        await this.partnerLogoRepository.save(existingPartner);

        response.push({
          id: existingPartner.id,
          message: 'Partner logo updated successfully',
        });
      }

      return {
        message: 'Partner logos updated successfully',
        data: response,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async partnerLogos() {
    try {
      const partners = await this.partnerLogoRepository
        .createQueryBuilder('pl')
        .select([
          'pl.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', pl.img_url), '') AS imageUrl`,
          'pl.alt_img AS altText',
          'pl.status AS status',
        ])
        .where('pl.status IN (:...status)', { status: [0, 1] })
        .getRawMany();

      return partners;
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Failed to fetch partner logos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async partnerLogoById(id: number) {
    try {
      const partner = await this.partnerLogoRepository
        .createQueryBuilder('pl')
        .select([
          'pl.id AS id',
          `IFNULL(CONCAT('${process.env.FILE_BASE_URL}', pl.img_url), '') AS imageUrl`,
          'pl.alt_img AS altText',
          'pl.status AS status',
        ])
        .where('pl.id = :id', { id })
        .getRawOne();

      if (!partner) {
        throw new NotFoundException('Partner logo data not found');
      }

      return partner;
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Failed to fetch partner logo',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deletePartnerLogo(id: number) {
    try {
      const existingPartner = await this.partnerLogoRepository.findOne({
        where: { id: Number(id) },
      });

      if (!existingPartner) {
        throw new BadRequestException('Partner logo data not found');
      }

      if (existingPartner.img_url) {
        const oldPath = path.join(process.cwd(), existingPartner.img_url);

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      await this.partnerLogoRepository.delete(existingPartner.id);

      return {
        message: 'Partner logo deleted successfully',
        id: existingPartner.id,
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //--------------------------OUR PARTNER ENDS--------------------------

  //--------------------------UPDATE HEADER STARTS--------------------------

  async updateHeader(
    id: number,
    body: UpdateHeaderDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      const existingHeader = await this.headerRepository.findOne({
        where: { id },
      });

      if (!existingHeader) {
        throw new BadRequestException('Invalid header id');
      }

      // Update DB fields first
      const updatedHeader = this.headerRepository.create({
        ...existingHeader,
        id,
        name: body.name ?? existingHeader.name,
        // description: body.description ?? existingHeader.description,
        createdAt: existingHeader.createdAt,
        updatedAt: new Date(),
      });

      const saved = await this.headerRepository.save(updatedHeader);

      // Handle logo upload
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const logoPath = `uploads/${folder}/${fileName}`;

        // Delete old logo if exists
        if (existingHeader.logo) {
          const oldPath = path.join(process.cwd(), existingHeader.logo);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.headerRepository.update(saved.id, {
          logo: logoPath,
        });

        saved.logo = logoPath;
      }

      const baseUrl = process.env.FILE_BASE_URL || '';

      return {
        message: 'Header updated successfully',
        id: saved.id,
        data: {
          ...saved,
          logo: saved.logo ? `${baseUrl}${saved.logo}` : null,
        },
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  //--------------------------UPDATE HEADER ENDS--------------------------

  //--------------------------FOOTER STARTS--------------------------

  async getFooterList() {
    try {
      const footers = await this.headerRepository.find({
        where: { IsFooter: 1 },
        order: { footerPriority: 'ASC' },
      });

      const baseUrl = process.env.FILE_BASE_URL || '';

      // Build tree structure with children
      const buildTree = (parentId: number = 0) => {
        return footers
          .filter((h) => h.parentId === parentId)
          .map((h) => {
            const children = buildTree(h.id);

            return {
              ...h,
              logo: h.logo ? `${baseUrl}${h.logo}` : null,
              children,
            };
          });
      };

      const footerTree = buildTree(0);

      // Helper function to flatten tree for grouping
      const flattenTree = (items: any[]): any[] => {
        let result = [];

        for (const item of items) {
          result.push(item);

          if (item.children && item.children.length > 0) {
            result = result.concat(flattenTree(item.children));
          }
        }

        return result;
      };

      const allFooters = flattenTree(footerTree);

      return {
        contactUs: allFooters.filter((item) =>
          ['phone-number', 'email'].includes(item.slug),
        ),

        footerLogo:
          allFooters.find((item) => item.slug === 'footer-logo') || null,

        footerLinks: allFooters.filter((item) =>
          [
            'podcast',
            'newsletter',
            'join-us',
            'contact-us',
            'faq',
            'about-us',
          ].includes(item.slug),
        ),

        socialMedia: allFooters.filter((item) =>
          ['yt', 'insta', 'whatsapp'].includes(item.slug),
        ),
        copyright: allFooters.filter((item) => item.slug === 'copyright'),
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getFooterById(id: number) {
    try {
      const header = await this.headerRepository.findOne({
        where: { id },
      });

      if (!header) {
        throw new NotFoundException('Header not found');
      }

      const baseUrl = process.env.FILE_BASE_URL || '';

      // return header;
      return {
        ...header,
        logo: header.logo ? `${baseUrl}${header.logo}` : null,
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateFooter(
    id: number,
    body: UpdateFooterDto,
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ) {
    try {
      const existingFooter = await this.headerRepository.findOne({
        where: { id, IsFooter: 1 },
      });

      if (!existingFooter) {
        throw new BadRequestException('Invalid footer id');
      }

      // Update footer fields
      const updatedFooter = this.headerRepository.create({
        ...existingFooter,
        id,
        name: body.name ?? existingFooter.name,
        description: body.description ?? existingFooter.description,
        url: body.url ?? existingFooter.url,
        createdAt: existingFooter.createdAt,
        updatedAt: new Date(),
      });

      const saved = await this.headerRepository.save(updatedFooter);

      // Handle logo upload
      if (file) {
        const uploadPath = path.join(process.cwd(), 'uploads', folder);

        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          path.extname(file.originalname);

        const fullPath = path.join(uploadPath, fileName);

        fs.writeFileSync(fullPath, file.buffer);

        const logoPath = `uploads/${folder}/${fileName}`;

        // Delete old logo
        if (existingFooter.logo) {
          const oldPath = path.join(process.cwd(), existingFooter.logo);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        await this.headerRepository.update(saved.id, {
          logo: logoPath,
        });

        saved.logo = logoPath;
      }

      const baseUrl = process.env.FILE_BASE_URL || '';

      return {
        message: 'Footer updated successfully',
        id: saved.id,
        data: {
          ...saved,
          logo: saved.logo ? `${baseUrl}${saved.logo}` : null,
        },
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  //--------------------------FOOTER ENDS--------------------------

  //--------------------------SEO TAGS STARTS--------------------------

  async getSeo() {
    try {
      const seoData = await this.seoRepository.find();

      return seoData;
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getSeoData(pageId: number) {
    try {
      if (!pageId) {
        throw new BadRequestException('Page id is required');
      }

      const seoData = await this.seoRepository.findOne({
        where: { page_id: pageId },
      });

      if (!seoData) {
        throw new NotFoundException('SEO data not found');
      }

      return {
        ...seoData,
        keywords: seoData.keywords ? seoData.keywords.split(',') : [],
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSeoData(body: SeoDto, userId: number) {
    try {
      const existingSeo = await this.seoRepository.findOne({
        where: { page_id: body.pageId },
      });

      if (!existingSeo) {
        throw new NotFoundException('SEO data not found');
      }

      const updatedSeo = this.seoRepository.create({
        ...existingSeo,
        title: body.title ?? existingSeo.title,
        description: body.description ?? existingSeo.description,
        keywords: body.keywords?.length
          ? body.keywords.join(',')
          : existingSeo.keywords,
        updated_at: new Date(),
        updated_by: userId,
      });

      const saved = await this.seoRepository.save(updatedSeo);

      return {
        message: 'SEO data updated successfully',
        data: {
          ...saved,
          keywords: saved.keywords ? saved.keywords.split(',') : [],
        },
      };
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(
        err.message || 'Something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  //--------------------------SEO TAGS ENDS--------------------------

  async getPosts() {
    try {
      const feed = await this.parser.parseURL(
        `${process.env.SUBSTACK_SUBSCRIPTION_URL}feed?t=${Date.now()}`,
      );

      const posts = feed.items.map((item) => {
        const htmlContent = item['content:encodedSnippet'] || '';

        return {
          title: item.title,
          link: item.link,
          description: item.contentSnippet,
          content: this.cleanHtml(htmlContent),
          image: item.enclosure?.url || this.extractImage(htmlContent) || null,
          author: item.creator || item['dc:creator'] || 'Unknown',
          pubDate: item.pubDate,
          hasVideo: this.hasVideo(htmlContent),
        };
      });

      return {
        subscribeLink: process.env.SUBSTACK_SUBSCRIPTION_URL || '',
        posts,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch Substack posts',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Remove unwanted HTML (video, subscribe, gallery)
  cleanHtml(html: string): string {
    if (!html) return '';

    return (
      html
        // remove video block
        .replace(/<div class="native-video-embed[\s\S]*?<\/div>/g, '')

        // remove subscription widget
        .replace(/<div class="subscription-widget[\s\S]*?<\/div>/g, '')

        // remove gallery
        .replace(/<div class="image-gallery-embed[\s\S]*?<\/div>/g, '')

        // remove scripts
        .replace(/<script[\s\S]*?<\/script>/g, '')

        // remove inline styles
        .replace(/style="[^"]*"/g, '')

        .trim()
    );
  }

  // Extract image if enclosure not present
  extractImage(content: string): string | null {
    const match = content?.match(/<img.?src="(.?)"/);
    return match ? match[1] : null;
  }

  // Detect video in post
  hasVideo(content: string): boolean {
    return content?.includes('native-video-embed');
  }

  //--------------------------SUBSTACK ENDS--------------------------
}
