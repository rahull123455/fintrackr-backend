export type PredictionTrend = 'increasing' | 'decreasing' | 'stable';
export type PredictionConfidence = 'low' | 'medium' | 'high';

export interface CategoryPrediction {
  category: string;
  predictedAmount: number;
  trend: PredictionTrend;
  changePercent: number;
  confidence: PredictionConfidence;
  rationale: string;
}

export interface PredictionResponse {
  month: string;
  predictedTotal: number;
  summary: string;
  insights: string[];
  categories: CategoryPrediction[];
  generatedAt: string;
}
