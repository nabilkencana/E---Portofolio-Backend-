import { Test, TestingModule } from '@nestjs/testing';
import { PortofolioService } from './portofolio.service';

describe('PortofolioService', () => {
  let service: PortofolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortofolioService],
    }).compile();

    service = module.get<PortofolioService>(PortofolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
