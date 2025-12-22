'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Issue, IssueCategory, User } from '@/types';
import IssueChart from '@/components/IssueChart';

interface IssueStats {
  total: number;
  byCategory: Record<IssueCategory, number>;
  bySeverity: { low: number; medium: number; high: number };
  byUser: Record<string, number>;
  byDate: Record<string, number>;
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

const severityLabels = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-red-100 text-red-800' },
};

export default function IssuesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');

  useEffect(() => {
    const init = async () => {
      // 認証チェック
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();

      if (!authData.data) {
        router.push('/');
        return;
      }

      if (authData.data.role !== 'admin') {
        router.push('/');
        return;
      }

      setUser(authData.data);

      // 課題取得
      const issuesRes = await fetch('/api/issues');
      const issuesData = await issuesRes.json();
      if (issuesData.success) {
        setIssues(issuesData.data.issues);
        setStats(issuesData.data.stats);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredIssues =
    selectedCategory === 'all'
      ? issues
      : issues.filter((i) => i.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        課題ダッシュボード
      </h1>

      {/* 統計サマリー */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl font-bold text-blue-600">
            {stats?.total || 0}
          </div>
          <div className="text-gray-600">総課題数</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl font-bold text-red-600">
            {stats?.bySeverity.high || 0}
          </div>
          <div className="text-gray-600">高優先度</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl font-bold text-yellow-600">
            {stats?.bySeverity.medium || 0}
          </div>
          <div className="text-gray-600">中優先度</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-3xl font-bold text-green-600">
            {stats?.bySeverity.low || 0}
          </div>
          <div className="text-gray-600">低優先度</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* カテゴリ別グラフ */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            カテゴリ別課題数
          </h2>
          {stats && <IssueChart data={stats.byCategory} />}
        </div>

        {/* ユーザー別課題数 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            ユーザー別課題数
          </h2>
          {stats && Object.keys(stats.byUser).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.byUser)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {count}件
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">データがありません</p>
          )}
        </div>
      </div>

      {/* 課題一覧 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">課題一覧</h2>

          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as IssueCategory | 'all')
            }
            className="p-2 border border-gray-300 rounded-lg"
          >
            <option value="all">すべてのカテゴリ</option>
            {(Object.keys(categoryLabels) as IssueCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        {filteredIssues.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            課題がありません
          </p>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-800 mb-2">{issue.content}</p>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="text-gray-500">{issue.userName}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500">
                        {new Date(issue.date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {categoryLabels[issue.category]}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        severityLabels[issue.severity].color
                      }`}
                    >
                      {severityLabels[issue.severity].label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
