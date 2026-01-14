import { Module } from '@nestjs/common';
import { PortfolioService } from './portofolio.service';
import { PortfolioController } from './portofolio.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports : [CloudinaryModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortofolioModule {}
