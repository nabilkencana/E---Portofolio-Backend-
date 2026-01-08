// dto/create-skill.dto.ts
export class CreateSkillDto {
    name: string;
    level?: string;     // BEGINNER, INTERMEDIATE, ADVANCED
    category?: string;  // Pedagogik, Digital, dll
}
