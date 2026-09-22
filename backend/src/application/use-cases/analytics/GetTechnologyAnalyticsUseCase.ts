import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';
import { AnalyticsEngine, TechnologySummary } from '../../../domain/services/AnalyticsEngine';
import { resolveAnalyticsDateRange } from './resolveAnalyticsDateRange';

export interface GetTechnologyAnalyticsRequest {
  startDate?: Date;
  endDate?: Date;
}

export class GetTechnologyAnalyticsUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private technologyRepository: ITechnologyRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(request: GetTechnologyAnalyticsRequest): Promise<TechnologySummary[]> {
    const records = await this.trainingRecordRepository.search(
      resolveAnalyticsDateRange(request.startDate, request.endDate)
    );

    const technologies = await this.technologyRepository.listAll();
    const technologyMap = new Map<string, { name: string; categoryId: string; categoryName: string }>();
    for (const tech of technologies) {
      technologyMap.set(tech.id, {
        name: tech.name,
        categoryId: tech.categoryId,
        categoryName: tech.categoryName,
      });
    }

    return this.analyticsEngine.groupByTechnology(records, technologyMap);
  }
}
