import './styles/styles.css';
import { UI_STRINGS, LANGUAGE_OPTIONS } from './strings'
import { loadSettings, saveSettings, QuestionSettings } from './settings'

interface GameData {
  civs: Record<string, {
    help_string_id: number,
    name_string_id: number,
  }>;
}

interface LocaleStrings {
  [key: number]: string;
}

interface QueuedQuestion {
  label: string;
  text: string;
  civilization: string;
}

let gameData: GameData | null = null;
let localeStrings: LocaleStrings = {};
let questionQueue: QueuedQuestion[] = [];
let questionIndex = 0;
let score = 0;
let wrongQuestions: QueuedQuestion[] = [];
let allCivNames: string[] = [];
let scoresheetTotal = parseInt(localStorage.getItem('scoresheetTotal') || '0', 10);
const AOE2_DATA_CACHE = "aoe2techtree-json-v2";
const AOE2_DATA_BASE_URL = "https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/master/";
const AOE2_DATA_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/master/";

interface QuestionTypeCounts {
  bonuses: number;
  units: number;
  techs: number;
  team: number;
}

type UiKey = keyof typeof UI_STRINGS.en;
let uiStrings: Record<UiKey, string> = UI_STRINGS.en;
let questionSettings: QuestionSettings = loadSettings();
console.log("Queston Settings:", questionSettings);

async function readRepoFile(filePath: string): Promise<string> {
  const url = `${AOE2_DATA_BASE_URL}${filePath}`;
  const cacheKey = new Request(url, { method: "GET" });

  if (!("caches" in window)) {
    for (const sourceUrl of [url, `${AOE2_DATA_FALLBACK_BASE_URL}${filePath}`]) {
      const response = await fetch(sourceUrl);
      if (response.ok) {
        return await response.text();
      }
    }
    throw new Error(`Failed to fetch ${filePath} from all available sources`);
  }

  const cache = await caches.open(AOE2_DATA_CACHE);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return await cachedResponse.text();
  }

  let lastError: Error | null = null;
  for (const sourceUrl of [url, `${AOE2_DATA_FALLBACK_BASE_URL}${filePath}`]) {
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        lastError = new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
        continue;
      }

      await cache.put(cacheKey, response.clone());
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${filePath} from all available sources`);
}

async function loadLocale(locale: string): Promise<void> {
  try {
    const stringsJson = await readRepoFile(`data/locales/${locale}/strings.json`);
    localeStrings = JSON.parse(stringsJson);
    console.log(`Loaded locale: ${locale}`);
    applyUiStrings(locale);

    // Update autocomplete suggestions with localized civ names
    allCivNames = Object.keys(gameData!.civs).map(civKey => {
      return getLocalizedString(gameData!.civs[civKey].name_string_id);
    }).sort();

  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error);
    // Fallback to English if locale fails to load
    if (locale !== "en") {
      await loadLocale("en");
    } else {
      applyUiStrings("en");
    }
  }
}

function findAllMatches(input: string): string[] {
  if (!input) return [];

  const normalized = input.toLowerCase();

  return allCivNames.filter((civName) =>
    civName.toLowerCase().startsWith(normalized))
}

function findBestMatch(input: string): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase();

  // Find first civ that starts with the input
  for (const civName of allCivNames) {
    if (civName.toLowerCase().startsWith(normalized)) {
      return civName;
    }
  }

  return null;
}

const suggestions = document.getElementById("suggestions") as HTMLUListElement;
let currentSuggestions: string[] = [];

function updateSuggestions(matches: string[]): void {
  currentSuggestions = matches;

  suggestions.replaceChildren();

  matches.forEach((match, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}: ${match}`;

    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      acceptSuggestion(index);
    });

    suggestions.appendChild(li);
  });
}

function acceptSuggestion(index: number): void {
  const suggestion = currentSuggestions[index];

  if (!suggestion) {
    return;
  }

  answerInput.value = suggestion;
  answerInput.setSelectionRange(suggestion.length, suggestion.length);

  currentSuggestions = [];
  suggestions.replaceChildren();
}

function updateAutocomplete(input: HTMLInputElement): void {
  const currentValue = input.value;

  const matches = findAllMatches(currentValue);
  updateSuggestions(matches);

  if (matches.length === 0 || currentValue === "") {
    return;
  }

  const cursorPos = input.selectionStart ?? 0;
  const selectionEnd = input.selectionEnd ?? 0;

  // Only inline-complete if the cursor is at the end and nothing is selected.
  if (cursorPos !== currentValue.length || cursorPos !== selectionEnd) {
    return;
  }

  const bestMatch = matches[0];

  input.value = bestMatch;
  input.setSelectionRange(currentValue.length, bestMatch.length);
}

function handleAutocompleteInput(event: Event): void {
  const inputEvent = event as InputEvent;

  if (inputEvent.isComposing) {
    return;
  }

  updateAutocomplete(event.target as HTMLInputElement);
}

function getLocalizedString(stringId: number): string {
  return localeStrings[stringId] || `${stringId}`;
}

function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ');
}

function uiText(key: UiKey): string {
  return uiStrings[key] || UI_STRINGS.en[key] || key;
}

function applyUiStrings(locale: string): void {
  uiStrings = (UI_STRINGS[locale] as Record<UiKey, string>) || UI_STRINGS.en;
  document.documentElement.lang = locale;

  const setText = (id: string, text: string) => {
    const el = document.querySelector(`#${id}`);
    if (el) el.textContent = text;
  };

  setText("setup-title", uiText("setupTitle"));
  setText("setup-description", uiText("setupDescription"));
  setText("language-heading", uiText("languageHeading"));
  setText("question-language-label", uiText("questionLanguageLabel"));
  setText("question-types-heading", uiText("questionTypesHeading"));
  setText("question-type-bonuses", uiText("questionTypeBonuses"));
  setText("question-type-units", uiText("questionTypeUnits"));
  setText("question-type-techs", uiText("questionTypeTechs"));
  setText("question-type-team", uiText("questionTypeTeam"));
  setText("question-count-heading", uiText("questionCountHeading"));
  setText("setup-start-button", uiText("startQuizButton"));
  setText("settings-title", uiText("settingsTitle"));
  setText("settings-close", uiText("closeButton"));
  setText("results-title", uiText("resultsTitle"));
  setText("results-total-label", uiText("resultsTotal"));
  setText("results-correct-label", uiText("resultsCorrect"));
  setText("results-wrong-label", uiText("resultsWrong"));
  setText("results-accuracy-label", uiText("resultsAccuracy"));
  updateQuestionTypeCounts();

  const lightModeLabel = document.querySelector("#settings-modal .switch-row span");
  if (lightModeLabel) lightModeLabel.textContent = uiText("lightMode");

  if (newQuizButton) newQuizButton.textContent = uiText("createNewQuiz");
  if (rerunWrongButton) {
    rerunWrongButton.textContent = rerunWrongButton.disabled ? uiText("noWrongAnswers") : uiText("rerunWrongOnly");
  }
  if (settingsButton) settingsButton.setAttribute("aria-label", uiText("settingsTitle"));
  document.title = "AoE2 Civilization Quiz";
}

function parseHelptext(helptext: string) {
  if (!helptext) return {};

  // Normalize whitespace between colon and </b> (e.g. "Spezialeinheiten: </b>" → "Spezialeinheiten:</b>")
  helptext = helptext.replace(/([:：])\s+<\/b>/g, '$1</b>');

  let bonusesLocalized = uiText('fallbackCivBonus');
  let uniqueUnitsLocalized = '';
  let uniqueTechsLocalized = '';
  let teamBonusLocalized = '';

  let civType = '';
  const bonuses: string[] = [];
  const uniqueUnits: string[] = [];
  const uniqueTechs: string[] = [];
  let teamBonus = '';

  let lineStartIndex = 0;
  let inBlock = "civ";
  let blockStartIndex = 0;
  for (let i = 0; i < helptext.length; i++) {
    const c = helptext[i];
    if (helptext.slice(i, i + 5) === ":</b>" || helptext.slice(i, i + 5) === "：</b>") {
      if (inBlock === "bonus") {
        const block = helptext.slice(blockStartIndex, lineStartIndex).trim().replace(/<br>/g, "").replace(/<\/b>/g, "").replace(/\n/g, "").trim();
        bonuses.push(...block.split("•").filter((line) => line.length > 0).map((line) => line.trim()));
        uniqueUnitsLocalized = helptext.slice(lineStartIndex, i).replace(/<b>/g, "").trim();
        inBlock = "unit";
      }
      else if (inBlock === "unit") {
        const block = helptext.slice(blockStartIndex, lineStartIndex).trim().replace(/<br>/g, "").replace(/<\/b>/g, "").trim();
        uniqueUnits.push(...block.split(", ").map((s) => s.replace(/•/g, "").trim()));
        uniqueTechsLocalized = helptext.slice(lineStartIndex, i).replace(/<b>/g, "").trim();
        inBlock = "tech";
      }
      else if (inBlock === "tech") {
        const block = helptext.slice(blockStartIndex, lineStartIndex).trim().replace(/<br>/g, "").replace(/<\/b>/g, "").replace(/\n/g, "").trim();
        uniqueTechs.push(...block.split("•").filter((line) => line.length > 0).map((line) => line.trim()));
        teamBonusLocalized = helptext.slice(lineStartIndex, i).replace(/<b>/g, "").trim();
        inBlock = "team";
      }

      blockStartIndex = i + 1;
    }
    if (c === '\n') {
      const line = helptext.slice(lineStartIndex, i);
      lineStartIndex = i + 1;
      if (line.replace("<br>", "").trim() === '') {
        continue;
      }
      if (civType === '') {
        civType = line.replace("<br>", "").trim();
        inBlock = "bonus";
        blockStartIndex = i;
        continue;
      }

    }

    if (i === helptext.length - 1) {
      const line = helptext.slice(lineStartIndex, helptext.length);
      teamBonus = line.replace(/•/g, "").trim();
    }
  }
  return { civType, bonuses, uniqueUnits, uniqueTechs, teamBonus, bonusesLocalized, uniqueUnitsLocalized, uniqueTechsLocalized, teamBonusLocalized };
}

function getQuestionTypeCounts(): QuestionTypeCounts {
  if (!gameData) {
    return { bonuses: 0, units: 0, techs: 0, team: 0 };
  }

  const counts: QuestionTypeCounts = { bonuses: 0, units: 0, techs: 0, team: 0 };

  for (const civKey of Object.keys(gameData.civs)) {
    const civHelptextId = gameData.civs[civKey].help_string_id;
    const localizedHelptext = getLocalizedString(civHelptextId);
    const parsed = parseHelptext(localizedHelptext);

    counts.bonuses += parsed.bonuses?.length ?? 0;
    counts.units += parsed.uniqueUnits?.length ?? 0;
    counts.techs += parsed.uniqueTechs?.length ?? 0;
    counts.team += parsed.teamBonus ? 1 : 0;
  }

  return counts;
}

function updateQuestionTypeCounts(): void {
  const counts = getQuestionTypeCounts();

  const setCount = (id: string, value: number) => {
    const el = document.querySelector(`#${id}`);
    if (el) el.textContent = value.toString();
  };

  setCount("question-type-bonuses-count", counts.bonuses);
  setCount("question-type-units-count", counts.units);
  setCount("question-type-techs-count", counts.techs);
  setCount("question-type-team-count", counts.team);
}

function generateQuestionSet(): QueuedQuestion[] {
  const questions = buildQuestionPool(questionSettings);

  // Fisher-Yates shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions.slice(0, questionSettings.questionCount);
}

function buildQuestionPool(settings: QuestionSettings): QueuedQuestion[] {
  if (!gameData) throw new Error("Game data not loaded");

  const questions: QueuedQuestion[] = [];

  for (const civKey of Object.keys(gameData.civs)) {
    const civNameId = gameData.civs[civKey].name_string_id;
    const civHelptextId = gameData.civs[civKey].help_string_id;
    const localizedName = getLocalizedString(civNameId);
    const localizedHelptext = getLocalizedString(civHelptextId);
    const parsed = parseHelptext(localizedHelptext);

    // console.log(civKey, parsed);
    if (settings.bonuses && parsed.bonuses && parsed.bonuses.length > 0) {
      for (const bonus of parsed.bonuses) {
        questions.push({ label: parsed.bonusesLocalized ?? uiText("fallbackCivBonus"), text: bonus, civilization: localizedName });
      }
    }

    if (settings.units && parsed.uniqueUnits) {
      for (const unit of parsed.uniqueUnits) {
        questions.push({ label: parsed.uniqueUnitsLocalized ?? uiText("fallbackUniqueUnit"), text: unit, civilization: localizedName });
      }
    }

    if (settings.techs && parsed.uniqueTechs) {
      for (const tech of parsed.uniqueTechs) {
        questions.push({ label: parsed.uniqueTechsLocalized ?? uiText("fallbackUniqueTech"), text: tech, civilization: localizedName });
      }
    }

    if (settings.team && parsed.teamBonus) {
      questions.push({ label: parsed.teamBonusLocalized ?? uiText("fallbackTeamBonus"), text: parsed.teamBonus, civilization: localizedName });
    }
  }

  return questions;
}

function getMaxQuestionCount(settings: QuestionSettings = questionSettings): number {
  return Math.max(1, buildQuestionPool(settings).length);
}

function animateScoreToScoresheet(onComplete: () => void) {
  const scoreEl = document.querySelector("#score") as HTMLElement;
  const scoresheetEl = document.querySelector("#scoresheet") as HTMLElement;
  if (!scoreEl || !scoresheetEl) {
    onComplete();
    return;
  }

  const scoreRect = scoreEl.getBoundingClientRect();
  const sheetRect = scoresheetEl.getBoundingClientRect();

  const floater = document.createElement("div");
  floater.className = "score-floater";
  floater.textContent = `+${score}`;
  floater.style.left = `${scoreRect.left + scoreRect.width / 2}px`;
  floater.style.top = `${scoreRect.top + scoreRect.height / 2}px`;
  document.body.appendChild(floater);

  const dx = (sheetRect.left + sheetRect.width / 2) - (scoreRect.left + scoreRect.width / 2);
  const dy = (sheetRect.top + sheetRect.height / 2) - (scoreRect.top + scoreRect.height / 2);
  floater.style.setProperty("--fly-dx", `${dx}px`);
  floater.style.setProperty("--fly-dy", `${dy}px`);
  floater.classList.add("flying");

  floater.addEventListener("animationend", () => {
    floater.remove();
    scoresheetEl.classList.add("scoresheet-bump");
    scoresheetEl.addEventListener("animationend", () => {
      scoresheetEl.classList.remove("scoresheet-bump");
    }, { once: true });
    onComplete();
  }, { once: true });
}

function addToScoresheet() {
  scoresheetTotal += score;
  localStorage.setItem('scoresheetTotal', scoresheetTotal.toString());
  const scoresheetValueEl = document.querySelector("#scoresheet-value");
  if (scoresheetValueEl) scoresheetValueEl.textContent = scoresheetTotal.toString();
}

function showSetupScreen() {
  const setupEl = document.querySelector("#quiz-setup") as HTMLElement | null;
  const quizContainer = document.querySelector("#quiz-container") as HTMLElement | null;
  if (setupEl) setupEl.style.display = "block";
  if (quizContainer) quizContainer.style.display = "none";
}

function showQuizScreen() {
  const setupEl = document.querySelector("#quiz-setup") as HTMLElement | null;
  const quizContainer = document.querySelector("#quiz-container") as HTMLElement | null;
  if (setupEl) setupEl.style.display = "none";
  if (quizContainer) quizContainer.style.display = "block";
}

function hideResultsModal() {
  if (resultsModal) resultsModal.style.display = "none";
}

function openResultsModal() {
  if (resultsModal) resultsModal.style.display = "flex";
}

function renderResultsModal() {
  const total = questionQueue.length;
  const wrong = wrongQuestions.length;
  const correct = score;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const totalEl = document.querySelector("#results-total");
  const correctEl = document.querySelector("#results-correct");
  const wrongEl = document.querySelector("#results-wrong");
  const accuracyEl = document.querySelector("#results-accuracy");
  const rerunWrongButton = document.querySelector("#rerun-wrong-button") as HTMLButtonElement | null;

  if (totalEl) totalEl.textContent = total.toString();
  if (correctEl) correctEl.textContent = correct.toString();
  if (wrongEl) wrongEl.textContent = wrong.toString();
  if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
  if (rerunWrongButton) {
    rerunWrongButton.disabled = wrong === 0;
    rerunWrongButton.textContent = wrong === 0 ? uiText("noWrongAnswers") : uiText("rerunWrongOnly");
  }
}

function finishQuiz() {
  animateScoreToScoresheet(() => {
    addToScoresheet();
    renderResultsModal();
    openResultsModal();
  });
}

function startQuiz(questions?: QueuedQuestion[]) {
  hideResultsModal();
  if (settingsModal) settingsModal.style.display = "none";
  showQuizScreen();
  questionQueue = questions ? [...questions] : generateQuestionSet();
  questionIndex = 0;
  score = 0;
  wrongQuestions = [];

  displayQuestion();
}

function displayQuestion() {
  // If we've gone through all questions, show the final overview
  if (questionIndex >= questionQueue.length) {
    finishQuiz();
    return;
  }

  const question = questionQueue[questionIndex];

  const questionLabelEl = document.querySelector("#question-label");
  const questionEl = document.querySelector("#question");
  const imageContainer = document.querySelector("#image-container");
  const feedbackEl = document.querySelector("#feedback");
  const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
  const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
  const nextButton = document.querySelector("#next-button") as HTMLButtonElement;

  if (questionLabelEl && questionEl && imageContainer && feedbackEl && answerInput && submitButton && nextButton) {
    questionLabelEl.textContent = question.label;
    questionEl.textContent = question.text;
    imageContainer.innerHTML = "";
    feedbackEl.innerHTML = "";
    answerInput.value = "";
    answerInput.disabled = false;
    submitButton.style.display = "block";
    nextButton.style.display = "none";
    const questionNumberEl = document.querySelector("#question-number");
    const questionTotalEl = document.querySelector("#question-total");
    if (questionNumberEl) questionNumberEl.textContent = (questionIndex + 1).toString();
    if (questionTotalEl) questionTotalEl.textContent = questionQueue.length.toString();
    answerInput.focus();
  }
}

function checkAnswer(userAnswer: string) {
  const question = questionQueue[questionIndex];
  if (!question) return;

  const feedbackEl = document.querySelector("#feedback");
  const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
  const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
  const nextButton = document.querySelector("#next-button") as HTMLButtonElement;

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(question.civilization);

  if (normalizedUser === normalizedCorrect) {
    score++;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: green; font-weight: bold;">✓ ${question.civilization}</div>`;
    }
  } else {
    wrongQuestions.push(question);
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: red; font-weight: bold;">✗ ${question.civilization}</div>`;
    }
  }

  if (answerInput) answerInput.disabled = true;
  if (submitButton) submitButton.style.display = "none";

  if (nextButton) {
    nextButton.style.display = "block";
    nextButton.focus();
  }

  questionIndex++;
}

const quizSetupForm = document.querySelector("#quiz-setup-form");
const answerForm = document.querySelector("#answer-form");
const nextButton = document.querySelector("#next-button");
const languagePickerModal = document.querySelector("#language-picker-modal") as HTMLElement;
const languagePickerOptions = document.querySelector("#language-picker-options") as HTMLElement;
const settingLocale = document.querySelector("#setting-locale") as HTMLSelectElement;
const settingLightMode = document.querySelector("#setting-light-mode") as HTMLInputElement;
const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
const appTitle = document.querySelector("#app-title") as HTMLHeadingElement | null;
const settingsButton = document.querySelector("#settings-button") as HTMLButtonElement;
const settingsModal = document.querySelector("#settings-modal") as HTMLElement;
const settingsClose = document.querySelector("#settings-close") as HTMLButtonElement;
const resultsModal = document.querySelector("#results-modal") as HTMLElement;
const setupStartButton = document.querySelector("#setup-start-button") as HTMLButtonElement | null;
const newQuizButton = document.querySelector("#new-quiz-button") as HTMLButtonElement;
const rerunWrongButton = document.querySelector("#rerun-wrong-button") as HTMLButtonElement;

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

function hasSavedQuestionSettings(): boolean {
  return localStorage.getItem('questionSettings') !== null;
}

function renderLanguagePicker(): void {
  if (!languagePickerOptions) return;

  languagePickerOptions.innerHTML = "";
  for (const option of LANGUAGE_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-picker-option";
    button.dataset.locale = option.locale;
    button.textContent = option.label;
    languagePickerOptions.appendChild(button);
  }

  languagePickerOptions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const locale = (button as HTMLButtonElement).dataset.locale;
      if (!locale) return;
      questionSettings.locale = locale;
      saveSettings(questionSettings);
      if (settingLocale) settingLocale.value = locale;
      hideLanguagePicker();
      await loadLocale(locale);
      syncSettingsFormFromState();
      showSetupScreen();
    });
  });
}

function showLanguagePicker(): void {
  const setupEl = document.querySelector("#quiz-setup") as HTMLElement | null;
  if (setupEl) setupEl.style.display = "none";
  if (languagePickerModal) languagePickerModal.style.display = "flex";
}

function hideLanguagePicker(): void {
  if (languagePickerModal) languagePickerModal.style.display = "none";
}

function syncSettingsFormFromState() {
  const settingBonuses = document.querySelector("#setting-bonuses") as HTMLInputElement | null;
  const settingUnits = document.querySelector("#setting-units") as HTMLInputElement | null;
  const settingTechs = document.querySelector("#setting-techs") as HTMLInputElement | null;
  const settingTeam = document.querySelector("#setting-team") as HTMLInputElement | null;
  const settingQuestionCount = document.querySelector("#setting-question-count") as HTMLInputElement | null;
  const questionCountValue = document.querySelector("#question-count-value") as HTMLElement | null;

  if (settingBonuses) settingBonuses.checked = questionSettings.bonuses;
  if (settingUnits) settingUnits.checked = questionSettings.units;
  if (settingTechs) settingTechs.checked = questionSettings.techs;
  if (settingTeam) settingTeam.checked = questionSettings.team;
  const maxQuestions = getMaxQuestionCount(questionSettings);
  const clampedQuestionCount = Math.min(questionSettings.questionCount, maxQuestions);
  questionSettings.questionCount = clampedQuestionCount;
  if (settingQuestionCount) {
    settingQuestionCount.max = maxQuestions.toString();
    settingQuestionCount.value = clampedQuestionCount.toString();
  }
  if (questionCountValue) questionCountValue.textContent = clampedQuestionCount.toString();
  if (settingLocale) settingLocale.value = questionSettings.locale;
  if (settingLightMode) settingLightMode.checked = questionSettings.theme === 'light';
}

function applySettingsFromSetupForm() {
  const settingBonuses = document.querySelector("#setting-bonuses") as HTMLInputElement | null;
  const settingUnits = document.querySelector("#setting-units") as HTMLInputElement | null;
  const settingTechs = document.querySelector("#setting-techs") as HTMLInputElement | null;
  const settingTeam = document.querySelector("#setting-team") as HTMLInputElement | null;
  const settingQuestionCount = document.querySelector("#setting-question-count") as HTMLInputElement | null;
  const questionCountValue = document.querySelector("#question-count-value") as HTMLElement | null;

  const updatedSettings = {
    ...questionSettings,
    bonuses: settingBonuses?.checked ?? false,
    units: settingUnits?.checked ?? false,
    techs: settingTechs?.checked ?? false,
    team: settingTeam?.checked ?? false,
  };

  if (!updatedSettings.bonuses && !updatedSettings.units && !updatedSettings.techs && !updatedSettings.team) {
    questionSettings = updatedSettings;
    saveSettings(questionSettings);
    updateSetupStartButtonState();
    return;
  }

  const maxQuestions = getMaxQuestionCount(updatedSettings);
  if (settingQuestionCount) {
    settingQuestionCount.max = maxQuestions.toString();
    const parsed = parseInt(settingQuestionCount.value, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      updatedSettings.questionCount = Math.min(parsed, maxQuestions);
    } else {
      updatedSettings.questionCount = Math.min(updatedSettings.questionCount, maxQuestions);
    }
    settingQuestionCount.value = updatedSettings.questionCount.toString();
  } else {
    updatedSettings.questionCount = Math.min(updatedSettings.questionCount, maxQuestions);
  }

  if (questionCountValue) questionCountValue.textContent = updatedSettings.questionCount.toString();

  questionSettings = updatedSettings;
  saveSettings(questionSettings);
  updateSetupStartButtonState();
}

function getSelectedQuestionTypeCount(): number {
  return ["#setting-bonuses", "#setting-units", "#setting-techs", "#setting-team"].reduce((count, selector) => {
    const input = document.querySelector(selector) as HTMLInputElement | null;
    return count + (input?.checked ? 1 : 0);
  }, 0);
}

function updateSetupStartButtonState(): void {
  if (!setupStartButton) return;
  setupStartButton.disabled = getSelectedQuestionTypeCount() === 0;
}

// Apply saved theme on load
applyTheme(questionSettings.theme);

async function initApp() {
  try {
    // Load game data
    const data_json_str = await readRepoFile("data/data.json");
    gameData = JSON.parse(data_json_str);

    // Load default locale (English)
    await loadLocale(questionSettings.locale);
    // console.log(localeStrings);

    renderLanguagePicker();
    syncSettingsFormFromState();
    updateSetupStartButtonState();
    if (hasSavedQuestionSettings()) {
      showSetupScreen();
    } else {
      showLanguagePicker();
    }

    if (appTitle) {
      appTitle.addEventListener("click", () => {
        hideResultsModal();
        hideLanguagePicker();
        if (settingsModal) settingsModal.style.display = "none";
        syncSettingsFormFromState();
        updateSetupStartButtonState();
        showSetupScreen();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Settings modal
    if (settingsButton && settingsModal) {
      settingsButton.addEventListener("click", () => {
        syncSettingsFormFromState();
        settingsModal.style.display = "flex";
      });
    }

    if (settingsClose && settingsModal) {
      settingsClose.addEventListener("click", () => {
        settingsModal.style.display = "none";
      });
    }

    if (settingLightMode) {
      settingLightMode.addEventListener("change", () => {
        questionSettings.theme = settingLightMode.checked ? 'light' : 'dark';
        applyTheme(questionSettings.theme);
        saveSettings(questionSettings);
      });
    }

    if (settingLocale) {
      settingLocale.addEventListener("change", async (e) => {
        const target = e.target as HTMLSelectElement;
        questionSettings.locale = target.value;
        saveSettings(questionSettings);
        await loadLocale(target.value);
      });
    }

    if (quizSetupForm) {
      quizSetupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (getSelectedQuestionTypeCount() === 0) {
          updateSetupStartButtonState();
          return;
        }
        applySettingsFromSetupForm();
        hideLanguagePicker();
        startQuiz();
      });
    }

    const setupCheckboxes = [
      document.querySelector("#setting-bonuses"),
      document.querySelector("#setting-units"),
      document.querySelector("#setting-techs"),
      document.querySelector("#setting-team"),
    ];

    setupCheckboxes.forEach((element) => {
      if (!element) return;
      element.addEventListener("change", () => {
        applySettingsFromSetupForm();
      });
    });

    const settingQuestionCount = document.querySelector("#setting-question-count") as HTMLInputElement | null;
    if (settingQuestionCount) {
      const syncSliderDisplay = () => {
        const questionCountValue = document.querySelector("#question-count-value") as HTMLElement | null;
        if (questionCountValue) questionCountValue.textContent = settingQuestionCount.value;
      };

      settingQuestionCount.addEventListener("input", () => {
        const parsed = parseInt(settingQuestionCount.value, 10);
        if (Number.isFinite(parsed) && parsed >= 1) {
          questionSettings.questionCount = parsed;
          saveSettings(questionSettings);
        }
        syncSliderDisplay();
      });

      settingQuestionCount.addEventListener("change", () => {
        applySettingsFromSetupForm();
      });
    }

    if (newQuizButton) {
      newQuizButton.addEventListener("click", () => {
        hideResultsModal();
        hideLanguagePicker();
        syncSettingsFormFromState();
        updateSetupStartButtonState();
        showSetupScreen();
      });
    }

    if (rerunWrongButton) {
      rerunWrongButton.addEventListener("click", () => {
        if (wrongQuestions.length > 0) {
          startQuiz(wrongQuestions);
        }
      });
    }

    if (answerInput) {
      answerInput.addEventListener("input", handleAutocompleteInput);

      answerInput.addEventListener("keydown", (e) => {
        const n = Number(e.key);

        // Accept suggestion by number key
        if (n >= 1 && n <= currentSuggestions.length) {
          e.preventDefault();
          acceptSuggestion(n - 1);
          return;
        }

        if (e.key !== "Backspace") {
          return;
        }

        const input = e.target as HTMLInputElement;
        const selectionStart = input.selectionStart ?? 0;
        const selectionEnd = input.selectionEnd ?? 0;

        if (selectionStart === selectionEnd) {
          return;
        }

        e.preventDefault();

        const newValue = input.value.substring(0, Math.max(0, selectionStart - 1));

        input.value = newValue;
        input.setSelectionRange(newValue.length, newValue.length);

        updateAutocomplete(input);
      });

      function hideSuggestions(): void {
        currentSuggestions = [];
        suggestions.replaceChildren();
      }

      answerInput.addEventListener("blur", () => {
        // Delay so clicking a suggestion still works
        setTimeout(() => {
          hideSuggestions();
        }, 100);
      });
    }

    if (answerForm) {
      answerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nextButton = document.querySelector("#next-button") as HTMLButtonElement;

        if (answerInput && answerInput.value.trim() && !answerInput.disabled) {
          checkAnswer(answerInput.value);
        } else if (nextButton && nextButton.style.display !== "none") {
          // Go to next question
          displayQuestion();
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", (e) => {
        e.preventDefault();
        displayQuestion();
      });
    }

    // Restore scoresheet from localStorage
    const scoresheetValueEl = document.querySelector("#scoresheet-value");
    if (scoresheetValueEl) scoresheetValueEl.textContent = scoresheetTotal.toString();

  } catch (error) {
    console.error("Failed to initialize quiz:", error);
    const questionEl = document.querySelector("#question");
    if (questionEl) {
      questionEl.textContent = "Error loading quiz data. Please refresh the page.";
    }
  }
}
window.addEventListener("DOMContentLoaded", initApp);
