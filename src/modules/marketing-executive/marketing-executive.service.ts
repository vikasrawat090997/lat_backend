import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingExecutiveLead } from './entities/marketing-executive-lead.entity';
import { CreateMarketingExecutiveLeadDto } from './dto/create-marketing-executive-lead.dto';
import { LeadStatus } from '../../utils/enums';

@Injectable()
export class MarketingExecutiveService {
  constructor(
    @InjectRepository(MarketingExecutiveLead)
    private leadRepository: Repository<MarketingExecutiveLead>,
  ) { }

  async createLead(
    createDto: CreateMarketingExecutiveLeadDto,
    files: {
      aadharCardFront?: Express.Multer.File[];
      electricityBill?: Express.Multer.File[];
      customerPhotograph?: Express.Multer.File[];
      aadharCardBack?: Express.Multer.File[];
      cancelCheque?: Express.Multer.File[];
    },
    userId: string,
  ) {
    try {
      const { fullName, phoneNumber, address } = createDto;

      const documentsToSave = [];

      if (files?.aadharCardFront?.length) {
        documentsToSave.push({
          documentTypeId: '1', // Aadhar Front
          documentUrl: files.aadharCardFront[0].path.replace(/\\/g, '/'),
          originalName: files.aadharCardFront[0].originalname,
        });
      }

      if (files?.electricityBill?.length) {
        documentsToSave.push({
          documentTypeId: '2', // Electricity Bill
          documentUrl: files.electricityBill[0].path.replace(/\\/g, '/'),
          originalName: files.electricityBill[0].originalname,
        });
      }

      if (files?.customerPhotograph?.length) {
        documentsToSave.push({
          documentTypeId: '3', // Customer Photograph
          documentUrl: files.customerPhotograph[0].path.replace(/\\/g, '/'),
          originalName: files.customerPhotograph[0].originalname,
        });
      }

      if (files?.aadharCardBack?.length) {
        documentsToSave.push({
          documentTypeId: '4', // Aadhar Back
          documentUrl: files.aadharCardBack[0].path.replace(/\\/g, '/'),
          originalName: files.aadharCardBack[0].originalname,
        });
      }

      if (files?.cancelCheque?.length) {
        documentsToSave.push({
          documentTypeId: '5', // Cancel Cheque
          documentUrl: files.cancelCheque[0].path.replace(/\\/g, '/'),
          originalName: files.cancelCheque[0].originalname,
        });
      }

      const lead = this.leadRepository.create({
        fullName,
        phoneNumber,
        address,
        userId,
        status: LeadStatus.QUERY_SENT,
        documents: documentsToSave,
        events: [
          {
            eventName: 'Query Sent',
            userId,
            description: 'Lead submitted successfully',
          },
        ],
      });

      return await this.leadRepository.save(lead);
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }

  }
}
