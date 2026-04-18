import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let prismaService: {
    contactInquiry: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      contactInquiry: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  it('normalizes inquiry fields before saving', async () => {
    prismaService.contactInquiry.create.mockResolvedValue({
      id: 'contact-1',
      name: 'Vinayak',
      surname: 'K',
      organization: 'OpenAI',
      email: 'techvk8180@gmail.com',
      comments: 'Need pricing details.',
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
      updatedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    const result = await service.create({
      name: ' Vinayak ',
      surname: ' K ',
      organization: ' OpenAI ',
      email: ' TECHVK8180@GMAIL.COM ',
      comments: ' Need pricing details. ',
    });

    expect(prismaService.contactInquiry.create).toHaveBeenCalledWith({
      data: {
        name: 'Vinayak',
        surname: 'K',
        organization: 'OpenAI',
        email: 'techvk8180@gmail.com',
        comments: 'Need pricing details.',
      },
    });
    expect(result.id).toBe('contact-1');
  });
});
