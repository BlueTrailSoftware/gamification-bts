import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { AnalyticsEngine, EmployeeRanking } from '../../../domain/services/AnalyticsEngine';
import { resolveAnalyticsDateRange } from './resolveAnalyticsDateRange';

export interface GetLeaderboardRequest {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class GetLeaderboardUseCase {
  private static readonly DEFAULT_LIMIT = 10;

  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private userRepository: IUserRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(request: GetLeaderboardRequest): Promise<EmployeeRanking[]> {
    const records = await this.trainingRecordRepository.search(
      resolveAnalyticsDateRange(request.startDate, request.endDate)
    );

    // Build user map
    const users = await this.userRepository.listAll();
    const userMap = new Map<string, { username: string; displayName: string; email: string }>();
    for (const user of users) {
      userMap.set(user.id, {
        username: user.username,
        displayName: user.getDisplayName(),
        email: user.email.getValue(),
      });
    }

    const rankings = this.analyticsEngine.rankEmployees(records, userMap);

    // Return at least DEFAULT_LIMIT entries or all if fewer
    const limit = request.limit ?? GetLeaderboardUseCase.DEFAULT_LIMIT;
    const minEntries = Math.max(limit, GetLeaderboardUseCase.DEFAULT_LIMIT);

    return rankings.length <= minEntries ? rankings : rankings.slice(0, minEntries);
  }
}
