'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DailyReport, User } from '@/types';
import ReportCard from '@/components/ReportCard';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReports, setShowAllReports] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 認証チェック
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();

      if (!authData.data) {
        router.push('/');
        return;
      }

      setUser(authData.data);
      await fetchReports(authData.data, false);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchReports = async (currentUser: User, all: boolean) => {
    const url = all && currentUser.role === 'admin'
      ? '/api/reports?all=true'
      : '/api/reports';

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setReports(data.data);
    }
  };

  const handleToggleAllReports = async () => {
    if (!user) return;
    const newValue = !showAllReports;
    setShowAllReports(newValue);
    await fetchReports(user, newValue);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user || user.role !== 'admin') return;
    
    if (!confirm('この日報を削除してもよろしいですか？この操作は取り消せません。')) {
      return;
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });

      const data = await res.json();
      if (data.success) {
        // 詳細表示中の場合は一覧に戻る
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(null);
        }
        // 日報一覧を再取得
        await fetchReports(user, showAllReports);
        alert('日報を削除しました');
      } else {
        alert(data.error || '日報の削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('日報の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  // 日報詳細表示
  if (selectedReport) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => setSelectedReport(null)}
          className="mb-6 text-blue-600 hover:underline flex items-center"
        >
          ← 一覧に戻る
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {new Date(selectedReport.date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                の日報
              </h1>
              <p className="text-gray-500">{selectedReport.userName}</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleDeleteReport(selectedReport.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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
                削除
              </button>
            )}
          </div>

          <div className="prose max-w-none">
            {selectedReport.content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return (
                  <h1 key={index} className="text-2xl font-bold text-gray-800 mt-6 mb-4">
                    {line.replace('# ', '')}
                  </h1>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={index} className="text-xl font-bold text-gray-700 mt-5 mb-3">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={index} className="text-gray-600 ml-4">
                    {line.replace('- ', '')}
                  </li>
                );
              }
              if (line.startsWith('*')) {
                return (
                  <p key={index} className="text-gray-400 italic text-sm mt-4">
                    {line.replace(/\*/g, '')}
                  </p>
                );
              }
              if (line.trim() === '---') {
                return <hr key={index} className="my-4" />;
              }
              if (line.trim()) {
                return (
                  <p key={index} className="text-gray-600">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>

          {/* レコメンド表示 */}
          {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                おすすめリソース
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                この日報の内容と課題を詳細に分析し、課題解決に最もクリティカルで効果的なリソースを5つ厳選しました。YouTube動画、記事、書籍からバランス良く選んでいます。
              </p>
              <div className="grid gap-4 md:grid-cols-1">
                {selectedReport.recommendations.map((rec) => (
                  <a
                    key={rec.id}
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {rec.source === 'youtube' && '📹 YouTube'}
                            {rec.source === 'article' && '📰 記事'}
                            {rec.source === 'book' && '📚 書籍'}
                            {rec.source === 'search' && '🔍 検索'}
                          </span>
                        </div>
                        <h3 className="text-gray-900 font-semibold mb-1">{rec.title}</h3>
                        {rec.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {rec.description}
                          </p>
                        )}
                        {rec.reason && (
                          <p className="text-xs text-gray-500">{rec.reason}</p>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 日報一覧
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">日報一覧</h1>

        {user?.role === 'admin' && (
          <button
            onClick={handleToggleAllReports}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showAllReports
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showAllReports ? '全員の日報を表示中' : '自分の日報のみ'}
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-500 mb-4">まだ日報がありません</p>
          <a
            href="/chat"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            1on1を始める
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onViewDetail={setSelectedReport}
              onDelete={user?.role === 'admin' ? handleDeleteReport : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
