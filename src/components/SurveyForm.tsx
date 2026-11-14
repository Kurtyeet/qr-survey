'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Question, SurveyData } from '@/types/survey';
import { saveDraft, getDraft, queueSubmission, cacheSurvey } from '@/lib/syncEngine';
import { packSubmission } from '@/lib/surveyPacker';
import { db } from '@/lib/db';
import { QRCodeSVG } from 'qrcode.react';
import {
  Star,
  AlertCircle,
  Save,
  Send,
  CheckCircle2,
  User,
  Briefcase,
  WifiOff,
  QrCode,
  X,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface SurveyFormProps {
  survey: SurveyData;
}

export default function SurveyForm({ survey }: SurveyFormProps) {
  const router = useRouter();
  const [respondentName, setRespondentName] = useState('');
  const [respondentRole, setRespondentRole] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [offlineToast, setOfflineToast] = useState(false);
  const [transferModal, setTransferModal] = useState<{
    payload: string;
    subId: string;
    name: string;
    role: string;
  } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const availableRoles =
    survey.roles && survey.roles.length > 0
      ? survey.roles
      : ['Customer', 'Employee', 'Student', 'Visitor', 'Other'];

  useEffect(() => {
    cacheSurvey(survey).catch(console.error);

    getDraft(survey.id).then((savedDraft) => {
      if (savedDraft) {
        if (savedDraft.answers && Object.keys(savedDraft.answers).length > 0) {
          setAnswers(savedDraft.answers);
        }
        if (savedDraft.respondentName) setRespondentName(savedDraft.respondentName);
        if (savedDraft.respondentRole) setRespondentRole(savedDraft.respondentRole);
        setLastSavedTime('Draft restored from device');
      }
    });
  }, [survey.id]);

  // Auto-save helper
  const triggerAutoSave = (
    updatedAnswers: Record<string, any>,
    name: string,
    role: string
  ) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveDraft(survey.id, updatedAnswers, name, role).then(() => {
        const time = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTime(`Saved at ${time}`);
      });
    }, 300);
  };

  const handleNameChange = (val: string) => {
    setRespondentName(val);
    if (validationErrors['__name']) {
      setValidationErrors((errs) => {
        const next = { ...errs };
        delete next['__name'];
        return next;
      });
    }
    triggerAutoSave(answers, val, respondentRole);
  };

  const handleRoleSelect = (role: string) => {
    setRespondentRole(role);
    if (validationErrors['__role']) {
      setValidationErrors((errs) => {
        const next = { ...errs };
        delete next['__role'];
        return next;
      });
    }
    triggerAutoSave(answers, respondentName, role);
  };

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

      triggerAutoSave(updated, respondentName, respondentRole);
      return updated;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!respondentName.trim()) {
      errors['__name'] = 'Please enter your name or identifier';
    }

    if (!respondentRole) {
      errors['__role'] = 'Please select your role';
    }

    for (const q of survey.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[q.id] = 'This question is required';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Option 1: Standard Submit (auto-uploads when online)
  const handleStandardSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    setIsSubmitting(true);
    try {
      const submissionId = await queueSubmission(
        survey.id,
        answers,
        respondentName.trim(),
        respondentRole
      );

      // Clean up draft since it is completed
      await db.drafts.delete(survey.id).catch(console.warn);

      if (isOffline) {
        setOfflineToast(true);
        setTimeout(() => {
          router.push(`/s/${survey.id}/confirmation?subId=${submissionId}`);
        }, 1200);
      } else {
        router.push(`/s/${survey.id}/confirmation?subId=${submissionId}`);
      }
    } catch (error) {
      console.error('Failed to queue submission:', error);
      alert('Could not save response locally. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Option 2: Generate Transfer QR Code immediately
  const handleGenerateTransferQr = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionId = await queueSubmission(
        survey.id,
        answers,
        respondentName.trim(),
        respondentRole
      );

      // Clean up draft
      await db.drafts.delete(survey.id).catch(console.warn);

      const subObj = {
        id: submissionId,
        surveyId: survey.id,
        respondentName: respondentName.trim(),
        respondentRole,
        answers,
        submittedAtClient: new Date().toISOString(),
        status: 'pending' as const,
        attempts: 0,
      };

      const payload = packSubmission(subObj);
      setTransferModal({
        payload,
        subId: submissionId,
        name: respondentName.trim(),
        role: respondentRole,
      });
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to generate transfer QR:', error);
      alert('Could not generate transfer QR code. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offline Toast Notification upon submitting offline */}
      {offlineToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-slide-up">
          <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-2xl flex items-center gap-3">
            <WifiOff className="w-6 h-6 shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-xs">No Internet Connection!</p>
              <p className="text-[11px] text-amber-100">
                Your survey is safely saved on this device and will auto-upload when internet reconnects.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 shadow-card rounded-xl px-4 py-2.5 text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-600">
          <Save className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
          Auto-save
        </span>
        <span className="text-slate-400">{lastSavedTime ?? 'Saves as you type'}</span>
      </div>

      {/* Validation summary banner */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          Please complete your name, role, and all required questions.
        </div>
      )}

      {/* ── RESPONDENT DETAILS CARD ── */}
      <div
        className={`bg-white rounded-2xl border shadow-card p-5 transition-all ${
          validationErrors['__name'] || validationErrors['__role']
            ? 'border-red-300 ring-1 ring-red-300'
            : 'border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>Respondent Information</span>
        </h3>

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Your Name / Identifier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={respondentName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Maria Santos or Anonymous #12"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400"
          />
          {validationErrors['__name'] && (
            <p className="text-xs text-red-500 mt-1 font-medium">{validationErrors['__name']}</p>
          )}
        </div>

        {/* Role buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            Select Your Role <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {availableRoles.map((role) => {
              const isSelected = respondentRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-brand-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
          {validationErrors['__role'] && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">{validationErrors['__role']}</p>
          )}
        </div>
      </div>

      {/* ── QUESTIONS LIST ── */}
      <div className="space-y-4">
        {survey.questions.map((q, idx) => {
          const currentVal = answers[q.id];
          const hasError = !!validationErrors[q.id];

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border shadow-card p-5 transition-all ${
                hasError ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <label className="text-sm font-semibold text-slate-800 leading-snug">
                  <span className="text-slate-400 font-mono text-xs mr-1.5">{idx + 1}.</span>
                  {q.title}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>

              {q.description && (
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{q.description}</p>
              )}

              {/* Short Text Input */}
              {(q.type === 'short_text' || (q.type as string) === 'text') && (
                <input
                  type="text"
                  value={currentVal || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Your answer…"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400"
                />
              )}

              {/* Long Textarea */}
              {(q.type === 'long_text' || (q.type as string) === 'textarea') && (
                <textarea
                  rows={3}
                  value={currentVal || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Your answer…"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none"
                />
              )}

              {/* Radio (Choice pills) */}
              {(q.type === 'single_choice' || (q.type as string) === 'radio') && q.options && (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = currentVal === opt;
                    return (
                      <label
                        key={optIdx}
                        onClick={() => handleAnswerChange(q.id, opt)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 text-blue-950 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Checkbox (Multi-select pills) */}
              {(q.type === 'multi_choice' || (q.type as string) === 'checkbox') && q.options && (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const selectedList: string[] = Array.isArray(currentVal) ? currentVal : [];
                    const isSelected = selectedList.includes(opt);
                    return (
                      <label
                        key={optIdx}
                        onClick={() => {
                          const updated = isSelected
                            ? selectedList.filter((item) => item !== opt)
                            : [...selectedList, opt];
                          handleAnswerChange(q.id, updated);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 text-blue-950 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Rating (Star / Numeric) */}
              {q.type === 'rating' && (
                <div className="pt-2">
                  <div className="flex gap-2 justify-between">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (currentVal || 0) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, star)}
                          className={`flex-1 py-3 flex flex-col items-center justify-center rounded-xl border transition ${
                            isFilled
                              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 ${isFilled ? 'fill-amber-400 text-amber-400' : ''}`}
                            strokeWidth={2}
                          />
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
                    <option key={optIdx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {hasError && (
                <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {validationErrors[q.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── TWO EXPLICIT SUBMISSION OPTIONS ── */}
      <div className="pt-3 space-y-3">
        {/* Option 1: Standard Submit (Auto-Upload) */}
        <button
          type="button"
          onClick={handleStandardSubmit}
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
              Submit Survey (Auto-Upload)
            </>
          )}
        </button>

        {/* Option 2: Generate Transfer QR Code */}
        <button
          type="button"
          onClick={handleGenerateTransferQr}
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold rounded-2xl shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm border border-slate-800"
        >
          <QrCode className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
          <span>Generate Transfer QR Code (For Admin Scan)</span>
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-2 leading-relaxed">
          Works 100% offline · Choose <strong>Submit</strong> to auto-upload later, or <strong>Transfer QR</strong> for the surveyor to scan right now.
        </p>
      </div>

      {/* ── OFFLINE PEER-TO-PEER QR TRANSFER MODAL ── */}
      {transferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative animate-slide-up border border-slate-200">
            <button
              onClick={() => setTransferModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6 text-emerald-600" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Admin Transfer QR Code</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Show this QR code to your surveyor or admin. When they scan it with their app, your survey will be transferred directly to their device!
            </p>

            {/* Respondent Tag */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 text-xs text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {transferModal.name}
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                {transferModal.role}
              </span>
            </div>

            {/* The QR Code */}
            <div className="bg-white p-3 border-2 border-slate-900 rounded-2xl inline-block shadow-inner mb-4">
              <QRCodeSVG value={transferModal.payload} size={200} level="M" />
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-snug">
              ✓ Also saved safely to this phone. It will auto-upload whenever an internet connection is detected.
            </p>

            <button
              onClick={() => {
                router.push(`/s/${survey.id}/confirmation?subId=${transferModal.subId}`);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-brand-sm"
            >
              <span>Done / View Confirmation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
