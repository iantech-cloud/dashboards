export interface SurveyQuestion {
  question_text: string;
  question_type: "multiple_choice";
  options: Array<{
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_index: number;
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  topics: string[];
  payout_cents: number;
  duration_minutes: number;
  questions: SurveyQuestion[];
  status: string;
  scheduled_for?: Date;
  expires_at?: Date;
  current_responses: number;
  max_responses: number;
  is_manually_enabled?: boolean;
  created_by: {
    id: string;
    username: string;
    email: string;
  };
}

export interface SurveyAnswer {
  question_index: number;
  selected_option_index: number;
}
