'use client';

import { useState, useEffect, useCallback } from 'react';
import Alert from '@/app/ui/Alert';
import { 
  getAvailableSurveys, 
  startSurvey, 
  submitSurveyAnswers, 
  getSurveyHistory
} from '@/app/actions/surveys';
import type { Survey, SurveyAnswer } from '@/types/survey';

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
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userStats, setUserStats] = useState<{ accuracy_rate?: number } | null>(null);

  // Fixed: Use useCallback with proper dependencies
  const handleTimeExpired = useCallback(async () => {
    if (!currentResponseId) return;
    
    setMessage('Time expired! Survey automatically submitted.');
    setMessageType('error');
    
    try {
      // Submit with current answers (will fail due to timeout)
      const result = await submitSurveyAnswers(currentResponseId, answers);
      
      // FIXED: Don't log as error - this is expected behavior
      if (result && result.success) {
        setMessage(result.message || 'Survey submitted successfully!');
        setMessageType('success');
      } else {
        setMessage(result?.message || 'Survey submission failed due to timeout.');
        setMessageType('error');
      }
    } catch (error) {
      // Only log actual unexpected errors
      console.error('Unexpected error in handleTimeExpired:', error);
      setMessage('An unexpected error occurred.');
      setMessageType('error');
    }
    
    // Reset survey state
    setActiveSurvey(null);
    setCurrentResponseId(null);
    setShowSurveyForm(false);
    setAnswers([]);
    setTimeLeft(0);
    setCurrentQuestionIndex(0);
    
    // Reload available surveys
    await loadSurveys();
    await loadSurveyHistory();
  }, [currentResponseId, answers]);

  // Timer effect for active survey - FIXED: Proper cleanup and dependencies
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
  }, [activeSurvey, timeLeft, handleTimeExpired]);

  // Load available surveys - FIXED: Added proper dependency array
  useEffect(() => {
    loadSurveys();
    loadSurveyHistory();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const result = await getAvailableSurveys();
      if (result && result.success) {
        setSurveys(result.data || []);
        if (result.message && result.data?.length === 0) {
          setAvailabilityMessage(result.message);
        } else {
          setAvailabilityMessage('');
        }
      } else {
        setMessage(result?.message || 'Failed to load surveys.');
        setMessageType('error');
        setAvailabilityMessage(result?.message || '');
      }
    } catch (error) {
      setMessage('Failed to load surveys.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const loadSurveyHistory = async () => {
    try {
      const result = await getSurveyHistory();
      if (result && result.success && result.data) {
        setSurveyHistory(result.data);
        
        // Calculate user accuracy from history
        if (result.data.length > 0) {
          const correctCount = result.data.filter((h: any) => h.all_correct).length;
          const totalCount = result.data.length;
          const accuracyRate = (correctCount / totalCount) * 100;
          setUserStats({ accuracy_rate: Math.round(accuracyRate * 100) / 100 });
        }
      }
    } catch (error) {
      console.error('Failed to load survey history:', error);
    }
  };

  const handleStartSurvey = async (surveyId: string) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await startSurvey(surveyId);
      
      if (result && result.success && result.survey && result.responseId) {
        setActiveSurvey(result.survey);
        setCurrentResponseId(result.responseId);
        setTimeLeft(result.survey.duration_minutes * 60); // Convert to seconds
        setShowSurveyForm(true);
        setAnswers([]); // Reset answers
        setCurrentQuestionIndex(0); // Start with first question
        setMessage(result.message);
        setMessageType('info');
      } else {
        setMessage(result?.message || 'Failed to start survey.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to start survey.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
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

  const handleNextQuestion = () => {
    if (activeSurvey && currentQuestionIndex < activeSurvey.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitSurvey = async () => {
    if (!currentResponseId || !activeSurvey) return;

    // Check if all required questions are answered
    const requiredQuestions = activeSurvey.questions
      .map((q, idx) => ({ question: q, index: idx }))
      .filter(item => item.question.required);

    const answeredIndices = answers.map(a => a.question_index);
    const unansweredRequired = requiredQuestions.filter(
      item => !answeredIndices.includes(item.index)
    );

    if (unansweredRequired.length > 0) {
      setMessage(
        `Please answer all required questions. ${unansweredRequired.length} question(s) remaining.`
      );
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await submitSurveyAnswers(currentResponseId, answers);

      // FIXED: This is the key change - don't treat expected failures as errors
      if (result) {
        // Determine message type based on success
        if (result.success) {
          setMessage(result.message || 'Survey submitted successfully!');
          setMessageType('success');
        } else {
          // This is expected behavior (wrong answer, timeout, etc.)
          // Don't log it as an error - just show the message
          setMessage(result.message || 'Survey not completed successfully.');
          setMessageType('error');
        }
        
        // Reset survey state for both success and expected failures
        setActiveSurvey(null);
        setCurrentResponseId(null);
        setShowSurveyForm(false);
        setAnswers([]);
        setTimeLeft(0);
        setCurrentQuestionIndex(0);
        
        // Reload data
        await loadSurveys();
        await loadSurveyHistory();
      } else {
        // This shouldn't happen, but handle it gracefully
        setMessage('No response received from server. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      // Only log actual unexpected errors (network issues, etc.)
      console.error('Unexpected error submitting survey:', error);
      setMessage('An unexpected error occurred. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSurvey = () => {
    setActiveSurvey(null);
    setCurrentResponseId(null);
    setShowSurveyForm(false);
    setAnswers([]);
    setTimeLeft(0);
    setCurrentQuestionIndex(0);
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

  // Get current question for single-question display
  const currentQuestion = activeSurvey?.questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.question_index === currentQuestionIndex);
  const isLastQuestion = activeSurvey && currentQuestionIndex === activeSurvey.questions.length - 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earn with Surveys</h1>
          <p className="text-gray-600 mt-2">Complete surveys and earn KSH 50 for each correct submission</p>
          
          {/* ADDED: Display user accuracy rate */}
          {userStats && typeof userStats.accuracy_rate === 'number' && (
            <div className="mt-3 inline-flex items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-semibold">Your Accuracy: {userStats.accuracy_rate}%</span>
            </div>
          )}
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

      {/* Availability Message */}
      {availabilityMessage && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-700">{availabilityMessage}</p>
          </div>
        </div>
      )}

      {/* Survey History */}
      {showHistory && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Survey History</h2>
            {/* ADDED: Summary stats */}
            {surveyHistory.length > 0 && (
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-800">{surveyHistory.length}</div>
                  <div className="text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">
                    {surveyHistory.filter(h => h.all_correct).length}
                  </div>
                  <div className="text-gray-500">Correct</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-indigo-600">
                    {userStats?.accuracy_rate || 0}%
                  </div>
                  <div className="text-gray-500">Accuracy</div>
                </div>
              </div>
            )}
          </div>
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
                      <span className="font-medium">Score:</span> {history.score || 0}%
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {history.time_taken_seconds || 0}s
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

      {/* Active Survey Form - SINGLE QUESTION DISPLAY */}
      {showSurveyForm && activeSurvey && currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header with Timer and Progress */}
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
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span>Question {currentQuestionIndex + 1} of {activeSurvey.questions.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / activeSurvey.questions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-indigo-400 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / activeSurvey.questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Single Question Display */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                  {currentQuestion.question_text}
                  {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = currentAnswer?.selected_option_index === optionIndex;
                    
                    return (
                      <label 
                        key={optionIndex}
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestionIndex}`}
                          value={optionIndex}
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(currentQuestionIndex, optionIndex)}
                          className="hidden"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-500' 
                            : 'border-gray-400'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-gray-700 text-base">{option.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0 || submitting}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={handleCloseSurvey}
                    disabled={submitting}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150 disabled:opacity-50"
                  >
                    Cancel Survey
                  </button>
                </div>
                
                <div className="text-sm text-gray-600">
                  {answers.length} of {activeSurvey.questions.length} answered
                </div>
                
                {!isLastQuestion ? (
                  <button
                    onClick={handleNextQuestion}
                    disabled={!currentAnswer || submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300 disabled:cursor-not-allowed font-medium"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitSurvey}
                    disabled={submitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 disabled:bg-green-300 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Survey'}
                  </button>
                )}
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
              {availabilityMessage || 'There are no surveys available at the moment. Check back on Tuesday at 9:00 PM EAT or when admin enables surveys.'}
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
            New surveys are released every Tuesday at 9:00 PM EAT or when admin enables them
          </li>
        </ul>
      </div>
    </div>
  );
}
