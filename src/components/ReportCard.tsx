'use client';

import { DailyReport } from '@/types';

interface ReportCardProps {
  report: DailyReport;
  onViewDetail: (report: DailyReport) => void;
  onDelete?: (reportId: string) => void;
}

export default function ReportCard({ report, onViewDetail, onDelete }: ReportCardProps) {
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

  const handleCardClick = (e: React.MouseEvent) => {
    // 削除ボタンがクリックされた場合は詳細表示に遷移しない
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return;
    }
    onViewDetail(report);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(report.id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border-l-4 border-blue-500 relative"
    >
      {onDelete && (
        <button
          onClick={handleDelete}
          className="delete-button absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="日報を削除"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

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
