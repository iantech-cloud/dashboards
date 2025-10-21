// app/dashboard/surveys/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';
import { 
  getAvailableSurveys, 
  startSurvey, 
  submitSurveyAnswers, 
  getSurveyHistory,
  type Survey 
} from '@/app/actions/surveys';

interface SurveyAnswer {
  question_index: number;
  selected_option_index: number;
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyHistory, setSurveyHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Timer effect for active survey
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (activeSurvey && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSurvey, timeLeft]);

  // Load available surveys
  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    const result = await getAvailableSurveys();
    if (result.success && result.data) {
      setSurveys(result.data);
    } else {
      setMessage(result.message || 'Failed to load surveys.');
      setMessageType('error');
    }
    setLoading(false);
  };

  const loadSurveyHistory = async () => {
    const result = await getSurveyHistory();
    if (result.success && result.data) {
      setSurveyHistory(result.data);
    }
  };

  const handleStartSurvey = async (surveyId: string) => {
    setLoading(true);
    setMessage(null);
    
    const result = await startSurvey(surveyId);
    
    if (result.success && result.survey && result.responseId) {
      setActiveSurvey(result.survey);
      setCurrentResponseId(result.responseId);
      setTimeLeft(result.survey.duration_minutes * 60); // Convert to seconds
      setShowSurveyForm(true);
      setAnswers([]); // Reset answers
      setMessage(result.message);
      setMessageType('info');
    } else {
      setMessage(result.message);
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(a => a.question_index === questionIndex);
      
      if (existingAnswerIndex >= 0) {
        // Update existing answer
        const updated = [...prev];
        updated[existingAnswerIndex] = { question_index: questionIndex, selected_option_index: optionIndex };
        return updated;
      } else {
        // Add new answer
        return [...prev, { question_index: questionIndex, selected_option_index: optionIndex }];
      }
    });
  };

  const handleSubmitSurvey = async () => {
    if (!currentResponseId || !activeSurvey) return;

    // Check if all required questions are answered
    const unansweredQuestions = activeSurvey.questions.filter((question, index) => 
      question.required && !answers.find(a => a.question_index === index)
    );

    if (unansweredQuestions.length > 0) {
      setMessage(`Please answer all required questions. ${unansweredQuestions.length} question(s) remaining.`);
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await submitSurveyAnswers(currentResponseId, answers);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
      
      // Reset survey state
      setActiveSurvey(null);
      setCurrentResponseId(null);
      setShowSurveyForm(false);
      setAnswers([]);
      setTimeLeft(0);
      
      // Reload available surveys
      await loadSurveys();
      await loadSurveyHistory();
    } else {
      setMessage(result.message);
      setMessageType('error');
      
      // If survey failed due to wrong answer or timeout, close it
      if (result.message.includes('Incorrect answer') || result.message.includes('time expired')) {
        setActiveSurvey(null);
        setCurrentResponseId(null);
        setShowSurveyForm(false);
        setAnswers([]);
        setTimeLeft(0);
        await loadSurveys();
      }
    }
    
    setSubmitting(false);
  };

  const handleTimeExpired = async () => {
    if (!currentResponseId) return;
    
    setMessage('Time expired! Survey automatically submitted.');
    setMessageType('error');
    
    // Submit with current answers (will fail due to timeout)
    const result = await submitSurveyAnswers(currentResponseId, answers);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
    }
    
    // Reset survey state
    setActiveSurvey(null);
    setCurrentResponseId(null);
    setShowSurveyForm(false);
    setAnswers([]);
    setTimeLeft(0);
    
    // Reload available surveys
    await loadSurveys();
    await loadSurveyHistory();
  };

  const handleCloseSurvey = () => {
    setActiveSurvey(null);
    setCurrentResponseId(null);
    setShowSurveyForm(false);
    setAnswers([]);
    setTimeLeft(0);
    setMessage('Survey cancelled.');
    setMessageType('info');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      await loadSurveyHistory();
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earn with Surveys</h1>
          <p className="text-gray-600 mt-2">Complete surveys and earn KSH 50 for each correct submission</p>
        </div>
        <button
          onClick={toggleHistory}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-150 font-medium"
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {message && (
        <Alert 
          type={messageType} 
          message={message} 
          onClose={() => setMessage(null)} 
        />
      )}

      {/* Survey History */}
      {showHistory && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Survey History</h2>
          {surveyHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No survey history available.</p>
          ) : (
            <div className="space-y-4">
              {surveyHistory.map((history) => (
                <div key={history.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{history.survey_title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      history.payout_credited 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {history.payout_credited ? 'Paid' : 'Not Paid'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Category:</span> {history.survey_category}
                    </div>
                    <div>
                      <span className="font-medium">Score:</span> {history.score}%
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {history.time_taken_seconds}s
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {history.status.replace('_', ' ')}
                    </div>
                  </div>
                  {history.completed_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      Completed: {new Date(history.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Survey Form */}
      {showSurveyForm && activeSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header with Timer */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{activeSurvey.title}</h2>
                <div className={`text-lg font-bold ${
                  timeLeft < 60 ? 'text-red-300 animate-pulse' : 'text-white'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              <p className="text-indigo-100">{activeSurvey.description}</p>
              <div className="flex justify-between items-center mt-4 text-sm">
                <span>Payout: KSH {(activeSurvey.payout_cents / 100).toFixed(2)}</span>
                <span>Questions: {activeSurvey.questions.length}</span>
                <span>Category: {activeSurvey.category.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Survey Questions */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {activeSurvey.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 text-lg">
                      {questionIndex + 1}. {question.question_text}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = answers.find(a => 
                          a.question_index === questionIndex
                        )?.selected_option_index === optionIndex;
                        
                        return (
                          <label 
                            key={optionIndex}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${questionIndex}`}
                              value={optionIndex}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(questionIndex, optionIndex)}
                              className="hidden"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-500' 
                                : 'border-gray-400'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-gray-700">{option.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleCloseSurvey}
                  disabled={submitting}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150 disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <div className="text-sm text-gray-600">
                  {answers.length} of {activeSurvey.questions.length} questions answered
                </div>
                
                <button
                  onClick={handleSubmitSurvey}
                  disabled={submitting || answers.length < activeSurvey.questions.length}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit Survey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Surveys */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Surveys</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Surveys Available</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              There are no surveys available at the moment. New surveys are released every Tuesday at 9:00 PM EAT.
              Check back later for new opportunities to earn!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-800 flex-1 mr-2">{survey.title}</h3>
                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium capitalize">
                      {survey.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{survey.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Payout:</span>
                      <span className="font-semibold text-green-600">
                        KSH {(survey.payout_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium">{survey.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Questions:</span>
                      <span className="font-medium">{survey.questions.length}</span>
                    </div>
                    {survey.expires_at && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Expires:</span>
                        <span className="font-medium text-red-600">
                          {new Date(survey.expires_at).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartSurvey(survey.id)}
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition duration-150 font-medium shadow-md hover:shadow-lg"
                  >
                    Start Survey
                  </button>
                </div>
                
                {/* Survey Topics */}
                {survey.topics && survey.topics.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
                    <div className="flex flex-wrap gap-1">
                      {survey.topics.slice(0, 3).map((topic, index) => (
                        <span 
                          key={index}
                          className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                      {survey.topics.length > 3 && (
                        <span className="text-gray-400 text-xs px-2 py-1">
                          +{survey.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Survey Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Survey Guidelines</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Each survey pays KSH 50 for successful completion
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            You have exactly 5 minutes to complete each survey
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Payment is only credited for surveys with all correct answers
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Surveys close immediately if a wrong answer is selected
          </li>
          <li className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            New surveys are released every Tuesday at 9:00 PM EAT
          </li>
        </ul>
      </div>
    </div>
  );
}
