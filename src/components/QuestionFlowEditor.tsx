'use client';

import { useState } from 'react';
import { Question } from '@/types';

interface QuestionFlowEditorProps {
  questions: Question[];
  onSave: (questions: Question[]) => Promise<void>;
}

export default function QuestionFlowEditor({
  questions: initialQuestions,
  onSave,
}: QuestionFlowEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [saving, setSaving] = useState(false);

  const handleQuestionChange = (id: string, field: keyof Question, value: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleAddQuestion = () => {
    const newId = `q${Date.now()}`;
    setQuestions([
      ...questions,
      { id: newId, question: '', description: '' },
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert('最低1つの質問が必要です');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [
      newQuestions[index],
      newQuestions[index - 1],
    ];
    setQuestions(newQuestions);
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [
      newQuestions[index + 1],
      newQuestions[index],
    ];
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(questions);
      alert('保存しました');
    } catch (error) {
      alert('保存に失敗しました');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">1on1 質問フロー設定</h2>
        <button
          onClick={handleAddQuestion}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          質問を追加
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-600">質問 {index + 1}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === questions.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleRemoveQuestion(question.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  削除
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  質問文
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) =>
                    handleQuestionChange(question.id, 'question', e.target.value)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="例：今日取り組んだ業務内容を教えてください。"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  説明（日報の項目名として使用）
                </label>
                <input
                  type="text"
                  value={question.description}
                  onChange={(e) =>
                    handleQuestionChange(question.id, 'description', e.target.value)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：本日の作業内容"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}
