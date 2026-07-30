export interface QuestionSettings {
  bonuses: boolean;
  units: boolean;
  techs: boolean;
  team: boolean;
  locale: string;
  theme: 'light' | 'dark';
  questionCount: number;
}


export function loadSettings(): QuestionSettings {
  const saved = localStorage.getItem('questionSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.theme) {
        parsed.theme = 'light';
      }
      if (parsed.questionCount === undefined) {
        parsed.questionCount = 10;
      }
      return {
        bonuses: parsed.bonuses ?? true,
        units: parsed.units ?? true,
        techs: parsed.techs ?? true,
        team: parsed.team ?? true,
        locale: parsed.locale ?? "en",
        theme: parsed.theme ?? 'light',
        questionCount: parsed.questionCount,
      };
    } catch (e) {
      console.error('Failed to parse saved settings:', e);
    }
  }
  return {
    bonuses: true,
    units: true,
    techs: true,
    team: true,
    locale: "en",
    theme: 'light',
    questionCount: 10,
  };
}

export function saveSettings(settings: QuestionSettings): void {
  localStorage.setItem('questionSettings', JSON.stringify(settings));
}

