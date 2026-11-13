'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Question, SurveyData } from '@/types/survey';
import { saveDraft, getDraft, queueSubmission, cacheSurvey } from '@/lib/syncEngine';
import { Star, AlertCircle, Save, Send, CheckCircle2 } from 'lucide-react';

interface SurveyFormProps {
  survey: SurveyData;
}

export default function SurveyForm({ survey }: SurveyFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    cacheSurvey(survey).catch(console.error);
    getDraft(survey.id).then((savedDraft) => {
      if (savedDraft && Object.keys(savedDraft).length > 0) {
        setAnswers(savedDraft);
        setLastSavedTime('Draft restored from device');
      }
    });
  }, [survey]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };

      if (validationErrors[questionId]) {
        setValidationErrors((errs) => {
          const next = { ...errs };
          delete next[questionId];
          return next;
        });
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        saveDraft(survey.id, updated).then(() => {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedTime(`Saved at ${time}`);
        });
      }, 300);

      return updated;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    for (const q of survey.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[q.id] = 'Required';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSubmitting(true);
    try {
      const submissionId = await queueSubmission(survey.id, answers);
      router.push(`/s/${survey.id}/confirmation?subId=${submissionId}`);
    } catch (error) {
      console.error('Failed to queue submission:', error);
      alert('Could not save response locally. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Auto-save indicator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 shadow-card rounded-xl px-4 py-2.5 text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-600">
          <Save className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
          Auto-save
        </span>
        <span className="text-slate-400">
          {lastSavedTime ?? 'Saves as you type'}
        </span>
      </div>

      {/* Validation summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          Please answer all required questions before submitting.
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {survey.questions.map((q, idx) => {
          const hasError = Boolean(validationErrors[q.id]);
          const currentVal = answers[q.id];

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border shadow-card p-5 transition-all ${
                hasError
                  ? 'border-red-300 ring-1 ring-red-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Question label */}
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-900 leading-snug flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[11px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>
                    {q.title}
                    {q.required && <span className="text-red-500 ml-0.5">*</span>}
                  </span>
                </label>
                {q.description && (
                  <p className="text-xs text-slate-500 mt-1.5 ml-7">{q.description}</p>
                )}
              </div>

              {/* Short text */}
              {q.type === 'short_text' && (
                <input
                  type="text"
                  value={currentVal || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Your answer…"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400"
                />
              )}

              {/* Long text */}
              {q.type === 'long_text' && (
                <textarea
                  rows={3}
                  value={currentVal || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Type your response here…"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none"
                />
              )}

              {/* Single choice */}
              {q.type === 'single_choice' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = currentVal === opt;
                    return (
                      <label
                        key={optIdx}
                        className={`choice-pill ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0"
                        />
                        <span className="flex-1">{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Multi choice */}
              {q.type === 'multi_choice' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const selectedList: string[] = Array.isArray(currentVal) ? currentVal : [];
                    const isChecked = selectedList.includes(opt);

                    return (
                      <label
                        key={optIdx}
                        className={`choice-pill ${isChecked ? 'selected' : ''}`}
                        onClick={() => {
                          const next = isChecked
                            ? selectedList.filter((i) => i !== opt)
                            : [...selectedList, opt];
                          handleAnswerChange(q.id, next);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0"
                        />
                        <span className="flex-1">{opt}</span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              {q.type === 'rating' && (
                <div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (currentVal || 0) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, star)}
                          className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                            isFilled
                              ? 'bg-amber-50 border-amber-400 text-amber-500'
                              : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Star className={`w-5 h-5 ${isFilled ? 'fill-amber-400 text-amber-400' : ''}`} strokeWidth={2} />
                          <span className="text-[11px] font-bold">{star}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              )}

              {/* Dropdown */}
              {q.type === 'dropdown' && q.options && (
                <select
                  value={currentVal || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition appearance-none"
                >
                  <option value="">Select an option…</option>
                  {q.options.map((opt, optIdx) => (
                    <option key={optIdx} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {/* Per-field error */}
              {hasError && (
                <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  This field is required
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl shadow-brand transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" strokeWidth={2.5} />
              Submit survey
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
          Works offline · syncs automatically when connection returns
        </p>
      </div>
    </form>
  );
}
