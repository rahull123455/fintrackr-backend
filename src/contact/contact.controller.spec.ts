import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

describe('ContactController', () => {
  let controller: ContactController;
  let contactService: { create: jest.Mock };

  beforeEach(async () => {
    contactService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: contactService,
        },
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
  });

  it('passes the inquiry payload to the service', async () => {
    const payload = {
      name: 'Vinayak',
      surname: 'K',
      organization: 'FinTrackr',
      email: 'vinayak@example.com',
      comments: 'Need a product demo.',
    };

    contactService.create.mockResolvedValue({
      id: 'inquiry-1',
      ...payload,
    });

    const result = await controller.create(payload);

    expect(contactService.create).toHaveBeenCalledWith(payload);
    expect(result.id).toBe('inquiry-1');
  });
});
