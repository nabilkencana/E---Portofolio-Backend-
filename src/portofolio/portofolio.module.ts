import { Module } from '@nestjs/common';
import { PortfolioService } from './portofolio.service';
import { PortfolioController } from './portofolio.controller';

@Module({
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortofolioModule {}
