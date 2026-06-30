import { PartialType } from '@nestjs/swagger';
import { CreateReviewerDto } from './create-reviewer.dto';

export class UpdateReviewerDto extends PartialType(CreateReviewerDto) {}
