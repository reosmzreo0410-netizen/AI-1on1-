'use client';

import { DailyReport } from '@/types';

interface ReportCardProps {
  report: DailyReport;
  onViewDetail: (report: DailyReport) => void;
}

export default function ReportCard({ report, onViewDetail }: ReportCardProps) {
  const date = new Date(report.date);
  const formattedDate = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Markdownから最初の数行を抽出
  const preview = report.content
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .slice(0, 3)
    .join(' ')
    .slice(0, 150);

  return (
    <div
      onClick={() => onViewDetail(report)}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border-l-4 border-blue-500"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800">{formattedDate}</h3>
        <span className="text-sm text-gray-500">{report.userName}</span>
      </div>

      <p className="text-gray-600 text-sm line-clamp-3">
        {preview || '内容がありません'}...
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            作成: {new Date(report.createdAt).toLocaleString('ja-JP')}
          </span>
          {report.recommendations && report.recommendations.length > 0 && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              {report.recommendations.length}件のリソース
            </span>
          )}
        </div>
        <span className="text-blue-600 text-sm font-medium hover:underline">
          詳細を見る →
        </span>
      </div>
    </div>
  );
}
