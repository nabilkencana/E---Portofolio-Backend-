// dto/create-experience.dto.ts
export class CreateExperienceDto {
    company: string;
    position: string;
    description?: string;
    startDate: string;   // ISO string
    endDate?: string;
    isCurrent?: boolean;
}
