import { PartialType } from '@nestjs/swagger';
import { CreatePortofolioDto } from './create-portofolio.dto';

export class UpdatePortofolioDto extends PartialType(CreatePortofolioDto) {}
