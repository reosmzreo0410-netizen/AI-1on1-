'use client';

import { IssueCategory } from '@/types';

interface IssueChartProps {
  data: Record<IssueCategory, number>;
}

const categoryLabels: Record<IssueCategory, string> = {
  personnel: '人員',
  process: 'プロセス',
  tools: 'ツール',
  communication: 'コミュニケーション',
  workload: '業務量',
  skills: 'スキル',
  other: 'その他',
};

const categoryColors: Record<IssueCategory, string> = {
  personnel: 'bg-red-500',
  process: 'bg-blue-500',
  tools: 'bg-green-500',
  communication: 'bg-yellow-500',
  workload: 'bg-purple-500',
  skills: 'bg-pink-500',
  other: 'bg-gray-500',
};

export default function IssueChart({ data }: IssueChartProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(data), 1);

  const sortedCategories = (Object.keys(data) as IssueCategory[]).sort(
    (a, b) => data[b] - data[a]
  );

  return (
    <div className="space-y-4">
      {sortedCategories.map((category) => {
        const count = data[category];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const barWidth = (count / maxCount) * 100;

        return (
          <div key={category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {categoryLabels[category]}
              </span>
              <span className="text-gray-500">
                {count}件 ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${categoryColors[category]} transition-all duration-500`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
