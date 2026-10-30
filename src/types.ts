export type GameType = 'none' | 'colors' | 'vf' | 'quiz' | 'hangman' | 'stop';
export type GameState = 'waiting' | 'question_released' | 'answer_revealed' | 'finished';

export interface Room {
  id: string;
  roomNumber: string;
  password: string;
  activeGame: GameType;
  gameState: GameState;
  currentQuestionId?: string;
  activeThemeId?: string;
  forbiddenColor?: string;
  activeLetter?: string;
  timer?: number;
  lastUpdate: string;
}

export interface Participant {
  uid: string;
  name: string;
  team?: string;
  points: number;
  lastAnswer?: string;
  lastAnswerTime?: number;
  isOnline: boolean;
}

export interface Question {
  id: string;
  text: string;
  options?: string[]; // A, B, C, D
  correctAnswer: string; // "V", "F" or index or text
}

export interface Theme {
  id: string;
  name: string;
  type: 'vf' | 'quiz';
  questions: Question[];
}

export interface HangmanWord {
  id: string;
  word: string;
  category: string;
  hint1: string;
  hint2: string;
  hintExtra: string;
}
