import './styles.css';

interface QuizQuestion {
  civilization: string;
  hint: string;
  

  civType?: string;
  bonuses?: string[];
  uniqueUnits?: string[];
  uniqueTechs?: string[];
  teamBonus?: string;
  
  bonusesLocalized?: string;
  uniqueUnitsLocalized?: string;
  uniqueTechsLocalized?: string;
  teamBonusLocalized?: string;
}

interface GameData {
  civ_names: Record<string, string>;
  civ_helptexts: Record<string, string>;
}

interface LocaleStrings {
  [key: string]: string;
}

let gameData: GameData | null = null;
let localeStrings: LocaleStrings = {};
let currentQuestion: QuizQuestion | null = null;
let score = 0;
let totalQuestions = 0;
let askedCivs: Set<string> = new Set();
let allCivNames: string[] = [];

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
    nofun: false,
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

function generateQuestion(): QuizQuestion {
  if (!gameData) throw new Error("Game data not loaded");

  const civs = Object.keys(gameData.civ_names).filter(civ => !askedCivs.has(civ));

  // If all civs have been asked, reset
  if (civs.length === 0) {
    askedCivs.clear();
    return generateQuestion();
  }

  const randomCiv = civs[Math.floor(Math.random() * civs.length)];
  console.log(randomCiv);
  console.log(civs);
  askedCivs.add(randomCiv);

  const civNameId = gameData.civ_names[randomCiv];
  const civHelptextId = gameData.civ_helptexts[randomCiv];
  const localizedName = getLocalizedString(civNameId);
  const localizedHelptext = getLocalizedString(civHelptextId);



  // console.log(localizedHelptext);
  const parsed = parseHelptext(localizedHelptext);


  // console.log('Parsed helptext:', parsed);

  return {
    civilization: localizedName,
    hint: localizedHelptext || `Civilization: ${localizedName}`,
    ...parsed
  };
}

function getRandomQuestion(): { label: string; text: string } {
  if (!currentQuestion) return { label: '', text: "Guess the civilization" };

  const availableQuestions: { type: string; label: string; text: string }[] = [];

  // Collect available question types based on settings
  if (questionSettings.bonuses && currentQuestion.bonuses && currentQuestion.bonuses.length > 0) {
    currentQuestion.bonuses.forEach(bonus => {
      availableQuestions.push({ type: 'bonus', label: currentQuestion?.bonusesLocalized ?? "Civ Bonus", text: bonus });
    });
  }

  if (questionSettings.units && currentQuestion.uniqueUnits) {
    currentQuestion.uniqueUnits.forEach(unit => {
      availableQuestions.push({ type: 'unit', label: currentQuestion?.uniqueUnitsLocalized ?? 'Unique Unit', text: unit });
    });
  }

  if (questionSettings.techs && currentQuestion.uniqueTechs) {
    currentQuestion.uniqueTechs.forEach(tech => {
      availableQuestions.push({ type: 'tech', label: currentQuestion?.uniqueTechsLocalized ?? 'Unique Tech', text: tech });
    });
  }

  if (questionSettings.team && currentQuestion.teamBonus) {
    availableQuestions.push({ type: 'team', label: currentQuestion?.teamBonusLocalized ?? 'Team Bonus', text: currentQuestion.teamBonus });
  }

  if (availableQuestions.length === 0) {
    return { label: '', text: "Guess the civilization" };
  }

  const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  return { label: randomQuestion.label, text: randomQuestion.text };
}

function displayQuestion() {
  currentQuestion = generateQuestion();

  const questionLabelEl = document.querySelector("#question-label");
  const questionEl = document.querySelector("#question");
  const imageContainer = document.querySelector("#image-container");
  const feedbackEl = document.querySelector("#feedback");
  const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
  const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
  const nextButton = document.querySelector("#next-button") as HTMLButtonElement;

  const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;

  if (questionLabelEl && questionEl && imageContainer && feedbackEl && answerInput && submitButton && nextButton) {
    const question = getRandomQuestion();

    questionLabelEl.textContent = question.label;
    questionEl.textContent = question.text;
    imageContainer.innerHTML = ""; // Clear any previous image
    feedbackEl.innerHTML = "";
    answerInput.value = "";
    answerInput.disabled = false;
    // Respect nofun mode when showing submit button
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
  if (!currentQuestion) return;

  const feedbackEl = document.querySelector("#feedback");
  const answerInput = document.querySelector("#answer-input") as HTMLInputElement;
  const submitButton = document.querySelector("#submit-button") as HTMLButtonElement;
  const nextButton = document.querySelector("#next-button") as HTMLButtonElement;
  const scoreValueEl = document.querySelector("#score-value");
  const totalValueEl = document.querySelector("#total-value");

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(currentQuestion.civilization);

  totalQuestions++;

  if (normalizedUser === normalizedCorrect) {
    score++;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: green; font-weight: bold;">✓ Correct! It's ${currentQuestion.civilization}</div>`;
    }
    // Trigger particle effect on score area
    const scoreEl = document.querySelector("#score");
    if (scoreEl) {
      createParticleEffect(scoreEl);
    }
  } else {
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div style="color: red; font-weight: bold;">✗ Wrong! The correct answer is ${currentQuestion.civilization}</div>`;
    }
  }

  if (scoreValueEl) scoreValueEl.textContent = score.toString();
  if (totalValueEl) totalValueEl.textContent = totalQuestions.toString();

  const submitButtonNoFun = document.querySelector("#submit-button-nofun") as HTMLButtonElement;

  if (answerInput) answerInput.disabled = true;
  if (submitButton) submitButton.style.display = "none";
  if (submitButtonNoFun) submitButtonNoFun.style.display = "none";
  if (nextButton) {
    nextButton.style.display = "block";
    nextButton.focus();
  }
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

// Apply saved theme on load
applyTheme(questionSettings.theme);

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

    // Load saved settings into checkboxes
    if (settingBonuses) settingBonuses.checked = questionSettings.bonuses;
    if (settingUnits) settingUnits.checked = questionSettings.units;
    if (settingTechs) settingTechs.checked = questionSettings.techs;
    if (settingTeam) settingTeam.checked = questionSettings.team;
    if (settingNoFun) settingNoFun.checked = questionSettings.nofun;

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

          // Save settings to localStorage
          saveSettings(questionSettings);
        });
      }
    });

    // Handle No Fun Mode toggle
    if (settingNoFun) {
      settingNoFun.addEventListener("change", () => {
        questionSettings.nofun = settingNoFun.checked;
        updateButtonVisibility();
        saveSettings(questionSettings);
      });
    }

    if (answerInput) {
      answerInput.addEventListener("input", handleAutocompleteInput);

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
        // Reset quiz when locale changes
        score = 0;
        totalQuestions = 0;
        askedCivs.clear();
        const scoreValueEl = document.querySelector("#score-value");
        const totalValueEl = document.querySelector("#total-value");
        if (scoreValueEl) scoreValueEl.textContent = "0";
        if (totalValueEl) totalValueEl.textContent = "0";
        displayQuestion();
      });
    }

    // Display first question
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
