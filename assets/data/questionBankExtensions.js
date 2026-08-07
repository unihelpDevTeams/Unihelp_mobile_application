import { subjectDB } from "./subjectDB";

const EXTRA_PER_TOPIC = 6;
const MAX_TOPICS_PER_SUBJECT = 24;

const SUBJECT_LABELS = {
  english: "English Language",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  economics: "Economics",
  government: "Government",
  literature: "Literature",
  commerce: "Commerce",
  geography: "Geography",
  crs: "CRS",
  irs: "IRS",
  agricultural: "Agricultural Science",
  history: "History",
  computer: "Computer Studies",
  music: "Music",
  french: "French",
  arts: "Fine Arts",
};

const SUBJECT_ALIASES = {
  computerstudies: "computer",
  finearts: "arts",
};

const SUBJECT_CLUES = {
  english: {
    default: "language use, comprehension, and grammar",
    concord: "agreement between subjects and verbs",
    punctuation: "correct use of commas, full stops, and apostrophes",
    spelling: "accurate word formation and letter order",
    lexis: "word meaning and vocabulary choice",
    vocabulary: "word meaning and usage",
    grammar: "sentence structure and language rules",
    literature: "poetry, prose, and drama",
    antonyms: "words with opposite meanings",
    synonyms: "words with similar meanings",
    comprehension: "understanding passages and drawing conclusions",
    reported: "changing direct speech into indirect speech",
  },
  mathematics: {
    default: "numerical reasoning and problem solving",
    algebra: "equations, expressions, and unknowns",
    trigonometry: "angles, triangles, and ratios",
    statistics: "data, averages, and graphs",
    probability: "chance and likely outcomes",
    indices: "powers and exponential notation",
    logarithm: "logarithmic rules and exponents",
    calculus: "rates of change and accumulation",
    mensuration: "areas, volumes, and shapes",
    geometry: "lines, angles, and plane figures",
    surds: "irrational roots and simplification",
    factorization: "breaking expressions into factors",
    quadratic: "second-degree equations",
  },
  physics: {
    default: "motion, energy, waves, and electricity",
    motion: "movement, speed, and acceleration",
    electricity: "current, resistance, and circuits",
    optics: "light and image formation",
    waves: "wave properties and sound",
    magnetism: "magnetic fields and induction",
    thermal: "heat and temperature",
    mechanics: "forces and equilibrium",
    energy: "work done and power",
    pressure: "force per unit area in fluids and solids",
    gravitation: "attraction between masses",
    modern: "atoms, nuclei, and radiation",
  },
  chemistry: {
    default: "matter, substances, and reactions",
    atomic: "atoms and subatomic particles",
    periodic: "element arrangement and periodic trends",
    organic: "carbon compounds and reactions",
    acids: "pH, neutralization, and salts",
    redox: "electron transfer and oxidation states",
    electro: "electrolysis and electrochemistry",
    stoichiometry: "mole calculations and balancing equations",
    gases: "gas laws and particle motion",
    bonding: "how atoms join to form compounds",
    solution: "dissolving, concentration, and solubility",
    metallurgy: "extraction and purification of metals",
  },
  biology: {
    default: "living organisms, cells, and body systems",
    cell: "cell structure and function",
    genetics: "inheritance and variation",
    ecology: "interactions and ecosystems",
    evolution: "adaptation and change over time",
    reproduction: "continuity of life",
    classification: "grouping organisms",
    physiology: "body processes and organs",
    respiration: "release of energy from food",
    digestion: "breakdown and absorption of food",
    transport: "movement of materials in organisms",
    photosynthesis: "food manufacture in green plants",
  },
  economics: {
    default: "scarcity, choice, and resource allocation",
    demand: "consumer desire for goods and services",
    supply: "producer availability and output",
    market: "buyers, sellers, and price formation",
    inflation: "general rise in prices",
    banking: "money creation and financial intermediation",
    money: "medium of exchange and store of value",
    production: "creation of goods and services",
    distribution: "sharing income and output",
    national: "income, output, and economic growth",
    trade: "exchange of goods across markets",
    taxation: "government revenue collection",
  },
  government: {
    default: "institutions, law, and political systems",
    constitution: "rules that guide government",
    democracy: "participation and elections",
    legislature: "law-making",
    executive: "policy implementation",
    judiciary: "interpretation of law",
    citizenship: "rights and duties of members of a state",
    federal: "division of power between levels of government",
    election: "selection of representatives",
    party: "political organization and competition",
    local: "grassroots administration",
    public: "institutions and services of the state",
  },
  literature: {
    default: "prose, drama, poetry, and literary devices",
    poetry: "verse, rhythm, and imagery",
    drama: "plays and stage performance",
    prose: "novels and short stories",
    plot: "sequence of events in a text",
    theme: "central idea or message",
    setting: "time and place of a story",
    character: "people in a literary work",
    irony: "a contrast between expectation and reality",
    tone: "writer attitude and voice",
    style: "authorial choice of language",
    figures: "figures of speech and imagery",
  },
  commerce: {
    default: "trade, business, and distribution",
    banking: "financial services and credit",
    insurance: "risk protection and indemnity",
    transport: "movement of goods and people",
    communication: "exchange of business information",
    warehousing: "storage of goods before sale",
    retail: "selling goods to final consumers",
    advertising: "promotion of goods and services",
    trade: "buying and selling activities",
    business: "organization and ownership of firms",
    finance: "management of money and funds",
    warehouse: "storage and inventory control",
  },
  geography: {
    default: "the earth, people, and the environment",
    climate: "weather patterns over a long period",
    population: "distribution and growth of people",
    map: "representation of places and features",
    agriculture: "farming and land use",
    resources: "natural wealth and exploitation",
    settlement: "patterns of human habitation",
    weather: "day-to-day atmospheric conditions",
    transport: "movement across space",
    industry: "location and development of factories",
    relief: "landforms and surface features",
    erosion: "wearing away of the earth's surface",
  },
  crs: {
    default: "Biblical teachings, faith, and morality",
    covenant: "agreement between God and people",
    prayer: "communication with God",
    prophets: "messengers who speak God's word",
    miracle: "supernatural acts of God",
    leadership: "guiding others with responsibility",
    discipleship: "following Jesus and his teachings",
    creation: "God's work in bringing the world into being",
    obedience: "faithful response to divine instruction",
    forgiveness: "release from wrongdoing and mercy",
    worship: "acts of reverence and praise",
    love: "central Christian commandment",
  },
  irs: {
    default: "Islamic teachings, history, and worship",
    prayer: "formal worship in Islam",
    zakat: "obligatory almsgiving",
    hajj: "pilgrimage to Makkah",
    faith: "belief in Allah and the articles of faith",
    prophets: "messengers of Allah",
    jurisprudence: "Islamic legal reasoning",
    quran: "the holy book of Islam",
    sunnah: "the practice of the Prophet",
    fasting: "sawm during Ramadan",
    charity: "sadaqah and social support",
    unity: "brotherhood within the Muslim community",
  },
  agricultural: {
    default: "crop production, animals, and farm management",
    crop: "plant production for food and income",
    soil: "the medium that supports plant growth",
    livestock: "rearing of farm animals",
    pest: "organisms that damage crops or animals",
    farm: "management of agricultural enterprise",
    irrigation: "artificial supply of water to land",
    marketing: "sale and distribution of farm products",
    machinery: "tools and equipment used on farms",
    storage: "preserving produce after harvest",
    weed: "unwanted plants in the field",
    breeding: "selection and improvement of animals and crops",
  },
  history: {
    default: "past events, societies, and change over time",
    ancient: "early civilizations and empires",
    colonial: "foreign rule and administration",
    nationalism: "movements for self-rule and identity",
    politics: "power, leadership, and governance in the past",
    culture: "beliefs, customs, and way of life",
    trade: "exchange routes and commerce in history",
    war: "conflict, causes, and consequences",
    independence: "struggle for self-government",
    constitution: "historical development of laws and governance",
    migration: "movement of people between places",
    empire: "large states ruled by central authority",
  },
  computer: {
    default: "hardware, software, networking, and data",
    cpu: "processing instructions and calculations",
    memory: "storage of data and programs",
    network: "connection of computers and devices",
    software: "programs that run on a computer",
    hardware: "physical parts of the machine",
    internet: "global network communication",
    virus: "malicious software that damages systems",
    input: "sending data into the computer",
    output: "information produced by the computer",
    file: "organized data stored under a name",
    algorithm: "step-by-step problem solving",
  },
  music: {
    default: "rhythm, melody, harmony, and performance",
    rhythm: "pattern of beats and timing",
    melody: "sequence of musical notes",
    harmony: "combination of notes played together",
    notation: "writing music with symbols",
    instruments: "tools used to produce sound",
    tempo: "speed of a musical piece",
    composition: "the process of creating music",
    choir: "group singing performance",
    scales: "ordered musical notes",
    dynamics: "loudness and softness in music",
    pitch: "highness or lowness of sound",
  },
  french: {
    default: "vocabulary, grammar, and communication",
    verb: "action or state word",
    tense: "time reference in language",
    adjective: "word that describes a noun",
    gender: "masculine or feminine form",
    translation: "rendering meaning from one language to another",
    comprehension: "understanding written or spoken French",
    conversation: "spoken interaction",
    pronunciation: "correct sound of words",
    vocabulary: "the words of the language",
    agreement: "matching of words in gender or number",
  },
  arts: {
    default: "drawing, design, colour, and composition",
    line: "a basic element of art",
    colour: "hue and visual expression",
    texture: "surface quality of an artwork",
    sculpture: "three-dimensional art",
    painting: "art using brushes and pigments",
    perspective: "creating depth and distance",
    balance: "visual stability in composition",
    shading: "light and dark modelling",
    pattern: "repetition of forms and motifs",
    design: "planned arrangement of elements",
    composition: "organization of visual parts",
  },
};

const QUESTION_TEMPLATES = [
  (subjectLabel, clue) =>
    `Which ${subjectLabel} topic is best associated with ${clue}?`,
  (subjectLabel, clue) =>
    `A student revising ${subjectLabel} would study which topic for ${clue}?`,
  (subjectLabel, clue) =>
    `Which topic would you choose if the exam question focused on ${clue}?`,
  (subjectLabel, clue) =>
    `What is the most relevant ${subjectLabel} topic for ${clue}?`,
];

const hashString = (value = "") => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRng = (seed) => {
  let state = seed || 1;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const shuffleWithSeed = (items, seedKey) => {
  const arr = [...items];
  const random = createRng(hashString(seedKey));

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

const normalize = (value = "") =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

const slug = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const dedupeTopics = (topics = []) => {
  const seen = new Set();
  const unique = [];

  topics.forEach((topic) => {
    const label = String(topic || "").trim();
    if (!label) return;

    const key = normalize(label);
    if (seen.has(key)) return;

    seen.add(key);
    unique.push(label);
  });

  return unique;
};

const getSubjectLabel = (subjectKey) =>
  SUBJECT_LABELS[subjectKey] ||
  subjectDB?.[subjectKey]?.title ||
  subjectKey;

const getTopicPool = (subjectKey, questions = []) => {
  const fromQuestions = questions.map((q) => q?.topic);
  const fromSubject = (subjectDB?.[subjectKey]?.topics || []).map((topic) =>
    topic?.title,
  );

  return dedupeTopics([...fromQuestions, ...fromSubject]).slice(
    0,
    Math.max(MAX_TOPICS_PER_SUBJECT, 12),
  );
};

const getTopicClue = (subjectKey, topic) => {
  const normalizedTopic = normalize(topic);
  const subjectHints = SUBJECT_CLUES[subjectKey] || {};

  for (const [needle, clue] of Object.entries(subjectHints)) {
    if (needle === "default") continue;
    if (normalizedTopic.includes(normalize(needle))) {
      return clue;
    }
  }

  return subjectHints.default || "the core ideas in this subject";
};

const buildDistractors = (topicPool, correctTopic, seedKey) => {
  const distractors = shuffleWithSeed(
    topicPool.filter((topic) => normalize(topic) !== normalize(correctTopic)),
    `${seedKey}-distractors`,
  );

  const fallbackDistractors = [
    "General Revision",
    "Applied Practice",
    "Core Concepts",
    "Exam Strategy",
  ];

  return [...distractors, ...fallbackDistractors].slice(0, 3);
};

const buildGeneratedQuestion = (
  subjectKey,
  subjectLabel,
  topicPool,
  topic,
  variantIndex,
) => {
  const seedKey = `${subjectKey}-${topic}-${variantIndex}`;
  const clue = getTopicClue(subjectKey, topic);
  const distractors = buildDistractors(topicPool, topic, seedKey);
  const options = shuffleWithSeed([topic, ...distractors], seedKey);
  const answer = options.findIndex(
    (option) => normalize(option) === normalize(topic),
  );

  const template =
    QUESTION_TEMPLATES[variantIndex % QUESTION_TEMPLATES.length];

  return {
    id: `generated-${subjectKey}-${slug(topic)}-${variantIndex + 1}`,
    question: template(subjectLabel, clue),
    options,
    answer: answer >= 0 ? answer : 0,
    explanation: `This revision prompt points to ${topic} in ${subjectLabel}.`,
    image: null,
    year: 2026 - (variantIndex % 5),
    topic,
    difficulty: variantIndex % 3 === 0 ? "easy" : variantIndex % 3 === 1 ? "medium" : "hard",
    passage: null,
  };
};

const extendSubjectQuestions = (subjectKey, questions = []) => {
  const subjectLabel = getSubjectLabel(subjectKey);
  const topicPool = getTopicPool(subjectKey, questions);

  if (!topicPool.length) {
    return [...questions];
  }

  const generated = [];

  topicPool.forEach((topic, topicIndex) => {
    for (let i = 0; i < EXTRA_PER_TOPIC; i += 1) {
      generated.push(
        buildGeneratedQuestion(
          subjectKey,
          subjectLabel,
          topicPool,
          topic,
          topicIndex * EXTRA_PER_TOPIC + i,
        ),
      );
    }
  });

  return [...questions, ...generated];
};

export const augmentQuestionBank = (baseQuestionBank = {}) => {
  const augmented = {};

  Object.entries(baseQuestionBank).forEach(([subjectKey, questions]) => {
    augmented[subjectKey] = extendSubjectQuestions(subjectKey, questions);
  });

  Object.entries(SUBJECT_ALIASES).forEach(([aliasKey, targetKey]) => {
    if (augmented[targetKey]) {
      Object.defineProperty(augmented, aliasKey, {
        value: augmented[targetKey],
        enumerable: false,
        configurable: true,
        writable: false,
      });
    }
  });

  return augmented;
};
