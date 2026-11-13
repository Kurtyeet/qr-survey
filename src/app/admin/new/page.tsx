'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Question, QuestionType } from '@/types/survey';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  Star,
  ListFilter,
  AlignLeft,
  Type,
  CheckSquare,
  Users,
  Send,
  FileEdit,
} from 'lucide-react';

const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: any }> = {
  short_text: { label: 'Short Text', icon: Type },
  long_text: { label: 'Long Text', icon: AlignLeft },
  single_choice: { label: 'Single Choice (Radio)', icon: CheckCircle2 },
  multi_choice: { label: 'Multiple Choice (Checkbox)', icon: CheckSquare },
  rating: { label: 'Rating (1 to 5 Stars)', icon: Star },
  dropdown: { label: 'Dropdown Select', icon: ListFilter },
};

function SurveyBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<string[]>([
    'Customer',
    'Employee',
    'Visitor',
    'Other',
  ]);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_1',
      title: 'How satisfied are you with our service today?',
      type: 'rating',
      required: true,
      minRating: 1,
      maxRating: 5,
    },
    {
      id: 'q_2',
      title: 'What did you like most about your experience?',
      type: 'single_choice',
      required: false,
      options: ['Speed and efficiency', 'Friendly staff', 'Quality of service', 'Value for money'],
    },
    {
      id: 'q_3',
      title: 'Any additional comments or suggestions for us?',
      type: 'long_text',
      required: false,
    },
  ]);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If editing an existing survey, load its existing values
  useEffect(() => {
    if (!editId) return;

    async function loadExisting() {
      try {
        const res = await fetch(`/api/admin/surveys/${editId}`);
        if (res.ok) {
          const s = await res.json();
          setTitle(s.title || '');
          setDescription(s.description || '');
          if (s.questions && Array.isArray(s.questions)) setQuestions(s.questions);
          if (s.roles && Array.isArray(s.roles)) setRoles(s.roles);
          setIsDraft(Boolean(s.isDraft));
        }
      } catch (e) {
        console.error('Failed to load survey for edit:', e);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadExisting();
  }, [editId]);

  const addQuestion = (type: QuestionType = 'short_text') => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      title: '',
      type,
      required: false,
      options:
        type === 'single_choice' || type === 'multi_choice' || type === 'dropdown'
          ? ['Option 1', 'Option 2']
          : undefined,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    )
      return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const addOption = (questionIdx: number) => {
    const q = questions[questionIdx];
    const opts = q.options ? [...q.options, `Option ${q.options.length + 1}`] : ['Option 1'];
    updateQuestion(questionIdx, { options: opts });
  };

  const updateOption = (questionIdx: number, optionIdx: number, text: string) => {
    const q = questions[questionIdx];
    if (!q.options) return;
    const opts = [...q.options];
    opts[optionIdx] = text;
    updateQuestion(questionIdx, { options: opts });
  };

  const removeOption = (questionIdx: number, optionIdx: number) => {
    const q = questions[questionIdx];
    if (!q.options || q.options.length <= 1) return;
    const opts = q.options.filter((_, i) => i !== optionIdx);
    updateQuestion(questionIdx, { options: opts });
  };

  const addRole = () => {
    if (!newRoleInput.trim()) return;
    const trimmed = newRoleInput.trim();
    if (!roles.includes(trimmed)) {
      setRoles([...roles, trimmed]);
    }
    setNewRoleInput('');
  };

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const handleSave = async (asDraft: boolean) => {
    if (!title.trim()) {
      setError('Please provide a survey title');
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].title.trim()) {
        setError(`Question #${i + 1} is missing a question prompt.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    const payload = {
      title,
      description,
      questions,
      roles,
      isDraft: asDraft,
    };

    try {
      if (editId) {
        // Update existing survey
        const res = await fetch(`/api/admin/surveys/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          router.push(`/admin/surveys/${editId}`);
          return;
        }
      } else {
        // Create new survey
        const res = await fetch('/api/admin/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const survey = await res.json();
          router.push(`/admin/surveys/${survey.id}`);
          return;
        }
      }
      setError('Failed to save survey. Please check inputs.');
    } catch (e) {
      setError('Network failure while saving survey');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
        Loading survey details…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Surveys
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileEdit className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>

            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Publish Survey'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Survey Details Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editId ? 'Edit Survey' : 'Survey Details'}
            </h2>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isDraft ? 'Draft Status' : 'Published Status'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Survey Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Community Health Survey or Field Assessment"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Description / Greeting Note (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief intro for respondents when they open your QR code..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* ── RESPONDENT ROLES BUILDER ── */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Allowed Respondent Roles (Choose role buttons)
              </label>
              <p className="text-xs text-slate-400 mb-2.5">
                Respondents will select one of these roles before answering questions.
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {roles.map((r, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-xl text-xs font-semibold"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => removeRole(idx)}
                      className="text-blue-400 hover:text-red-500 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-xs">
                <input
                  type="text"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRole();
                    }
                  }}
                  placeholder="Add role (e.g. Teacher, Volunteer)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addRole}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Questions ({questions.length})
            </h2>
          </div>

          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Question #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, 'down')}
                    disabled={idx === questions.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 ml-1"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Question Text
                  </label>
                  <input
                    type="text"
                    value={q.title}
                    onChange={(e) => updateQuestion(idx, { title: e.target.value })}
                    placeholder="e.g. How would you rate our service?"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Question Type
                  </label>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      const hasOptions =
                        newType === 'single_choice' ||
                        newType === 'multi_choice' ||
                        newType === 'dropdown';
                      updateQuestion(idx, {
                        type: newType,
                        options: hasOptions ? q.options || ['Option 1', 'Option 2'] : undefined,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Options for choices / dropdown */}
              {(q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown') && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Answer Options
                  </label>
                  <div className="space-y-2 mb-3">
                    {q.options?.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-slate-400 font-mono text-center">
                          {optIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(idx, optIdx)}
                          disabled={q.options && q.options.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addOption(idx)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Option
                  </button>
                </div>
              )}

              {/* Required Toggle */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Required Question</span>
                </label>
              </div>
            </div>
          ))}

          {/* Add Question Button bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Add Question:
            </span>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => addQuestion(k as QuestionType)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition hover:border-slate-300"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SurveyBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
          Loading survey builder…
        </div>
      }
    >
      <SurveyBuilderContent />
    </Suspense>
  );
}
