import { Config } from './types';

export const ADMIN_PASSWORD = 'recetas2024';

export const DEFAULT_CONFIG: Config = {
  provider: 'gemini',
  // customEndpoint and customModel are optional and used when provider is 'custom'
  customEndpoint: 'http://localhost:1234/v1',
  customModel: 'google/gemma-3-1b',
  systemInstruction: "Ets un xef expert de renom mundial, especialista en cuina saludable. Ets amigable, servicial i t'apassiona ensenyar a la gent a cuinar. Proporciona receptes saludables clares, pas a pas, i crea menús setmanals equilibrats i deliciosos. Ofereix consells útils per a un estil de vida saludable. Respon sempre en català.",
  offTopicResponse: "Ho sento, només puc parlar de cuina. Tens alguna pregunta sobre receptes, ingredients, menús saludables o tècniques culinàries?",
  finetuningExamples: [],
  knowledgeSource: 'none',
  webSources: [],
  localRecipes: [],
  // geminiModel is kept for compatibility but not used when provider is 'custom'
  geminiModel: 'gemini-2.5-flash',
  temperature: 0.7,
};