export class CreateEducationDto {
    institution: string;
    degree: string;
    field?: string;
    startYear: number;
    endYear?: number;
    isCurrent?: boolean;
}
