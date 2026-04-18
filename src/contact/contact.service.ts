import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContactInquiryDto: CreateContactInquiryDto) {
    return this.prisma.contactInquiry.create({
      data: {
        name: createContactInquiryDto.name.trim(),
        surname: createContactInquiryDto.surname.trim(),
        organization: createContactInquiryDto.organization.trim(),
        email: createContactInquiryDto.email.trim().toLowerCase(),
        comments: createContactInquiryDto.comments.trim(),
      },
    });
  }
}
