import './styles.css';

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

interface QuestionSettings {
  bonuses: boolean;
  units: boolean;
  techs: boolean;
  team: boolean;
  locale: string;
  theme: 'light' | 'dark';
  questionCount: number;
}

interface QuestionTypeCounts {
  bonuses: number;
  units: number;
  techs: number;
  team: number;
}

const LANGUAGE_OPTIONS = [
  { locale: "en", label: "English" },
  { locale: "de", label: "Deutsch" },
  { locale: "es", label: "Español" },
  { locale: "fr", label: "Français" },
  { locale: "it", label: "Italiano" },
  { locale: "ru", label: "Русский" },
  { locale: "zh", label: "中文" },
  { locale: "tw", label: "繁體中文" },
  { locale: "jp", label: "日本語" },
  { locale: "ko", label: "한국어" },
  { locale: "br", label: "Português (BR)" },
  { locale: "mx", label: "Español (MX)" },
  { locale: "pl", label: "Polski" },
  { locale: "tr", label: "Türkçe" },
  { locale: "vi", label: "Tiếng Việt" },
  { locale: "hi", label: "हिन्दी" },
  { locale: "ms", label: "Bahasa Melayu" },
] as const;

const UI_STRINGS: Record<string, Record<string, string>> = {
  en: {
    pageTitle: "AoE2 Civilization Quiz",
    setupTitle: "Create Quiz",
    setupDescription: "Choose the question types you want, then start a new run with your current preferences.",
    languageHeading: "Language",
    questionLanguageLabel: "Question language",
    questionTypesHeading: "Question Types",
    questionTypeBonuses: "Civilization Bonuses",
    questionTypeUnits: "Unique Units",
    questionTypeTechs: "Unique Technologies",
    questionTypeTeam: "Team Bonus",
    questionCountHeading: "Question Count",
    startQuizButton: "Start Quiz",
    settingsTitle: "Settings",
    lightMode: "Light mode",
    closeButton: "Close",
    resultsTitle: "Quiz Overview",
    resultsTotal: "Total",
    resultsCorrect: "Correct",
    resultsWrong: "Wrong",
    resultsAccuracy: "Accuracy",
    rerunWrongOnly: "Rerun Wrong Only",
    createNewQuiz: "Create New Quiz",
    noWrongAnswers: "No Wrong Answers",
    fallbackCivBonus: "Civ Bonus",
    fallbackUniqueUnit: "Unique Unit",
    fallbackUniqueTech: "Unique Tech",
    fallbackTeamBonus: "Team Bonus",
    errorLoadingQuiz: "Error loading quiz data. Please refresh the page.",
  },
  de: {
    pageTitle: "AoE2-Zivilisationsquiz",
    setupTitle: "Quiz erstellen",
    setupDescription: "Wähle die gewünschten Fragetypen aus und starte eine neue Runde mit deinen aktuellen Einstellungen.",
    languageHeading: "Sprache",
    questionLanguageLabel: "Fragesprache",
    questionTypesHeading: "Fragetypen",
    questionTypeBonuses: "Zivilisationsboni",
    questionTypeUnits: "Einzigartige Einheiten",
    questionTypeTechs: "Einzigartige Technologien",
    questionTypeTeam: "Teambonus",
    questionCountHeading: "Fragenanzahl",
    startQuizButton: "Quiz starten",
    settingsTitle: "Einstellungen",
    lightMode: "Hellmodus",
    closeButton: "Schließen",
    resultsTitle: "Quiz-Übersicht",
    resultsTotal: "Gesamt",
    resultsCorrect: "Richtig",
    resultsWrong: "Falsch",
    resultsAccuracy: "Trefferquote",
    rerunWrongOnly: "Nur falsche Fragen erneut",
    createNewQuiz: "Neues Quiz erstellen",
    noWrongAnswers: "Keine falschen Antworten",
    fallbackCivBonus: "Zivilisationsbonus",
    fallbackUniqueUnit: "Einzigartige Einheit",
    fallbackUniqueTech: "Einzigartige Technologie",
    fallbackTeamBonus: "Teambonus",
    errorLoadingQuiz: "Fehler beim Laden der Quizdaten. Bitte lade die Seite neu.",
  },
  es: {
    pageTitle: "Quiz de civilizaciones AoE2",
    setupTitle: "Crear quiz",
    setupDescription: "Elige los tipos de pregunta que quieras y comienza una nueva partida con tus preferencias actuales.",
    languageHeading: "Idioma",
    questionLanguageLabel: "Idioma de las preguntas",
    questionTypesHeading: "Tipos de pregunta",
    questionTypeBonuses: "Bonificaciones de civilización",
    questionTypeUnits: "Unidades únicas",
    questionTypeTechs: "Tecnologías únicas",
    questionTypeTeam: "Bonificación de equipo",
    questionCountHeading: "Cantidad de preguntas",
    startQuizButton: "Empezar quiz",
    settingsTitle: "Configuración",
    lightMode: "Modo claro",
    closeButton: "Cerrar",
    resultsTitle: "Resumen del quiz",
    resultsTotal: "Total",
    resultsCorrect: "Correctas",
    resultsWrong: "Incorrectas",
    resultsAccuracy: "Precisión",
    rerunWrongOnly: "Repetir solo falladas",
    createNewQuiz: "Crear nuevo quiz",
    noWrongAnswers: "Sin respuestas incorrectas",
    fallbackCivBonus: "Bonificación de civilización",
    fallbackUniqueUnit: "Unidad única",
    fallbackUniqueTech: "Tecnología única",
    fallbackTeamBonus: "Bonificación de equipo",
    errorLoadingQuiz: "Error al cargar los datos del quiz. Actualiza la página.",
  },
  fr: {
    pageTitle: "Quiz des civilisations AoE2",
    setupTitle: "Créer un quiz",
    setupDescription: "Choisissez les types de questions souhaités, puis lancez une nouvelle partie avec vos préférences actuelles.",
    languageHeading: "Langue",
    questionLanguageLabel: "Langue des questions",
    questionTypesHeading: "Types de questions",
    questionTypeBonuses: "Bonus de civilisation",
    questionTypeUnits: "Unités uniques",
    questionTypeTechs: "Technologies uniques",
    questionTypeTeam: "Bonus d'équipe",
    questionCountHeading: "Nombre de questions",
    startQuizButton: "Démarrer le quiz",
    settingsTitle: "Paramètres",
    lightMode: "Mode clair",
    closeButton: "Fermer",
    resultsTitle: "Aperçu du quiz",
    resultsTotal: "Total",
    resultsCorrect: "Correctes",
    resultsWrong: "Fausses",
    resultsAccuracy: "Précision",
    rerunWrongOnly: "Rejouer seulement les erreurs",
    createNewQuiz: "Créer un nouveau quiz",
    noWrongAnswers: "Aucune mauvaise réponse",
    fallbackCivBonus: "Bonus de civilisation",
    fallbackUniqueUnit: "Unité unique",
    fallbackUniqueTech: "Technologie unique",
    fallbackTeamBonus: "Bonus d'équipe",
    errorLoadingQuiz: "Erreur lors du chargement des données du quiz. Veuillez actualiser la page.",
  },
  it: {
    pageTitle: "Quiz delle civiltà AoE2",
    setupTitle: "Crea quiz",
    setupDescription: "Scegli i tipi di domanda che desideri e avvia una nuova partita con le tue preferenze attuali.",
    languageHeading: "Lingua",
    questionLanguageLabel: "Lingua delle domande",
    questionTypesHeading: "Tipi di domanda",
    questionTypeBonuses: "Bonus civiltà",
    questionTypeUnits: "Unità uniche",
    questionTypeTechs: "Tecnologie uniche",
    questionTypeTeam: "Bonus di squadra",
    questionCountHeading: "Numero di domande",
    startQuizButton: "Avvia quiz",
    settingsTitle: "Impostazioni",
    lightMode: "Modalità chiara",
    closeButton: "Chiudi",
    resultsTitle: "Panoramica quiz",
    resultsTotal: "Totale",
    resultsCorrect: "Corrette",
    resultsWrong: "Sbagliate",
    resultsAccuracy: "Precisione",
    rerunWrongOnly: "Ripeti solo quelle sbagliate",
    createNewQuiz: "Crea un nuovo quiz",
    noWrongAnswers: "Nessuna risposta sbagliata",
    fallbackCivBonus: "Bonus civiltà",
    fallbackUniqueUnit: "Unità unica",
    fallbackUniqueTech: "Tecnologia unica",
    fallbackTeamBonus: "Bonus di squadra",
    errorLoadingQuiz: "Errore nel caricamento dei dati del quiz. Aggiorna la pagina.",
  },
  ru: {
    pageTitle: "Викторина по цивилизациям AoE2",
    setupTitle: "Создать викторину",
    setupDescription: "Выберите нужные типы вопросов и начните новый раунд с текущими настройками.",
    languageHeading: "Язык",
    questionLanguageLabel: "Язык вопросов",
    questionTypesHeading: "Типы вопросов",
    questionTypeBonuses: "Бонусы цивилизаций",
    questionTypeUnits: "Уникальные юниты",
    questionTypeTechs: "Уникальные технологии",
    questionTypeTeam: "Командный бонус",
    questionCountHeading: "Количество вопросов",
    startQuizButton: "Начать викторину",
    settingsTitle: "Настройки",
    lightMode: "Светлая тема",
    closeButton: "Закрыть",
    resultsTitle: "Итоги викторины",
    resultsTotal: "Всего",
    resultsCorrect: "Верно",
    resultsWrong: "Неверно",
    resultsAccuracy: "Точность",
    rerunWrongOnly: "Повторить только неверные",
    createNewQuiz: "Создать новую викторину",
    noWrongAnswers: "Нет неверных ответов",
    fallbackCivBonus: "Бонус цивилизации",
    fallbackUniqueUnit: "Уникальный юнит",
    fallbackUniqueTech: "Уникальная технология",
    fallbackTeamBonus: "Командный бонус",
    errorLoadingQuiz: "Ошибка загрузки данных викторины. Обновите страницу.",
  },
  zh: {
    pageTitle: "AoE2 文明测验",
    setupTitle: "创建测验",
    setupDescription: "选择你想要的题目类型，然后使用当前偏好开始新一局。",
    languageHeading: "语言",
    questionLanguageLabel: "题目语言",
    questionTypesHeading: "题目类型",
    questionTypeBonuses: "文明加成",
    questionTypeUnits: "特色单位",
    questionTypeTechs: "特色科技",
    questionTypeTeam: "团队加成",
    questionCountHeading: "题目数量",
    startQuizButton: "开始测验",
    settingsTitle: "设置",
    lightMode: "浅色模式",
    closeButton: "关闭",
    resultsTitle: "测验概览",
    resultsTotal: "总计",
    resultsCorrect: "正确",
    resultsWrong: "错误",
    resultsAccuracy: "准确率",
    rerunWrongOnly: "仅重做错误题",
    createNewQuiz: "创建新测验",
    noWrongAnswers: "没有错误答案",
    fallbackCivBonus: "文明加成",
    fallbackUniqueUnit: "特色单位",
    fallbackUniqueTech: "特色科技",
    fallbackTeamBonus: "团队加成",
    errorLoadingQuiz: "加载测验数据时出错。请刷新页面。",
  },
  tw: {
    pageTitle: "AoE2 文明測驗",
    setupTitle: "建立測驗",
    setupDescription: "選擇你想要的題目類型，然後使用目前偏好開始新一輪。",
    languageHeading: "語言",
    questionLanguageLabel: "題目語言",
    questionTypesHeading: "題目類型",
    questionTypeBonuses: "文明加成",
    questionTypeUnits: "特殊單位",
    questionTypeTechs: "特殊科技",
    questionTypeTeam: "團隊加成",
    questionCountHeading: "題目數量",
    startQuizButton: "開始測驗",
    settingsTitle: "設定",
    lightMode: "淺色模式",
    closeButton: "關閉",
    resultsTitle: "測驗總覽",
    resultsTotal: "總計",
    resultsCorrect: "正確",
    resultsWrong: "錯誤",
    resultsAccuracy: "準確率",
    rerunWrongOnly: "只重做錯題",
    createNewQuiz: "建立新測驗",
    noWrongAnswers: "沒有錯誤答案",
    fallbackCivBonus: "文明加成",
    fallbackUniqueUnit: "特殊單位",
    fallbackUniqueTech: "特殊科技",
    fallbackTeamBonus: "團隊加成",
    errorLoadingQuiz: "載入測驗資料時發生錯誤。請重新整理頁面。",
  },
  jp: {
    pageTitle: "AoE2 文明クイズ",
    setupTitle: "クイズを作成",
    setupDescription: "出題タイプを選んで、現在の設定で新しいクイズを開始しましょう。",
    languageHeading: "言語",
    questionLanguageLabel: "問題の言語",
    questionTypesHeading: "出題タイプ",
    questionTypeBonuses: "文明ボーナス",
    questionTypeUnits: "固有ユニット",
    questionTypeTechs: "固有テクノロジー",
    questionTypeTeam: "チームボーナス",
    questionCountHeading: "問題数",
    startQuizButton: "クイズ開始",
    settingsTitle: "設定",
    lightMode: "ライトモード",
    closeButton: "閉じる",
    resultsTitle: "クイズ概要",
    resultsTotal: "合計",
    resultsCorrect: "正解",
    resultsWrong: "不正解",
    resultsAccuracy: "正答率",
    rerunWrongOnly: "間違いのみ再挑戦",
    createNewQuiz: "新しいクイズを作成",
    noWrongAnswers: "不正解はありません",
    fallbackCivBonus: "文明ボーナス",
    fallbackUniqueUnit: "固有ユニット",
    fallbackUniqueTech: "固有テクノロジー",
    fallbackTeamBonus: "チームボーナス",
    errorLoadingQuiz: "クイズデータの読み込みでエラーが発生しました。ページを再読み込みしてください。",
  },
  ko: {
    pageTitle: "AoE2 문명 퀴즈",
    setupTitle: "퀴즈 만들기",
    setupDescription: "원하는 문제 유형을 선택하고 현재 설정으로 새 퀴즈를 시작하세요.",
    languageHeading: "언어",
    questionLanguageLabel: "문제 언어",
    questionTypesHeading: "문제 유형",
    questionTypeBonuses: "문명 보너스",
    questionTypeUnits: "고유 유닛",
    questionTypeTechs: "고유 기술",
    questionTypeTeam: "팀 보너스",
    questionCountHeading: "문제 수",
    startQuizButton: "퀴즈 시작",
    settingsTitle: "설정",
    lightMode: "라이트 모드",
    closeButton: "닫기",
    resultsTitle: "퀴즈 개요",
    resultsTotal: "전체",
    resultsCorrect: "정답",
    resultsWrong: "오답",
    resultsAccuracy: "정확도",
    rerunWrongOnly: "오답만 다시 풀기",
    createNewQuiz: "새 퀴즈 만들기",
    noWrongAnswers: "틀린 답이 없습니다",
    fallbackCivBonus: "문명 보너스",
    fallbackUniqueUnit: "고유 유닛",
    fallbackUniqueTech: "고유 기술",
    fallbackTeamBonus: "팀 보너스",
    errorLoadingQuiz: "퀴즈 데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침하세요.",
  },
  br: {
    pageTitle: "Quiz de Civilizações de AoE2",
    setupTitle: "Criar quiz",
    setupDescription: "Escolha os tipos de pergunta desejados e inicie uma nova rodada com suas preferências atuais.",
    languageHeading: "Idioma",
    questionLanguageLabel: "Idioma das perguntas",
    questionTypesHeading: "Tipos de pergunta",
    questionTypeBonuses: "Bônus de civilização",
    questionTypeUnits: "Unidades únicas",
    questionTypeTechs: "Tecnologias únicas",
    questionTypeTeam: "Bônus de equipe",
    questionCountHeading: "Quantidade de perguntas",
    startQuizButton: "Iniciar quiz",
    settingsTitle: "Configurações",
    lightMode: "Modo claro",
    closeButton: "Fechar",
    resultsTitle: "Visão geral do quiz",
    resultsTotal: "Total",
    resultsCorrect: "Corretas",
    resultsWrong: "Incorretas",
    resultsAccuracy: "Precisão",
    rerunWrongOnly: "Repetir apenas as erradas",
    createNewQuiz: "Criar novo quiz",
    noWrongAnswers: "Nenhuma resposta errada",
    fallbackCivBonus: "Bônus de civilização",
    fallbackUniqueUnit: "Unidade única",
    fallbackUniqueTech: "Tecnologia única",
    fallbackTeamBonus: "Bônus de equipe",
    errorLoadingQuiz: "Erro ao carregar os dados do quiz. Atualize a página.",
  },
  mx: {
    pageTitle: "Quiz de civilizaciones AoE2",
    setupTitle: "Crear quiz",
    setupDescription: "Elige los tipos de pregunta que quieras y comienza una nueva ronda con tus preferencias actuales.",
    languageHeading: "Idioma",
    questionLanguageLabel: "Idioma de las preguntas",
    questionTypesHeading: "Tipos de pregunta",
    questionTypeBonuses: "Bonificaciones de civilización",
    questionTypeUnits: "Unidades únicas",
    questionTypeTechs: "Tecnologías únicas",
    questionTypeTeam: "Bonificación de equipo",
    questionCountHeading: "Cantidad de preguntas",
    startQuizButton: "Iniciar quiz",
    settingsTitle: "Configuración",
    lightMode: "Modo claro",
    closeButton: "Cerrar",
    resultsTitle: "Resumen del quiz",
    resultsTotal: "Total",
    resultsCorrect: "Correctas",
    resultsWrong: "Incorrectas",
    resultsAccuracy: "Precisión",
    rerunWrongOnly: "Repetir solo incorrectas",
    createNewQuiz: "Crear nuevo quiz",
    noWrongAnswers: "Sin respuestas incorrectas",
    fallbackCivBonus: "Bonificación de civilización",
    fallbackUniqueUnit: "Unidad única",
    fallbackUniqueTech: "Tecnología única",
    fallbackTeamBonus: "Bonificación de equipo",
    errorLoadingQuiz: "Error al cargar los datos del quiz. Actualiza la página.",
  },
  pl: {
    pageTitle: "Quiz cywilizacji AoE2",
    setupTitle: "Utwórz quiz",
    setupDescription: "Wybierz typy pytań, które chcesz, a następnie rozpocznij nową rundę z bieżącymi ustawieniami.",
    languageHeading: "Język",
    questionLanguageLabel: "Język pytań",
    questionTypesHeading: "Typy pytań",
    questionTypeBonuses: "Premie cywilizacji",
    questionTypeUnits: "Unikalne jednostki",
    questionTypeTechs: "Unikalne technologie",
    questionTypeTeam: "Premia drużynowa",
    questionCountHeading: "Liczba pytań",
    startQuizButton: "Rozpocznij quiz",
    settingsTitle: "Ustawienia",
    lightMode: "Jasny motyw",
    closeButton: "Zamknij",
    resultsTitle: "Podsumowanie quizu",
    resultsTotal: "Razem",
    resultsCorrect: "Poprawne",
    resultsWrong: "Błędne",
    resultsAccuracy: "Dokładność",
    rerunWrongOnly: "Powtórz tylko błędne",
    createNewQuiz: "Utwórz nowy quiz",
    noWrongAnswers: "Brak błędnych odpowiedzi",
    fallbackCivBonus: "Premia cywilizacji",
    fallbackUniqueUnit: "Unikalna jednostka",
    fallbackUniqueTech: "Unikalna technologia",
    fallbackTeamBonus: "Premia drużynowa",
    errorLoadingQuiz: "Błąd podczas wczytywania danych quizu. Odśwież stronę.",
  },
  tr: {
    pageTitle: "AoE2 Medeniyet Bilgi Yarışması",
    setupTitle: "Bilgi yarışması oluştur",
    setupDescription: "İstediğiniz soru türlerini seçin ve mevcut tercihlerinizle yeni bir tur başlatın.",
    languageHeading: "Dil",
    questionLanguageLabel: "Soru dili",
    questionTypesHeading: "Soru türleri",
    questionTypeBonuses: "Medeniyet bonusları",
    questionTypeUnits: "Özel birimler",
    questionTypeTechs: "Özel teknolojiler",
    questionTypeTeam: "Takım bonusu",
    questionCountHeading: "Soru sayısı",
    startQuizButton: "Yarışmayı başlat",
    settingsTitle: "Ayarlar",
    lightMode: "Aydınlık mod",
    closeButton: "Kapat",
    resultsTitle: "Yarışma özeti",
    resultsTotal: "Toplam",
    resultsCorrect: "Doğru",
    resultsWrong: "Yanlış",
    resultsAccuracy: "Başarı oranı",
    rerunWrongOnly: "Sadece yanlışları tekrar çöz",
    createNewQuiz: "Yeni yarışma oluştur",
    noWrongAnswers: "Yanlış cevap yok",
    fallbackCivBonus: "Medeniyet bonusu",
    fallbackUniqueUnit: "Özel birim",
    fallbackUniqueTech: "Özel teknoloji",
    fallbackTeamBonus: "Takım bonusu",
    errorLoadingQuiz: "Yarışma verileri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.",
  },
  vi: {
    pageTitle: "Đố vui nền văn minh AoE2",
    setupTitle: "Tạo câu đố",
    setupDescription: "Chọn kiểu câu hỏi bạn muốn, rồi bắt đầu một lượt mới với các thiết lập hiện tại.",
    languageHeading: "Ngôn ngữ",
    questionLanguageLabel: "Ngôn ngữ câu hỏi",
    questionTypesHeading: "Kiểu câu hỏi",
    questionTypeBonuses: "Thưởng nền văn minh",
    questionTypeUnits: "Đơn vị đặc biệt",
    questionTypeTechs: "Công nghệ đặc biệt",
    questionTypeTeam: "Thưởng đồng đội",
    questionCountHeading: "Số câu hỏi",
    startQuizButton: "Bắt đầu",
    settingsTitle: "Cài đặt",
    lightMode: "Chế độ sáng",
    closeButton: "Đóng",
    resultsTitle: "Tổng kết câu đố",
    resultsTotal: "Tổng",
    resultsCorrect: "Đúng",
    resultsWrong: "Sai",
    resultsAccuracy: "Độ chính xác",
    rerunWrongOnly: "Làm lại chỉ câu sai",
    createNewQuiz: "Tạo câu đố mới",
    noWrongAnswers: "Không có câu sai",
    fallbackCivBonus: "Thưởng nền văn minh",
    fallbackUniqueUnit: "Đơn vị đặc biệt",
    fallbackUniqueTech: "Công nghệ đặc biệt",
    fallbackTeamBonus: "Thưởng đồng đội",
    errorLoadingQuiz: "Lỗi khi tải dữ liệu câu đố. Vui lòng làm mới trang.",
  },
  hi: {
    pageTitle: "AoE2 सभ्यता प्रश्नोत्तरी",
    setupTitle: "प्रश्नोत्तरी बनाएं",
    setupDescription: "जिन प्रश्न प्रकारों को आप चाहते हैं, उन्हें चुनें और अपनी वर्तमान प्राथमिकताओं के साथ एक नया राउंड शुरू करें।",
    languageHeading: "भाषा",
    questionLanguageLabel: "प्रश्न भाषा",
    questionTypesHeading: "प्रश्न प्रकार",
    questionTypeBonuses: "सभ्यता बोनस",
    questionTypeUnits: "विशिष्ट इकाइयाँ",
    questionTypeTechs: "विशिष्ट तकनीकें",
    questionTypeTeam: "टीम बोनस",
    questionCountHeading: "प्रश्नों की संख्या",
    startQuizButton: "प्रश्नोत्तरी शुरू करें",
    settingsTitle: "सेटिंग्स",
    lightMode: "लाइट मोड",
    closeButton: "बंद करें",
    resultsTitle: "प्रश्नोत्तरी सारांश",
    resultsTotal: "कुल",
    resultsCorrect: "सही",
    resultsWrong: "गलत",
    resultsAccuracy: "सटीकता",
    rerunWrongOnly: "केवल गलत दोबारा करें",
    createNewQuiz: "नई प्रश्नोत्तरी बनाएं",
    noWrongAnswers: "कोई गलत उत्तर नहीं",
    fallbackCivBonus: "सभ्यता बोनस",
    fallbackUniqueUnit: "विशिष्ट इकाई",
    fallbackUniqueTech: "विशिष्ट तकनीक",
    fallbackTeamBonus: "टीम बोनस",
    errorLoadingQuiz: "प्रश्नोत्तरी डेटा लोड करने में त्रुटि। कृपया पेज रीफ़्रेश करें।",
  },
  ms: {
    pageTitle: "Kuiz Tamadun AoE2",
    setupTitle: "Cipta kuiz",
    setupDescription: "Pilih jenis soalan yang anda mahu, kemudian mulakan pusingan baharu dengan pilihan semasa anda.",
    languageHeading: "Bahasa",
    questionLanguageLabel: "Bahasa soalan",
    questionTypesHeading: "Jenis soalan",
    questionTypeBonuses: "Bonus tamadun",
    questionTypeUnits: "Unit unik",
    questionTypeTechs: "Teknologi unik",
    questionTypeTeam: "Bonus pasukan",
    questionCountHeading: "Bilangan soalan",
    startQuizButton: "Mula kuiz",
    settingsTitle: "Tetapan",
    lightMode: "Mod cerah",
    closeButton: "Tutup",
    resultsTitle: "Ringkasan kuiz",
    resultsTotal: "Jumlah",
    resultsCorrect: "Betul",
    resultsWrong: "Salah",
    resultsAccuracy: "Ketepatan",
    rerunWrongOnly: "Ulang hanya yang salah",
    createNewQuiz: "Cipta kuiz baharu",
    noWrongAnswers: "Tiada jawapan salah",
    fallbackCivBonus: "Bonus tamadun",
    fallbackUniqueUnit: "Unit unik",
    fallbackUniqueTech: "Teknologi unik",
    fallbackTeamBonus: "Bonus pasukan",
    errorLoadingQuiz: "Ralat memuatkan data kuiz. Sila muat semula halaman.",
  },
};

type UiKey = keyof typeof UI_STRINGS.en;
let uiStrings: Record<UiKey, string> = UI_STRINGS.en;

function loadSettings(): QuestionSettings {
  const saved = localStorage.getItem('questionSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Add theme if it doesn't exist in old saved settings
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

function saveSettings(settings: QuestionSettings): void {
  localStorage.setItem('questionSettings', JSON.stringify(settings));
}

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
    updateAutocompleteSuggestions();
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

function updateAutocompleteSuggestions(): void {
  if (!gameData) return;

  // Get all civilization names in current locale
  allCivNames = Object.keys(gameData.civs).map(civKey => {
    return getLocalizedString(gameData!.civs[civKey].name_string_id);
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

    console.log(civKey, parsed);
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
    console.log("Game data loaded successfully");

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
      element.addEventListener("change", (event) => {
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
