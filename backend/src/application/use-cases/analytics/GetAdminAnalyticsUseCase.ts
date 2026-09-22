import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';
import { AnalyticsEngine, CategorySummary, TechnologySummary } from '../../../domain/services/AnalyticsEngine';
import { resolveAnalyticsDateRange } from './resolveAnalyticsDateRange';

export interface AdminAnalyticsDTO {
  totalHours: number;
  totalRecords: number;
  employeeCount: number;
  hoursByTechnology: TechnologySummary[];
  hoursByCategory: CategorySummary[];
}

export interface GetAdminAnalyticsRequest {
  startDate?: Date;
  endDate?: Date;
}

export class GetAdminAnalyticsUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private technologyRepository: ITechnologyRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(request: GetAdminAnalyticsRequest): Promise<AdminAnalyticsDTO> {
    const records = await this.trainingRecordRepository.search(
      resolveAnalyticsDateRange(request.startDate, request.endDate)
    );

    const totalHours = this.analyticsEngine.calculateTotalHours(records);

    const technologies = await this.technologyRepository.listAll();
    const technologyMap = new Map<string, { name: string; categoryId: string; categoryName: string }>();
    for (const tech of technologies) {
      technologyMap.set(tech.id, {
        name: tech.name,
        categoryId: tech.categoryId,
        categoryName: tech.categoryName,
      });
    }

    const hoursByTechnology = this.analyticsEngine.groupByTechnology(records, technologyMap);
    const hoursByCategory = this.analyticsEngine.groupByCategory(records, technologyMap);

    // Count distinct employees from records
    const uniqueEmployeeIds = new Set(records.map(r => r.userId));

    return {
      totalHours,
      totalRecords: records.length,
      employeeCount: uniqueEmployeeIds.size,
      hoursByTechnology,
      hoursByCategory,
    };
  }
}
