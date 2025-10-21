// app/admin/surveys/SurveysManagement.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateAISurvey, createSurvey, getAdminSurveys, getAdminSurveyResponses } from '@/app/actions/surveys';
import Alert from '@/app/ui/Alert';
import Link from 'next/link';

// --- Type Definitions for Data Structures (Assuming structure from actions) ---
interface AdminSurvey {
  _id: string;
  title: string;
  category: string;
  status: string;
  current_responses: number;
  max_responses: number;
  payout_cents: number;
  scheduled_for: string;
}

interface AdminSurveyResponse {
  _id: string;
  survey_title: string;
  user_email: string;
  completed_at: string;
  score: number;
  status: string;
  payout_credited: boolean;
  payout_amount_cents: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// --- Helper Components for Tabs ---

function ManageSurveysList({ initialData }: { initialData: { data: AdminSurvey[], pagination: Pagination } }) {
  const [data, setData] = useState(initialData.data);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [currentPage, setCurrentPage] = useState(initialData.pagination.page);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    const result = await getAdminSurveys(page, 10);
    if (result.success && result.data) {
      setData(result.data as AdminSurvey[]);
      setPagination(result.pagination!);
      setCurrentPage(page);
    }
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Scheduled & Completed Surveys</h3>
      {loading ? (
        <div className="text-center py-8 text-indigo-600">Loading surveys...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No surveys found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled For</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((survey) => (
                  <tr key={survey._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{survey.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        survey.status === 'active' ? 'bg-green-100 text-green-800' :
                        survey.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey.current_responses} / {survey.max_responses || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      KES {(survey.payout_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(survey.scheduled_for).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
            </p>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => fetchData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchData(currentPage + 1)}
                disabled={currentPage === pagination.pages || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function SurveyResponsesList({ initialData }: { initialData: { data: AdminSurveyResponse[], pagination: Pagination } }) {
  const [data, setData] = useState(initialData.data);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [currentPage, setCurrentPage] = useState(initialData.pagination.page);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    const result = await getAdminSurveyResponses(page, 10);
    if (result.success && result.data) {
      setData(result.data as AdminSurveyResponse[]);
      setPagination(result.pagination!);
      setCurrentPage(page);
    }
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">User Survey Responses</h3>
      {loading ? (
        <div className="text-center py-8 text-indigo-600">Loading responses...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No responses found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Survey Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((response) => (
                  <tr key={response._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{response.survey_title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.user_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        response.status === 'completed' ? 'bg-green-100 text-green-800' :
                        response.status === 'wrong_answer' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {response.status.replace('_', ' ').charAt(0).toUpperCase() + response.status.replace('_', ' ').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.score ? response.score.toFixed(0) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {response.payout_credited ? (
                            <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                            <span className="text-red-600 font-medium">No</span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.completed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
            </p>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => fetchData(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchData(currentPage + 1)}
                disabled={currentPage === pagination.pages || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}


// --- Main Component ---

export default function SurveysManagement() {
  const [activeTab, setActiveTab] = useState('create');
  const [numberOfQuestions, setNumberOfQuestions] = useState('5');
  const [category, setCategory] = useState('market_research');
  const [topics, setTopics] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [generatedSurvey, setGeneratedSurvey] = useState<any>(null);

  // Data states for Manage and Responses tabs
  const [adminSurveys, setAdminSurveys] = useState<{ data: AdminSurvey[], pagination: Pagination } | null>(null);
  const [adminResponses, setAdminResponses] = useState<{ data: AdminSurveyResponse[], pagination: Pagination } | null>(null);

  // Helper function to fetch data for the active tab
  const fetchDataForTab = useCallback(async (tab: string) => {
    setLoading(true);
    setMessage(null);
    try {
      if (tab === 'manage') {
        const result = await getAdminSurveys(1, 10);
        if (result.success && result.data) {
          setAdminSurveys({ data: result.data as AdminSurvey[], pagination: result.pagination! });
        } else {
          setMessage(result.message || 'Failed to load surveys.');
          setMessageType('error');
          setAdminSurveys({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
        }
      } else if (tab === 'responses') {
        const result = await getAdminSurveyResponses(1, 10);
        if (result.success && result.data) {
          setAdminResponses({ data: result.data as AdminSurveyResponse[], pagination: result.pagination! });
        } else {
          setMessage(result.message || 'Failed to load responses.');
          setMessageType('error');
          setAdminResponses({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
        }
      }
    } catch (error) {
      setMessage('An error occurred while fetching data.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to load data when switching tabs
  useEffect(() => {
    if (activeTab !== 'create' && !adminSurveys && !adminResponses) {
      fetchDataForTab(activeTab);
    }
  }, [activeTab, adminSurveys, adminResponses, fetchDataForTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'manage' && !adminSurveys) {
      fetchDataForTab(tab);
    }
    if (tab === 'responses' && !adminResponses) {
      fetchDataForTab(tab);
    }
    setMessage(null); // Clear messages on tab switch
  };


  const handleGenerateSurvey = async () => {
    if (!topics.trim()) {
      setMessage('Please enter survey topics.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Split topics by commas and trim each one
      const topicsArray = topics.split(',').map(topic => topic.trim()).filter(topic => topic);
      
      const result = await generateAISurvey(
        topicsArray,
        category,
        parseInt(numberOfQuestions)
      );

      if (result.success && result.data) {
        setGeneratedSurvey(result.data);
        setMessage('Survey generated successfully! Review and create the survey.');
        setMessageType('success');
      } else {
        setMessage(result.message || 'Failed to generate survey.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error generating survey:', error);
      setMessage('An error occurred while generating the survey.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = async () => {
    if (!generatedSurvey) {
      setMessage('No survey data available. Please generate a survey first.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Calculate next Tuesday at 21:00 EAT
      const nextTuesday = getNextTuesday();
      
      const result = await createSurvey({
        ...generatedSurvey,
        scheduled_for: nextTuesday
      });

      if (result.success) {
        setMessage(`Survey created successfully! It will be available on ${nextTuesday.toLocaleString()}`);
        setMessageType('success');
        setGeneratedSurvey(null);
        setTopics('');
        // Force reload of Manage Surveys tab next time it's opened
        setAdminSurveys(null);
      } else {
        setMessage(result.message || 'Failed to create survey.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      setMessage('An error occurred while creating the survey.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get next Tuesday at 21:00
  const getNextTuesday = () => {
    const date = new Date();
    const day = date.getDay();
    // Tuesday is day 2 (0 = Sunday, 1 = Monday, 2 = Tuesday, etc.)
    // If today is Tuesday, check the time. If before 21:00, it's today. Otherwise, next week.
    let daysUntilTuesday = 0;
    
    if (day === 2) {
      // Check if it's already past 21:00
      if (date.getHours() >= 21) {
        daysUntilTuesday = 7; // Schedule for next Tuesday
      } else {
        daysUntilTuesday = 0; // Schedule for today's Tuesday
      }
    } else {
      // Calculate days until next Tuesday
      daysUntilTuesday = day < 2 ? 2 - day : 9 - day;
    }
    
    const nextTuesday = new Date(date);
    nextTuesday.setDate(date.getDate() + daysUntilTuesday);
    nextTuesday.setHours(21, 0, 0, 0); // 9:00 PM EAT
    
    return nextTuesday;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => handleTabChange('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create Survey
          </button>
          <button
            onClick={() => handleTabChange('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manage'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Surveys
          </button>
          <button
            onClick={() => handleTabChange('responses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'responses'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Survey Responses
          </button>
        </nav>
      </div>

      {message && (
        <Alert 
          type={messageType} 
          message={message} 
          onClose={() => setMessage(null)} 
        />
      )}

      <div className="min-h-[400px]">
        {/* CREATE SURVEY TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                AI-Powered Survey Creation
              </h3>
              <p className="text-blue-700 text-sm">
                Create engaging surveys using AI. Simply provide topics and let the system generate 
                multiple-choice questions automatically. Surveys are scheduled for **Tuesdays at 9:00 PM EAT**.
              </p>
            </div>

            {!generatedSurvey ? (
              // Survey Generation Form
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Survey Topics *
                    </label>
                    <textarea
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="Enter topics separated by commas (e.g., consumer preferences, product feedback, market trends)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate multiple topics with commas
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="market_research">Market Research</option>
                      <option value="consumer_insights">Consumer Insights</option>
                      <option value="product_feedback">Product Feedback</option>
                      <option value="academic">Academic</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Questions
                    </label>
                    <select 
                      value={numberOfQuestions}
                      onChange={(e) => setNumberOfQuestions(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="3">3 Questions</option>
                      <option value="5">5 Questions</option>
                      <option value="7">7 Questions</option>
                      <option value="10">10 Questions</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Survey Rules & Schedule</h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p><strong>Payout:</strong> KSH 50 (5000 cents) per *correctly* completed survey</p>
                      <p><strong>Duration:</strong> 5 minutes time limit</p>
                      <p><strong>Distribution:</strong> Automatically assigned to eligible users</p>
                      <p><strong>Schedule:</strong> Tuesdays at 9:00 PM EAT</p>
                      <p>
                        <strong>Next Schedule Slot:</strong> 
                        <span className="font-medium text-indigo-600 ml-1">
                          {getNextTuesday().toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateSurvey}
                    disabled={loading || !topics.trim()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 font-medium disabled:bg-indigo-300 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate Survey with AI'}
                  </button>

                  <div className="text-xs text-gray-500">
                    <p>• Only **fully correct** responses within the time limit are credited.</p>
                    <p>• The system automatically handles user assignment and payout.</p>
                  </div>
                </div>
              </div>
            ) : (
              // Survey Review and Creation
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Survey Generated Successfully! 🎉
                  </h3>
                  <p className="text-green-700 text-sm">
                    Review the AI-generated survey below. Click **Create Survey** to schedule it for the next slot.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-lg text-gray-800 mb-2">
                        {generatedSurvey.title}
                      </h4>
                      <p className="text-gray-600 mb-4">{generatedSurvey.description}</p>
                      
                      <div className="space-y-4">
                        {generatedSurvey.questions.map((question: any, index: number) => (
                          <div key={index} className="border-t pt-4 first:border-t-0 first:pt-0">
                            <h5 className="font-semibold text-gray-800 mb-2">
                              {index + 1}. {question.question_text}
                            </h5>
                            <div className="space-y-2 ml-4">
                              {question.options.map((option: any, optIndex: number) => (
                                <div 
                                  key={optIndex}
                                  className={`flex items-center p-2 rounded ${
                                    option.is_correct 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <span className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded-full text-sm mr-2">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span className={option.is_correct ? 'text-green-700 font-medium' : 'text-gray-700'}>
                                    {option.text}
                                    {option.is_correct && (
                                      <span className="ml-2 text-green-600 text-xs">✓ Correct Answer</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Confirmation Details</h4>
                      <div className="space-y-3 text-sm text-gray-600">
                        <p><strong>Category:</strong> {generatedSurvey.category}</p>
                        <p><strong>Topics:</strong> {generatedSurvey.topics.join(', ')}</p>
                        <p><strong>Questions:</strong> {generatedSurvey.questions.length}</p>
                        <p><strong>Payout:</strong> KSH 50</p>
                        <p><strong>Duration:</strong> 5 minutes</p>
                        <p><strong>Scheduled for:</strong> {getNextTuesday().toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleCreateSurvey}
                        disabled={loading}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150 font-medium disabled:bg-green-300"
                      >
                        {loading ? 'Creating...' : 'Create Survey'}
                      </button>
                      <button
                        onClick={() => setGeneratedSurvey(null)}
                        disabled={loading}
                        className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-150 font-medium disabled:bg-gray-300"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANAGE SURVEYS TAB */}
        {activeTab === 'manage' && (
          <div className="py-4">
            {loading && (
              <div className="text-center py-12 text-indigo-600">
                <p>Loading survey list...</p>
              </div>
            )}
            {!loading && adminSurveys && adminSurveys.data.length > 0 && (
              <ManageSurveysList initialData={adminSurveys} />
            )}
            {!loading && adminSurveys && adminSurveys.data.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Surveys Created Yet</h3>
                <p className="text-gray-500">Create your first survey using the AI generator tab.</p>
              </div>
            )}
          </div>
        )}

        {/* SURVEY RESPONSES TAB */}
        {activeTab === 'responses' && (
          <div className="py-4">
            {loading && (
              <div className="text-center py-12 text-indigo-600">
                <p>Loading survey responses...</p>
              </div>
            )}
            {!loading && adminResponses && adminResponses.data.length > 0 && (
              <SurveyResponsesList initialData={adminResponses} />
            )}
            {!loading && adminResponses && adminResponses.data.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Survey Responses Yet</h3>
                <p className="text-gray-500">Survey responses will appear here once users start completing surveys.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
