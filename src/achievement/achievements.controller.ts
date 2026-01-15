import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  UseGuards,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';

@ApiTags('achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) { }

  @Post()
  @ApiOperation({ summary: 'Create achievement with optional file upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @CurrentUser() user: any,
    @Body() createAchievementDto: CreateAchievementDto,
    @UploadedFile(new FileValidationPipe()) file?: Express.Multer.File,
  ) {
    return this.achievementsService.create(user.id, createAchievementDto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all achievements for current user' })
  findAll(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.achievementsService.findAll(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get achievement by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Achievement ID' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    console.log('Fetching achievement:', { id, userId: user.id }); // Debug log
    return this.achievementsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update achievement' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateAchievementDto: UpdateAchievementDto,
    @UploadedFile(new FileValidationPipe({ required: false })) file?: Express.Multer.File,
  ) {
    return this.achievementsService.update(id, user.id, updateAchievementDto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete achievement' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.achievementsService.remove(id, user.id);
  }

  @Get(':id/file-url')
  @ApiOperation({ summary: 'Get signed URL for achievement file' })
  async getFileUrl(@CurrentUser() user: any, @Param('id') id: string) {
    return this.achievementsService.getSignedUrl(id, user.id);
  }
}