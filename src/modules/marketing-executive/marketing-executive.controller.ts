import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiConsumes, ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { promises as fs } from 'fs';
import { MarketingExecutiveService } from './marketing-executive.service';
import { CreateMarketingExecutiveLeadDto } from './dto/create-marketing-executive-lead.dto';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { Request } from 'express';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

@ApiTags('Marketing Executive')
@UseGuards(JwtAuthGuard)
@Controller('marketing-executive')
export class MarketingExecutiveController {
  constructor(
    private readonly marketingExecutiveService: MarketingExecutiveService,
  ) {}

  @Post('leads')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aadharCardFront', maxCount: 1 },
        { name: 'electricityBill', maxCount: 1 },
        { name: 'customerPhotograph', maxCount: 1 },
        { name: 'aadharCardBack', maxCount: 1 },
        { name: 'cancelCheque', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/marketingExecutive',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: MAX_FILE_SIZE,
        },
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return callback(
              new BadRequestException(
                'Only image files (png/jpeg/jpg) are allowed!',
              ),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  async createLead(
    @Req() req: Request,
    @Body() createDto: CreateMarketingExecutiveLeadDto,
    @UploadedFiles()
    files: {
      aadharCardFront?: Express.Multer.File[];
      electricityBill?: Express.Multer.File[];
      customerPhotograph?: Express.Multer.File[];
      aadharCardBack?: Express.Multer.File[];
      cancelCheque?: Express.Multer.File[];
    },
  ) {
    try {
      const user = (req as any).user;
      const userId = user?.userId || user?.id || user?.sub;
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }
      return await this.marketingExecutiveService.createLead(
        createDto,
        files,
        userId,
      );
    } catch (error) {
      if (files) {
        const allFiles = [
          ...(files.aadharCardFront || []),
          ...(files.electricityBill || []),
          ...(files.customerPhotograph || []),
          ...(files.aadharCardBack || []),
          ...(files.cancelCheque || []),
        ];
        for (const file of allFiles) {
          try {
            await fs.unlink(file.path);
          } catch (e) {
            // ignore unlink errors
          }
        }
      }
      throw error;
    }
  }

  @Get('leads-matrix')
  async getLeadsMatrix(@Req() req: any) {
    return await this.marketingExecutiveService.getLeadsWithMetricsAndDocs(
      req.user.userId,
    );
  }

  @Get('timeline/:leadId')
  async getTimeline(@Param('leadId', ParseIntPipe) leadId: number) {
    return await this.marketingExecutiveService.getLeadTimeline(leadId);
  }

  @Get(':leadId/gallery')
  async getLeadGallery(@Param('leadId', ParseIntPipe) leadId: number) {
    return await this.marketingExecutiveService.getGroupedGallery(leadId);
  }

  @Get('test')
  async test() {
    return '3';
  }
}
