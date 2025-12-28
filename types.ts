export interface FinetuningExample {
  id: string;
  user: string;
  model: string;
}

export interface WebSource {
  id: string;
  url: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  imageUrl?: string;
  sourceUrl?: string;
}

export interface Config {
  provider: 'gemini' | 'custom';
  systemInstruction: string;
  offTopicResponse: string;
  finetuningExamples: FinetuningExample[];
  knowledgeSource: 'none' | 'google' | 'urls';
  webSources: WebSource[];
  localRecipes: Recipe[];
  geminiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  temperature: number;
  customEndpoint?: string;
  customModel?: string;
}

export interface MessageSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: MessageSource[];
}