import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
    @ApiProperty({ description: 'Total achievements' })
    totalAchievements: number;

    @ApiProperty({ description: 'Validated achievements count' })
    validatedAchievements: number;

    @ApiProperty({ description: 'Pending achievements count' })
    pendingAchievements: number;

    @ApiProperty({ description: 'Rejected achievements count' })
    rejectedAchievements: number;

    @ApiProperty({ description: 'Prestasi count' })
    prestasiCount: number;

    @ApiProperty({ description: 'Sertifikat count' })
    sertifikatCount: number;

    @ApiProperty({ description: 'Validation percentage' })
    validationPercentage: number;

    @ApiProperty({ description: 'Recent additions this month' })
    recentAdditions: number;

    @ApiProperty({ description: 'Prestasi percentage' })
    prestasiPercentage: number;

    @ApiProperty({ description: 'Sertifikat percentage' })
    sertifikatPercentage: number;
}

export class RecentAchievementDto {
    @ApiProperty({ description: 'Achievement ID' })
    id: string;

    @ApiProperty({ description: 'Achievement title' })
    title: string;

    @ApiProperty({ description: 'Type (Prestasi/Sertifikat)' })
    type: string;

    @ApiProperty({ description: 'Validation status' })
    status: string;

    @ApiProperty({ description: 'Formatted date' })
    date: string;

    @ApiProperty({ description: 'Year', required: false })
    year?: number;

    @ApiProperty({ description: 'Level label' })
    level: string;

    @ApiProperty({ description: 'Description', required: false })
    description?: string;

    @ApiProperty({ description: 'Has attachment' })
    hasAttachment: boolean;

    @ApiProperty({ description: 'Validation status' })
    validationStatus: string;
}

export class ProfileCompletionDto {
    @ApiProperty({ description: 'Completion percentage' })
    percentage: number;

    @ApiProperty({ description: 'Completed fields count' })
    completed: number;

    @ApiProperty({ description: 'Total fields' })
    total: number;

    @ApiProperty({ description: 'Missing fields', type: [String] })
    missingFields: string[];
}

export class AchievementsByLevelDto {
    @ApiProperty({ description: 'Level label' })
    level: string;

    @ApiProperty({ description: 'Achievement count' })
    count: number;

    @ApiProperty({ description: 'Level value' })
    levelValue: string;
}

export class AchievementsByYearDto {
    @ApiProperty({ description: 'Year' })
    year: number;

    @ApiProperty({ description: 'Achievement count' })
    count: number;
}

export class DashboardSummaryDto {
    @ApiProperty({ type: DashboardStatsDto })
    stats: DashboardStatsDto;

    @ApiProperty({ type: [RecentAchievementDto] })
    recentAchievements: RecentAchievementDto[];

    @ApiProperty({ type: ProfileCompletionDto })
    profileCompletion: ProfileCompletionDto;

    @ApiProperty({ description: 'Charts data' })
    charts: {
        achievementsByLevel: AchievementsByLevelDto[];
        achievementsByYear: AchievementsByYearDto[];
    };
}