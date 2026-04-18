import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(@Body() createContactInquiryDto: CreateContactInquiryDto) {
    return this.contactService.create(createContactInquiryDto);
  }
}
