import { SearchCriteria } from '../../../domain/repositories/ITrainingRecordRepository';
import { DateRange } from '../../../domain/value-objects/DateRange';
import { ValidationError } from '../../../shared/errors';

/**
 * Resolves optional analytics date bounds into repository search criteria.
 *
 * Supported cases:
 * - Both bounds provided: filter to that interval.
 * - Only startDate provided: from that date up to today.
 * - Only endDate provided: from the beginning of time up to that date.
 * - Neither bound provided: no date filtering at all.
 *
 * @throws ValidationError when startDate is after the effective end date.
 */
export function resolveAnalyticsDateRange(startDate?: Date, endDate?: Date): SearchCriteria {
  if (!startDate && !endDate) {
    return {};
  }

  const effectiveEnd = endDate ?? new Date();

  if (startDate) {
    let range: DateRange;
    try {
      range = new DateRange(startDate, effectiveEnd);
    } catch {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    return { startDate: range.getStartDate(), endDate: range.getEndDate() };
  }

  return { endDate: effectiveEnd };
}
