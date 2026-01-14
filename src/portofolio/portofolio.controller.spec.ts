import { Test, TestingModule } from '@nestjs/testing';
import { PortofolioController } from './portofolio.controller';
import { PortofolioService } from './portofolio.service';

describe('PortofolioController', () => {
  let controller: PortofolioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortofolioController],
      providers: [PortofolioService],
    }).compile();

    controller = module.get<PortofolioController>(PortofolioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
