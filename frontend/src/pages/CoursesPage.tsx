import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { Technology } from '@app-types/index';

interface BrowseRecord {
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

interface EmployeeOption {
  userId: string;
  displayName: string;
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#64748b',
  borderBottom: '2px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};
const td: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
};
const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.875rem',
};
const btnPrimary: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
};
const filterRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginBottom: '1.25rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
};

function getOneYearAgoStr(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

export default function CoursesPage() {
  const [records, setRecords] = useState<BrowseRecord[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterTech, setFilterTech] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTech) params.set('technologyId', filterTech);
    if (filterUser) params.set('userId', filterUser);
    if (filterStart) params.set('startDate', filterStart);
    if (filterEnd) params.set('endDate', filterEnd);
    api
      .get<BrowseRecord[]>(`/training-records/browse?${params}`)
      .then((res) => {
        setRecords(res.data);
        setError('');
        // Build unique employee list from results
        const seen = new Set<string>();
        const list: EmployeeOption[] = [];
        for (const r of res.data) {
          if (!seen.has(r.userId)) {
            seen.add(r.userId);
            list.push({ userId: r.userId, displayName: r.userDisplayName });
          }
        }
        setEmployees(list);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, [filterTech, filterUser, filterStart, filterEnd]);

  useEffect(() => {
    api.get<Technology[]>('/technologies').then((res) => setTechnologies(res.data)).catch(() => {});
    fetchRecords();
  }, []);

  const handleSearch = () => fetchRecords();

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', color: '#1e293b', fontSize: '1.5rem', fontWeight: 700 }}>
        Company Courses
      </h2>

      {error && <ErrorMessage message={error} />}

      <div style={filterRow}>
        <select
          style={inputStyle}
          value={filterTech}
          onChange={(e) => setFilterTech(e.target.value)}
        >
          <option value="">All Technologies</option>
          {technologies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          style={inputStyle}
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        >
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e.userId} value={e.userId}>
              {e.displayName}
            </option>
          ))}
        </select>
        <input
          style={inputStyle}
          type="date"
          min={getOneYearAgoStr()}
          max={new Date().toISOString().split('T')[0]}
          value={filterStart}
          onChange={(e) => setFilterStart(e.target.value)}
          title="From date"
          placeholder="From"
        />
        <input
          style={inputStyle}
          type="date"
          min={getOneYearAgoStr()}
          max={new Date().toISOString().split('T')[0]}
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          title="To date"
          placeholder="To"
        />
        <button style={btnPrimary} onClick={handleSearch}>
          Search
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Employee</th>
              <th style={th}>Title</th>
              <th style={th}>Technology</th>
              <th style={th}>Hours</th>
              <th style={th}>Completion Date</th>
              <th style={th}>Platform</th>
              <th style={th}>Link</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={7}>
                  No courses found
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.userDisplayName}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.technologyName}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>{r.hours.toFixed(1)}</td>
                  <td style={td}>
                    {r.completionDate ? format(new Date(r.completionDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td style={td}>{r.studyPlatform || '—'}</td>
                  <td style={td}>
                    {r.trainingLink ? (
                      <a
                        href={r.trainingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#4f46e5', fontSize: '0.875rem' }}
                      >
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
