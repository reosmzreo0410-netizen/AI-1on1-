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
          <div className="mb-6">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
