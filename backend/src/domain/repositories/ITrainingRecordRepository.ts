import { TrainingRecord } from '../entities/TrainingRecord';

export interface SearchCriteria {
  searchTerm?: string;
  technologyId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface BrowseCriteria {
  technologyId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface BrowseRecord {
  id: string;
  userId: string;
  userDisplayName: string;
  technologyId: string;
  technologyName: string;
  title: string;
  description: string;
  hours: number;
  completionDate: string | null;
  studyPlatform: string | null;
  trainingLink: string | null;
  createdAt: string;
}

/**
 * Repository interface for TrainingRecord entity
 * Requirements: 4.1, 5.4
 */
export interface ITrainingRecordRepository {
  create(record: TrainingRecord): Promise<TrainingRecord>;
  findById(id: string): Promise<TrainingRecord | null>;
  update(id: string, updates: Partial<Omit<TrainingRecord, 'id' | 'createdAt'>>): Promise<TrainingRecord>;
  delete(id: string): Promise<void>;
  findByUserId(userId: string): Promise<TrainingRecord[]>;
  search(criteria: SearchCriteria): Promise<TrainingRecord[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<TrainingRecord[]>;
  browseAll(criteria: BrowseCriteria): Promise<BrowseRecord[]>;
}
