import './styles.css';

interface GameData {
  civ_names: Record<string, string>;
  civ_helptexts: Record<string, string>;
}

interface LocaleStrings {
  [key: string]: string;
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
let allCivNames: string[] = [];
let scoresheetTotal = parseInt(localStorage.getItem('scoresheetTotal') || '0', 10);

function applyFunMode(nofun: boolean) {
  if (!nofun) {
    document.body.setAttribute('data-funmode', 'true');
  } else {
    document.body.removeAttribute('data-funmode');
  }
}

function spawnConfetti(count: number) {
  const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff', '#ff00ff', '#00ffff'];
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'fun-confetti';
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = `${6 + Math.random() * 10}px`;
    confetti.style.height = `${6 + Math.random() * 10}px`;
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    confetti.style.animationDuration = `${1 + Math.random() * 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3500);
  }
}

function triggerScreenShake() {
  document.body.classList.add('fun-shake');
  setTimeout(() => document.body.classList.remove('fun-shake'), 600);
}

function getCaretPixelPosition(input: HTMLInputElement): { x: number; y: number } {
  const rect = input.getBoundingClientRect();
  const style = getComputedStyle(input);
  const span = document.createElement('span');
  span.style.font = style.font;
  span.style.fontSize = style.fontSize;
  span.style.fontFamily = style.fontFamily;
  span.style.letterSpacing = style.letterSpacing;
  span.style.position = 'absolute';
  span.style.visibility = 'hidden';
  span.style.whiteSpace = 'pre';
  span.textContent = input.value.substring(0, input.selectionStart || input.value.length);
  document.body.appendChild(span);
  const textWidth = span.getBoundingClientRect().width;
  span.remove();

  const paddingLeft = parseFloat(style.paddingLeft);
  const x = Math.min(rect.left + paddingLeft + textWidth, rect.right - 10);
  return { x, y: rect.top + rect.height / 2 };
}

function spawnTypingParticles(x: number, y: number) {
  const colors = ['#ff0088', '#00ff88', '#0088ff', '#ff8800', '#ff00ff', '#00ffff', '#ffff00', '#ff4444', '#8800ff', '#00ff00'];
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'typing-particle';
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 35;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 4px ${particle.style.backgroundColor}`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
  }
}

function triggerTypingShake() {
  document.body.classList.remove('fun-typing-shake');
  void document.body.offsetWidth;
  document.body.classList.add('fun-typing-shake');
  setTimeout(() => document.body.classList.remove('fun-typing-shake'), 100);
}

function triggerInputPop(input: HTMLInputElement) {
  input.classList.remove('fun-typing-pop');
  void input.offsetWidth;
  input.classList.add('fun-typing-pop');
  setTimeout(() => input.classList.remove('fun-typing-pop'), 200);
}

function createParticleEffect(element: Element) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const particleCount = 12;
  const colors = ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#15803d'];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random angle for burst direction
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const distance = 40 + Math.random() * 30;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 6px ${particle.style.background}`;

    element.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => particle.remove(), 800);
  }
}

interface QuestionSettings {
  bonuses: boolean;
  units: boolean;
  techs: boolean;
  team: boolean;
  locale: string;
  theme: 'light' | 'dark';
  nofun: boolean;
  questionCount: number;
}

function loadSettings(): QuestionSettings {
  const saved = localStorage.getItem('questionSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Add theme if it doesn't exist in old saved settings
      if (!parsed.theme) {
        parsed.theme = 'light';
      }
      // Add nofun if it doesn't exist in old saved settings
      if (parsed.nofun === undefined) {
        parsed.nofun = false;
      }
      if (parsed.questionCount === undefined) {
        parsed.questionCount = 10;
      }
      return parsed;
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
    nofun: true,
    questionCount: 10,
  };
}

function saveSettings(settings: QuestionSettings): void {
  localStorage.setItem('questionSettings', JSON.stringify(settings));
}

let questionSettings: QuestionSettings = loadSettings();
console.log(questionSettings);

async function readRepoFile(filePath: string): Promise<string> {
  const response = await fetch(`/aoe2techtree/${filePath}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
  }
  return await response.text();
}

async function loadLocale(locale: string): Promise<void> {
  try {
    const stringsJson = await readRepoFile(`data/locales/${locale}/strings.json`);
    localeStrings = JSON.parse(stringsJson);
    console.log(`Loaded locale: ${locale}`);

    // Update autocomplete suggestions with localized civ names
    updateAutocompleteSuggestions();
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error);
    // Fallback to English if locale fails to load
    if (locale !== "en") {
      await loadLocale("en");
    }
  }
}

function updateAutocompleteSuggestions(): void {
  if (!gameData) return;

  // Get all civilization names in current locale
  allCivNames = Object.keys(gameData.civ_names).map(civKey => {
    const civNameId = gameData!.civ_names[civKey];
    return getLocalizedString(civNameId);
  }).sort();
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

function handleAutocompleteInput(event: Event): void {
  const inputEvent = event as InputEvent;
  const input = event.target as HTMLInputElement;
  const cursorPos = input.selectionStart || 0;
  const selectionEnd = input.selectionEnd || 0;

  // Detect if user is deleting (backspace/delete keys)
  if (inputEvent.inputType === 'deleteContentBackward' || inputEvent.inputType === 'deleteContentForward') {
    return;
  }

  // Only autocomplete if cursor is at the end and there's no existing selection
  if (cursorPos !== input.value.length || cursorPos !== selectionEnd) {
    return;
  }

  const currentValue = input.value;
  const bestMatch = findBestMatch(currentValue);

  if (bestMatch && currentValue) {
    // Set the value to the full match
    input.value = bestMatch;
    // Select the autocompleted part
    input.setSelectionRange(currentValue.length, bestMatch.length);
  }
}

function getLocalizedString(stringId: string): string {
  return localeStrings[stringId] || stringId;
}

function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseHelptext(helptext: string) {
  if (!helptext) return {};

  // Normalize whitespace between colon and </b> (e.g. "Spezialeinheiten: </b>" → "Spezialeinheiten:</b>")
  helptext = helptext.replace(/([:：])\s+<\/b>/g, '$1</b>');

  let bonusesLocalized = 'Civ Bonus';
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
    if (helptext.slice(i, i+5) === ":</b>" || helptext.slice(i, i+5) === "：</b>") {
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

function generateQuestionSet(): QueuedQuestion[] {
  if (!gameData) throw new Error("Game data not loaded");

  const questions: QueuedQuestion[] = [];

  for (const civKey of Object.keys(gameData.civ_names)) {
    const civNameId = gameData.civ_names[civKey];
    const civHelptextId = gameData.civ_helptexts[civKey];
    const localizedName = getLocalizedString(civNameId);
    const localizedHelptext = getLocalizedString(civHelptextId);
    const parsed = parseHelptext(localizedHelptext);

    console.log(civKey, parsed);
    if (questionSettings.bonuses && parsed.bonuses && parsed.bonuses.length > 0) {
      for (const bonus of parsed.bonuses) {
        questions.push({ label: parsed.bonusesLocalized ?? "Civ Bonus", text: bonus, civilization: localizedName });
      }
    }

    if (questionSettings.units && parsed.uniqueUnits) {
      for (const unit of parsed.uniqueUnits) {
        questions.push({ label: parsed.uniqueUnitsLocalized ?? 'Unique Unit', text: unit, civilization: localizedName });
      }
    }

    if (questionSettings.techs && parsed.uniqueTechs) {
      for (const tech of parsed.uniqueTechs) {
        questions.push({ label: parsed.uniqueTechsLocalized ?? 'Unique Tech', text: tech, civilization: localizedName });
      }
    }

    if (questionSettings.team && parsed.teamBonus) {
      questions.push({ label: parsed.teamBonusLocalized ?? 'Team Bonus', text: parsed.teamBonus, civilization: localizedName });
    }
  }

  // Fisher-Yates shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions.slice(0, questionSettings.questionCount);
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

function resetQuiz() {
  questionQueue = generateQuestionSet();
  questionIndex = 0;
  score = 0;

  const scoreValueEl = document.querySelector("#score-value");
  const totalValueEl = document.querySelector("#total-value");
  if (scoreValueEl) scoreValueEl.textContent = "0";
  if (totalValueEl) totalValueEl.textContent = questionQueue.length.toString();
  displayQuestion();
}

function displayQuestion() {
  // If we've gone through all questions, transfer score to scoresheet and start new set
  if (questionIndex >= questionQueue.length) {
    animateScoreToScoresheet(() => {
      addToScoresheet();
      score = 0;
    
      questionQueue = generateQuestionSet();
      questionIndex = 0;
      const scoreValueEl = document.querySelector("#score-value");
      const totalValueEl = document.querySelector("#total-value");
      if (scoreValueEl) scoreValueEl.textContent = "0";
      if (totalValueEl) totalValueEl.textContent = questionQueue.length.toString();
      displayQuestion();
    });
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

  const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;

  if (questionLabelEl && questionEl && imageContainer && feedbackEl && answerInput && submitButton && nextButton) {
    questionLabelEl.textContent = question.label;
    questionEl.textContent = question.text;
    imageContainer.innerHTML = "";
    feedbackEl.innerHTML = "";
    answerInput.value = "";
    answerInput.disabled = false;
    if (questionSettings.nofun) {
      submitButton.style.display = "none";
      if (submitButtonNoFun) submitButtonNoFun.style.display = "flex";
    } else {
      submitButton.style.display = "block";
      if (submitButtonNoFun) submitButtonNoFun.style.display = "none";
    }
    nextButton.style.display = "none";
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
  const scoreValueEl = document.querySelector("#score-value");

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(question.civilization);

  if (normalizedUser === normalizedCorrect) {
    score++;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: green; font-weight: bold;">✓ ${question.civilization}</div>`;
    }
    const scoreEl = document.querySelector("#score");
    if (scoreEl) {
      createParticleEffect(scoreEl);
    }
    if (!questionSettings.nofun) {
      spawnConfetti(30);
    }
  } else {
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: red; font-weight: bold;">✗ ${question.civilization}</div>`;
    }
    if (!questionSettings.nofun) {
      triggerScreenShake();
    }
  }

  if (scoreValueEl) scoreValueEl.textContent = score.toString();

  const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;

  if (answerInput) answerInput.disabled = true;
  if (submitButton) submitButton.style.display = "none";
  if (submitButtonNoFun) submitButtonNoFun.style.display = "none";
  if (nextButton) {
    nextButton.style.display = "block";
    nextButton.focus();
  }

  questionIndex++;
}

const answerForm = document.querySelector("#answer-form");
const nextButton = document.querySelector("#next-button");
const localeDropdown = document.querySelector("#locale-dropdown") as HTMLSelectElement;
const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
const settingsButton = document.querySelector("#settings-button") as HTMLButtonElement;
const settingsModal = document.querySelector("#settings-modal") as HTMLElement;
const settingsClose = document.querySelector("#settings-close") as HTMLButtonElement;
const themeToggle = document.querySelector("#theme-toggle") as HTMLButtonElement;

localeDropdown.value = questionSettings.locale;

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.textContent = '☀️';
  } else {
    document.body.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = '🌙';
  }
}

function toggleTheme() {
  questionSettings.theme = questionSettings.theme === 'light' ? 'dark' : 'light';
  applyTheme(questionSettings.theme);
  saveSettings(questionSettings);
}

// Apply saved theme and fun mode on load
applyTheme(questionSettings.theme);
applyFunMode(questionSettings.nofun);

async function initApp() {
  try {
    // Set up event listeners


    // Load game data
    const data_json_str = await readRepoFile("data/data.json");
    gameData = JSON.parse(data_json_str);
    console.log("Game data loaded successfully");
    // console.log(gameData);

    // Load default locale (English)
    await loadLocale(questionSettings.locale);
    // console.log(localeStrings);


    // Theme toggle
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }

    // Settings modal
    if (settingsButton && settingsModal) {
      settingsButton.addEventListener("click", () => {
        settingsModal.style.display = "flex";
      });
    }

    if (settingsClose && settingsModal) {
      settingsClose.addEventListener("click", () => {
        settingsModal.style.display = "none";
      });
    }

    // Settings checkboxes
    const settingBonuses = document.querySelector("#setting-bonuses") as HTMLInputElement;
    const settingUnits = document.querySelector("#setting-units") as HTMLInputElement;
    const settingTechs = document.querySelector("#setting-techs") as HTMLInputElement;
    const settingTeam = document.querySelector("#setting-team") as HTMLInputElement;
    const settingNoFun = document.querySelector("#setting-nofun") as HTMLInputElement;
    const settingQuestionCount = document.querySelector("#setting-question-count") as HTMLInputElement;

    // Load saved settings into checkboxes
    if (settingBonuses) settingBonuses.checked = questionSettings.bonuses;
    if (settingUnits) settingUnits.checked = questionSettings.units;
    if (settingTechs) settingTechs.checked = questionSettings.techs;
    if (settingTeam) settingTeam.checked = questionSettings.team;
    if (settingNoFun) settingNoFun.checked = questionSettings.nofun;
    if (settingQuestionCount) settingQuestionCount.value = questionSettings.questionCount.toString();

    // Update button visibility based on No Fun Mode
    const updateButtonVisibility = () => {
      const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
      const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;

      if (questionSettings.nofun) {
        if (submitButton) submitButton.style.display = "none";
        if (submitButtonNoFun) submitButtonNoFun.style.display = "flex";
      } else {
        if (submitButton) submitButton.style.display = "block";
        if (submitButtonNoFun) submitButtonNoFun.style.display = "none";
      }
    };

    // Initial button visibility
    updateButtonVisibility();

    [settingBonuses, settingUnits, settingTechs, settingTeam].forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          questionSettings.bonuses = settingBonuses?.checked || false;
          questionSettings.units = settingUnits?.checked || false;
          questionSettings.techs = settingTechs?.checked || false;
          questionSettings.team = settingTeam?.checked || false;

          // Ensure at least one is checked
          if (!questionSettings.bonuses && !questionSettings.units &&
            !questionSettings.techs && !questionSettings.team) {
            checkbox.checked = true;
            if (checkbox === settingBonuses) questionSettings.bonuses = true;
            if (checkbox === settingUnits) questionSettings.units = true;
            if (checkbox === settingTechs) questionSettings.techs = true;
            if (checkbox === settingTeam) questionSettings.team = true;
          }

          // Save settings and regenerate question set
          saveSettings(questionSettings);
          resetQuiz();
        });
      }
    });

    // Handle No Fun Mode toggle
    if (settingNoFun) {
      settingNoFun.addEventListener("change", () => {
        questionSettings.nofun = settingNoFun.checked;
        updateButtonVisibility();
        applyFunMode(questionSettings.nofun);
        saveSettings(questionSettings);
      });
    }

    // Handle question count change
    if (settingQuestionCount) {
      settingQuestionCount.addEventListener("change", () => {
        const val = parseInt(settingQuestionCount.value, 10);
        if (val >= 1) {
          questionSettings.questionCount = val;
          saveSettings(questionSettings);
          resetQuiz();
        }
      });
    }

    if (answerInput) {
      answerInput.addEventListener("input", handleAutocompleteInput);

      // Fun mode typing effects: particles, screen shake, character size pop
      answerInput.addEventListener("input", () => {
        if (questionSettings.nofun || answerInput.disabled) return;
        const pos = getCaretPixelPosition(answerInput);
        spawnTypingParticles(pos.x, pos.y);
        triggerTypingShake();
        triggerInputPop(answerInput);
      });

      // Handle backspace to delete selection AND last typed character
      answerInput.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
          const input = e.target as HTMLInputElement;
          const selectionStart = input.selectionStart || 0;
          const selectionEnd = input.selectionEnd || 0;

          // If there's a selection (autocompleted text)
          if (selectionStart !== selectionEnd && selectionStart < selectionEnd) {
            e.preventDefault();
            // Delete the selection and the last typed character
            const newValue = input.value.substring(0, Math.max(0, selectionStart - 1));
            input.value = newValue;
            input.setSelectionRange(newValue.length, newValue.length);

            // Trigger autocomplete with the new value
            const bestMatch = findBestMatch(newValue);
            if (bestMatch && newValue) {
              input.value = bestMatch;
              input.setSelectionRange(newValue.length, bestMatch.length);
            }
          }
        }
      });
    }

    // Handle submit button GIF animation on hover/click
    const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
    const animatedImg = submitButton?.querySelector(".animated-img") as HTMLImageElement;

    if (submitButton && animatedImg) {
      const gifSrc = "/gifs/stan-twt-skeleton-banging-shield.gif";
      let animationTimeout: number | null = null;

      const playAnimation = () => {
        // Reload GIF to restart from beginning
        animatedImg.src = gifSrc + "?t=" + new Date().getTime();
        submitButton.classList.add("playing");

        // Clear any existing timeout
        if (animationTimeout) {
          clearTimeout(animationTimeout);
        }

        // Stop animation after GIF duration (estimate ~2 seconds)
        animationTimeout = window.setTimeout(() => {
          submitButton.classList.remove("playing");
        }, 2000);
      };

      const stopAnimation = () => {
        if (animationTimeout) {
          clearTimeout(animationTimeout);
        }
        submitButton.classList.remove("playing");
      };

      // Desktop: hover
      submitButton.addEventListener("mouseenter", playAnimation);
      submitButton.addEventListener("mouseleave", stopAnimation);

      // Mobile/Touch: touchstart
      submitButton.addEventListener("touchstart", () => {
        playAnimation();
      });

      // All devices: click
      submitButton.addEventListener("click", playAnimation);
    }

    if (answerForm) {
      answerForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Check which button is visible and act accordingly
        const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
        const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;
        const nextButton = document.querySelector("#next-button") as HTMLButtonElement;

        const submitVisible = (submitButton && submitButton.style.display !== "none") ||
                              (submitButtonNoFun && submitButtonNoFun.style.display !== "none");

        if (submitVisible) {
          // Submit answer
          if (answerInput && answerInput.value.trim()) {
            checkAnswer(answerInput.value);
          }
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

    if (localeDropdown) {
      localeDropdown.addEventListener("change", async (e) => {
        const target = e.target as HTMLSelectElement;
        await loadLocale(target.value);
        questionSettings.locale = target.value;
        saveSettings(questionSettings);
        resetQuiz();
      });
    }

    // Restore scoresheet from localStorage
    const scoresheetValueEl = document.querySelector("#scoresheet-value");
    if (scoresheetValueEl) scoresheetValueEl.textContent = scoresheetTotal.toString();

    // Generate question set and display first question
    questionQueue = generateQuestionSet();
    questionIndex = 0;
    const totalValueEl = document.querySelector("#total-value");
    if (totalValueEl) totalValueEl.textContent = questionQueue.length.toString();
    displayQuestion();

  } catch (error) {
    console.error("Failed to initialize quiz:", error);
    const questionEl = document.querySelector("#question");
    if (questionEl) {
      questionEl.textContent = "Error loading quiz data. Please refresh the page.";
    }
  }
}

window.addEventListener("DOMContentLoaded", initApp);
