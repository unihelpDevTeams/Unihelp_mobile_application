import physicsCircuit from "../questions/physics-circuit.svg";

import physicsLensDiagram from "./svg/physicsLensDiagram.svg";
import physicsSeriesCircuit from "./svg/physicsSeriesCircuit.svg";
import physicsMotorDiagram from "./svg/physicsMotorDiagram.svg";

import chemistryDistillationSetup from "./svg/chemistryDistillationSetup.svg";
import chemistryBurette from "./svg/chemistryBurette.svg";
import chemistryPeriodicTable from "./svg/chemistryPeriodicTable.svg";
import chemistryTitrationSetup from "./svg/chemistryTitrationSetup.svg";

import governmentElectionProcess from "./svg/governmentElectionProcess.svg";
import governmentSeparationOfPowers from "./svg/governmentSeparationOfPowers.svg";
import { augmentQuestionBank } from "./questionBankExtensions";

/* =========================================================
UTILS
========================================================= */

const generateId = (subject, index) => {
  return `${subject}-${index + 1}`;
};

/* =========================================================
QUESTION FACTORY
========================================================= */

const createQuestion = ({
  id,
  question,
  options,
  answer,
  explanation = "",
  image = null,
  year = null,
  topic = "",
  difficulty = "medium",
  passage = null,
}) => ({
  id,
  question,
  options,
  answer,
  explanation,
  image,
  year,
  topic,
  difficulty,
  passage,
});

/* =========================================================
ENGLISH LANGUAGE
========================================================= */

const english = [
  createQuestion({
    id: generateId("english", 0),

    question: "Choose the word nearest in meaning to 'Rapid'.",

    options: ["Fast", "Slow", "Weak", "Calm"],

    answer: 0,

    topic: "Lexis and Structure",

    difficulty: "easy",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 1),

    question: "Identify the correctly punctuated sentence.",

    options: [
      "Lets eat Grandma",
      "Let's eat Grandma",
      "Lets eat, Grandma",
      "Let's eat, Grandma",
    ],

    answer: 3,

    topic: "Punctuation",

    difficulty: "medium",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 2),

    question: "Choose the antonym of 'Scarcity'.",

    options: ["Poverty", "Abundance", "Weakness", "Failure"],

    answer: 1,

    topic: "Antonyms",

    difficulty: "easy",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 3),

    question: "The principal together with the teachers ___ present.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Concord",

    difficulty: "hard",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 4),

    question: "Choose the correctly spelt word.",

    options: ["Accomodation", "Accommodation", "Acommodation", "Acomodation"],

    answer: 1,

    topic: "Spelling",

    difficulty: "easy",

    year: 2020,
  }),
  createQuestion({
    id: generateId("english", 70),

    question:
      "Choose the option that best completes the sentence: Hardly had we arrived _____ the rain started.",

    options: ["than", "when", "before", "as"],

    answer: 1,

    topic: "Grammar",

    explanation: "'Hardly...when' is the correct correlative structure.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 71),

    question: "Choose the word that is opposite in meaning to 'ABUNDANT'.",

    options: ["scarce", "large", "many", "full"],

    answer: 0,

    topic: "Antonyms",

    explanation: "Scarce is the opposite of abundant.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 72),

    question:
      "Select the correct option: The teacher made the students _____ quietly.",

    options: ["to sit", "sit", "sitting", "sat"],

    answer: 1,

    topic: "Grammar",

    explanation: "After 'make', we use the bare infinitive 'sit'.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 73),

    question: "Choose the option nearest in meaning to 'RESILIENT'.",

    options: ["weak", "strong", "flexible", "tired"],

    answer: 1,

    topic: "Lexis",

    explanation: "Resilient means strong and able to recover quickly.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 74),

    question:
      "Identify the part of speech of the underlined word: She sings BEAUTIFULLY.",

    options: ["Adjective", "Adverb", "Noun", "Verb"],

    answer: 1,

    topic: "Grammar",

    explanation: "Beautifully describes how she sings, so it is an adverb.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 75),

    question: "Choose the correctly punctuated sentence.",

    options: [
      "However he was late, he still attended the meeting.",
      "However, he was late he still attended the meeting.",
      "However, he was late, he still attended the meeting.",
      "However he was late he still attended, the meeting.",
    ],

    answer: 2,

    topic: "Punctuation",

    explanation:
      "Introductory 'however' is followed by a comma, and clauses are properly separated.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 76),

    question:
      "Choose the word that best completes the analogy: Book is to reading as knife is to _____.",

    options: ["cutting", "writing", "eating", "sharpening"],

    answer: 0,

    topic: "Vocabulary",

    explanation:
      "A knife is used for cutting just as a book is used for reading.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 77),

    question: "Choose the option opposite in meaning to 'BENEFICIAL'.",

    options: ["helpful", "useful", "harmful", "important"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Harmful is the opposite of beneficial.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 78),

    question: "Choose the correct sentence.",

    options: [
      "She don't like mangoes.",
      "She doesn't likes mangoes.",
      "She doesn't like mangoes.",
      "She not like mangoes.",
    ],

    answer: 2,

    topic: "Grammar",

    explanation: "Correct subject-verb agreement: 'She doesn't like'.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 79),

    question: "Identify the figure of speech: 'He is as strong as a lion.'",

    options: ["Metaphor", "Simile", "Irony", "Personification"],

    answer: 1,

    topic: "Literature",

    explanation: "A simile uses 'as...as' for comparison.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 80),

    question: "Choose the word nearest in meaning to 'COMPREHEND'.",

    options: ["ignore", "understand", "forget", "repeat"],

    answer: 1,

    topic: "Lexis",

    explanation: "Comprehend means to understand.",

    year: 2020,
  }),
  createQuestion({
    id: generateId("english", 81),

    question:
      "Choose the correct option: If he _____ earlier, he would have succeeded.",

    options: ["comes", "came", "had come", "has come"],

    answer: 2,

    topic: "Grammar",

    explanation: "Third conditional uses 'had + past participle'.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 82),

    question: "Choose the word opposite in meaning to 'TRANSPARENT'.",

    options: ["clear", "opaque", "bright", "clean"],

    answer: 1,

    topic: "Antonyms",

    explanation: "Opaque is the opposite of transparent.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 83),

    question: "Select the correct option: She is good _____ mathematics.",

    options: ["in", "on", "at", "for"],

    answer: 2,

    topic: "Grammar",

    explanation: "We say 'good at mathematics'.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 84),

    question: "Identify the literary device: 'The stars danced in the sky.'",

    options: ["Simile", "Metaphor", "Personification", "Alliteration"],

    answer: 2,

    topic: "Literature",

    explanation: "Stars are given human action (danced).",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 85),

    question: "Choose the option nearest in meaning to 'ELATED'.",

    options: ["sad", "angry", "happy", "confused"],

    answer: 2,

    topic: "Lexis",

    explanation: "Elated means extremely happy.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 86),

    question: "Choose the correct reported speech: 'I will go home,' she said.",

    options: [
      "She said she will go home.",
      "She said she would go home.",
      "She says she would go home.",
      "She said she go home.",
    ],

    answer: 1,

    topic: "Reported Speech",

    explanation: "Future tense changes to 'would' in indirect speech.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 87),

    question: "Choose the correctly spelt word.",

    options: ["Occasion", "Occassion", "Ocasion", "Occasssion"],

    answer: 0,

    topic: "Spelling",

    explanation: "'Occasion' is the correct spelling.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 88),

    question: "Choose the correct option: The news _____ very shocking.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "'News' is treated as singular uncountable noun.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 89),

    question:
      "Choose the word that best completes the analogy: Doctor is to hospital as teacher is to _____.",

    options: ["market", "school", "office", "bank"],

    answer: 1,

    topic: "Vocabulary",

    explanation: "Teachers work in schools.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 90),

    question: "Choose the option opposite in meaning to 'EXPAND'.",

    options: ["increase", "grow", "reduce", "enlarge"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Reduce is the opposite of expand.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 91),

    question: "Choose the correct option: Neither of the boys _____ guilty.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "'Neither' is singular.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 92),

    question: "Identify the figure of speech: 'Time is money.'",

    options: ["Simile", "Metaphor", "Personification", "Hyperbole"],

    answer: 1,

    topic: "Literature",

    explanation: "Time is directly compared to money.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 93),

    question: "Choose the word nearest in meaning to 'FRAGILE'.",

    options: ["strong", "weak", "durable", "heavy"],

    answer: 1,

    topic: "Lexis",

    explanation: "Fragile means easily broken or weak.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 94),

    question: "Choose the correct option: She prefers tea _____ coffee.",

    options: ["than", "to", "over", "from"],

    answer: 1,

    topic: "Grammar",

    explanation: "We say 'prefer A to B'.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 95),

    question: "Choose the correctly punctuated sentence.",

    options: [
      "Yes I will come.",
      "Yes, I will come.",
      "Yes I will, come.",
      "Yes, I will, come.",
    ],

    answer: 1,

    topic: "Punctuation",

    explanation: "A comma follows introductory 'Yes'.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 96),

    question: "Choose the option opposite in meaning to 'ACCURATE'.",

    options: ["correct", "exact", "wrong", "precise"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Wrong is the opposite of accurate.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 97),

    question:
      "Choose the correct option: The committee _____ divided in opinion.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "Committee is treated as singular.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 98),

    question:
      "Identify the part of speech of the underlined word: He arrived LATE.",

    options: ["Adjective", "Adverb", "Noun", "Verb"],

    answer: 1,

    topic: "Grammar",

    explanation: "Late describes the verb 'arrived', so it is an adverb.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 99),

    question: "Choose the correct option: I have lived here _____ five years.",

    options: ["since", "for", "from", "by"],

    answer: 1,

    topic: "Grammar",

    explanation: "'For' is used for duration of time.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 100),

    question: "Choose the option nearest in meaning to the word 'OBSTINATE'.",

    options: ["obedient", "stubborn", "careful", "kind"],

    answer: 1,

    topic: "Lexis",

    explanation:
      "Obstinate means stubborn or refusing to change one's opinion.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 101),

    question:
      "Choose the correct option: She hardly ever comes late, _____ she?",

    options: ["does", "doesn't", "is", "has"],

    answer: 0,

    topic: "Grammar",

    explanation: "Question tag for 'she comes' is 'does she'.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 102),

    question:
      "Identify the figure of speech: 'The classroom was a battlefield.'",

    options: ["Simile", "Metaphor", "Personification", "Alliteration"],

    answer: 1,

    topic: "Literature",

    explanation: "A direct comparison without 'like' or 'as' is a metaphor.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 103),

    question: "Choose the word opposite in meaning to 'BRIEF'.",

    options: ["short", "quick", "long", "concise"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Long is the opposite of brief.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 104),

    question:
      "Choose the correct option: The children were made _____ their homework.",

    options: ["do", "to do", "doing", "done"],

    answer: 1,

    topic: "Grammar",

    explanation: "After passive 'were made', we use 'to do'.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 105),

    question: "Choose the word nearest in meaning to 'VIGOROUS'.",

    options: ["weak", "strong", "lazy", "slow"],

    answer: 1,

    topic: "Lexis",

    explanation: "Vigorous means strong and energetic.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 106),

    question: "Choose the correct spelling.",

    options: ["Priviledge", "Privilege", "Previlege", "Privilage"],

    answer: 1,

    topic: "Spelling",

    explanation: "'Privilege' is the correct spelling.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 107),

    question:
      "Choose the correct option: She is not only intelligent _____ hardworking.",

    options: ["but", "and", "also", "but also"],

    answer: 3,

    topic: "Grammar",

    explanation: "Correct correlative structure is 'not only... but also'.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 108),

    question: "Choose the option opposite in meaning to 'COURAGE'.",

    options: ["bravery", "fear", "strength", "boldness"],

    answer: 1,

    topic: "Antonyms",

    explanation: "Fear is the opposite of courage.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 109),

    question: "Choose the correct option: He said that he _____ coming.",

    options: ["is", "was", "were", "be"],

    answer: 1,

    topic: "Reported Speech",

    explanation:
      "Present continuous changes to past continuous in indirect speech.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 110),

    question:
      "Choose the word that best completes the analogy: Eye is to seeing as ear is to _____.",

    options: ["listening", "hearing", "touching", "smelling"],

    answer: 1,

    topic: "Vocabulary",

    explanation: "Ear is used for hearing.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 111),

    question: "Choose the correctly punctuated sentence.",

    options: [
      "He said, I am tired.",
      "He said I am tired.",
      "He said, 'I am tired.'",
      "He said 'I am tired'.",
    ],

    answer: 2,

    topic: "Punctuation",

    explanation: "Direct speech requires quotation marks and a comma.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 112),

    question: "Choose the option nearest in meaning to 'ASSERTIVE'.",

    options: ["passive", "confident", "weak", "silent"],

    answer: 1,

    topic: "Lexis",

    explanation: "Assertive means confident and firm.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 113),

    question:
      "Choose the correct option: Neither the boys nor their father _____ present.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "Verb agrees with closest subject 'father' (singular).",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 114),

    question: "Identify the literary device: 'The thunder roared angrily.'",

    options: ["Simile", "Metaphor", "Personification", "Irony"],

    answer: 2,

    topic: "Literature",

    explanation: "Thunder is given human action (roared angrily).",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 115),

    question: "Choose the word opposite in meaning to 'LOYAL'.",

    options: ["faithful", "true", "disloyal", "honest"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Disloyal is the opposite of loyal.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 116),

    question:
      "Choose the correct option: She was accused _____ stealing the money.",

    options: ["of", "for", "with", "by"],

    answer: 0,

    topic: "Grammar",

    explanation: "We say 'accused of something'.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 117),

    question: "Choose the word nearest in meaning to 'EFFICIENT'.",

    options: ["lazy", "capable", "slow", "weak"],

    answer: 1,

    topic: "Lexis",

    explanation: "Efficient means capable and effective.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 118),

    question: "Choose the correct spelling.",

    options: ["Seperate", "Separate", "Seperrate", "Seperete"],

    answer: 1,

    topic: "Spelling",

    explanation: "'Separate' is correct.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 119),

    question: "Choose the correct option: The information _____ accurate.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "'Information' is uncountable and singular.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 120),

    question: "Choose the option opposite in meaning to 'SUCCESS'.",

    options: ["failure", "achievement", "victory", "progress"],

    answer: 0,

    topic: "Antonyms",

    explanation: "Failure is the opposite of success.",

    year: 2020,
  }),
  createQuestion({
    id: generateId("english", 121),

    question:
      "Choose the correct option: The man, together with his children, _____ arrived.",

    options: ["have", "has", "are", "were"],

    answer: 1,

    topic: "Grammar",

    explanation: "The main subject is 'man' (singular), so the verb is 'has'.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 122),

    question: "Identify the figure of speech: 'The sun smiled down on us.'",

    options: ["Simile", "Metaphor", "Personification", "Irony"],

    answer: 2,

    topic: "Literature",

    explanation: "The sun is given human action (smiled).",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 123),

    question: "Choose the word nearest in meaning to 'BRILLIANT'.",

    options: ["dull", "bright", "weak", "slow"],

    answer: 1,

    topic: "Lexis",

    explanation: "Brilliant means very bright or intelligent.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 124),

    question: "Choose the correct option: She would rather you _____ earlier.",

    options: ["come", "came", "comes", "coming"],

    answer: 1,

    topic: "Grammar",

    explanation: "After 'would rather', we use past tense.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 125),

    question: "Choose the option opposite in meaning to 'HARMONIOUS'.",

    options: ["peaceful", "conflicting", "calm", "friendly"],

    answer: 1,

    topic: "Antonyms",

    explanation: "Conflicting is the opposite of harmonious.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 126),

    question: "Choose the correctly spelt word.",

    options: ["Conscious", "Consious", "Conscous", "Consciencious"],

    answer: 0,

    topic: "Spelling",

    explanation: "'Conscious' is correct.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 127),

    question:
      "Choose the correct option: The police _____ investigating the case.",

    options: ["is", "are", "was", "be"],

    answer: 1,

    topic: "Grammar",

    explanation: "'Police' is treated as plural.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 128),

    question:
      "Choose the word that best completes the analogy: Fire is to burn as ice is to _____.",

    options: ["freeze", "melt", "heat", "cool"],

    answer: 0,

    topic: "Vocabulary",

    explanation: "Ice causes freezing.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 129),

    question: "Choose the correct option: He is accustomed _____ hard work.",

    options: ["to", "with", "for", "by"],

    answer: 0,

    topic: "Grammar",

    explanation: "We say 'accustomed to something'.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 130),

    question: "Choose the word opposite in meaning to 'VISIBLE'.",

    options: ["clear", "hidden", "bright", "open"],

    answer: 1,

    topic: "Antonyms",

    explanation: "Hidden is the opposite of visible.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 131),

    question:
      "Choose the correct option: She speaks English more fluently than _____.",

    options: ["me", "I", "my", "mine"],

    answer: 1,

    topic: "Grammar",

    explanation:
      "The correct comparative structure uses subject pronoun 'I' (elliptical clause).",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 132),

    question: "Identify the literary device: 'He drowned in a sea of grief.'",

    options: ["Simile", "Metaphor", "Personification", "Alliteration"],

    answer: 1,

    topic: "Literature",

    explanation: "Grief is compared to a sea without using 'like' or 'as'.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 133),

    question: "Choose the word nearest in meaning to 'DILIGENT'.",

    options: ["lazy", "careless", "hardworking", "slow"],

    answer: 2,

    topic: "Lexis",

    explanation: "Diligent means hardworking.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 134),

    question:
      "Choose the correct option: Not only the boys but also the teacher _____ present.",

    options: ["are", "were", "is", "be"],

    answer: 2,

    topic: "Grammar",

    explanation: "Verb agrees with the nearest subject 'teacher'.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 135),

    question: "Choose the correctly punctuated sentence.",

    options: [
      "After all, we succeeded.",
      "After all we succeeded.",
      "After, all we succeeded.",
      "After all; we succeeded.",
    ],

    answer: 0,

    topic: "Punctuation",

    explanation: "'After all,' is followed by a comma when used as a phrase.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 136),

    question: "Choose the word opposite in meaning to 'INCREASE'.",

    options: ["grow", "expand", "reduce", "add"],

    answer: 2,

    topic: "Antonyms",

    explanation: "Reduce is the opposite of increase.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 137),

    question: "Choose the correct option: The audience _____ clapping loudly.",

    options: ["is", "are", "was", "be"],

    answer: 1,

    topic: "Grammar",

    explanation: "'Audience' can be plural in sense of individuals.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 138),

    question: "Identify the part of speech: He worked very HARD.",

    options: ["Adjective", "Adverb", "Noun", "Verb"],

    answer: 1,

    topic: "Grammar",

    explanation: "'Hard' describes the verb 'worked'.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 139),

    question:
      "Choose the correct option: I have been waiting here _____ two hours.",

    options: ["since", "for", "from", "by"],

    answer: 1,

    topic: "Grammar",

    explanation: "'For' is used for duration.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 140),

    question: "Choose the word nearest in meaning to 'ADEQUATE'.",

    options: ["insufficient", "enough", "small", "weak"],

    answer: 1,

    topic: "Lexis",

    explanation: "Adequate means enough.",

    year: 2020,
  }),
  createQuestion({
    id: generateId("english", 141),

    question: "Choose the correct option: The news _____ spread very fast.",

    options: ["have", "has", "are", "were"],

    answer: 1,

    topic: "Grammar",

    explanation: "'News' is uncountable and singular, so it takes 'has'.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 142),

    question: "Choose the word opposite in meaning to 'EXPENSIVE'.",

    options: ["cheap", "costly", "valuable", "rich"],

    answer: 0,

    topic: "Antonyms",

    explanation: "Cheap is the opposite of expensive.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 143),

    question: "Choose the correct option: She insisted _____ paying the bill.",

    options: ["on", "in", "at", "for"],

    answer: 0,

    topic: "Grammar",

    explanation: "The correct expression is 'insisted on'.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 144),

    question: "Identify the figure of speech: 'He has a heart of stone.'",

    options: ["Simile", "Metaphor", "Hyperbole", "Irony"],

    answer: 1,

    topic: "Literature",

    explanation: "A metaphor is used to compare heart with stone.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 145),

    question: "Choose the word nearest in meaning to 'PROMINENT'.",

    options: ["unknown", "important", "small", "hidden"],

    answer: 1,

    topic: "Lexis",

    explanation: "Prominent means important or well-known.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 146),

    question: "Choose the correctly spelt word.",

    options: ["Achievment", "Achievement", "Acheivement", "Achivement"],

    answer: 1,

    topic: "Spelling",

    explanation: "'Achievement' is the correct spelling.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("english", 147),

    question: "Choose the correct option: He is interested _____ music.",

    options: ["in", "on", "at", "for"],

    answer: 0,

    topic: "Grammar",

    explanation: "We say 'interested in'.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("english", 148),

    question: "Choose the word opposite in meaning to 'PEACE'.",

    options: ["calm", "war", "quiet", "rest"],

    answer: 1,

    topic: "Antonyms",

    explanation: "War is the opposite of peace.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("english", 149),

    question:
      "Choose the correct option: The man, as well as his wife, _____ invited.",

    options: ["were", "are", "was", "have been"],

    answer: 2,

    topic: "Grammar",

    explanation: "The main subject 'man' is singular.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("english", 150),

    question: "Choose the word nearest in meaning to 'RELUCTANT'.",

    options: ["willing", "unwilling", "happy", "excited"],

    answer: 1,

    topic: "Lexis",

    explanation: "Reluctant means unwilling.",

    year: 2022,
  }),
];

/* =========================================================
MATHEMATICS
========================================================= */

const mathematics = [
  createQuestion({
    id: generateId("mathematics", 0),

    question: "Simplify √50 + 2√8.",

    options: ["7√2", "9√2", "5√2", "6√2"],

    answer: 1,

    topic: "Surds",

    explanation:
      "√50 = 5√2 and √8 = 2√2, therefore 2√8 = 4√2. Hence 5√2 + 4√2 = 9√2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 1),

    question: "Evaluate (3² × 3⁴) ÷ 3³.",

    options: ["3", "9", "27", "81"],

    answer: 2,

    topic: "Indices",

    explanation:
      "Add powers when multiplying and subtract when dividing. 3^(2+4-3) = 3³ = 27.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 2),

    question: "If log₁₀ 2 = 0.3010, evaluate log₁₀ 20.",

    options: ["0.3010", "1.3010", "2.3010", "20.3010"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log 20 = log(2 × 10) = log2 + log10 = 0.3010 + 1 = 1.3010.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 3),

    question: "Find the determinant of the matrix [[2,3],[1,4]].",

    options: ["5", "8", "11", "13"],

    answer: 0,

    topic: "Matrix",

    explanation: "Determinant = (2 × 4) − (3 × 1) = 8 − 3 = 5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 4),

    question: "Differentiate y = 4x³ − 2x² + 5.",

    options: ["12x² − 4x", "12x² − 2x", "4x² − 4x", "12x − 4"],

    answer: 0,

    topic: "Calculus",

    explanation: "Differentiate term by term. dy/dx = 12x² − 4x.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 5),

    question: "Solve for x: 2x − 7 = 15.",

    options: ["9", "10", "11", "12"],

    answer: 2,

    topic: "Algebra",

    explanation: "2x = 22, therefore x = 11.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 6),

    question: "Simplify (√27)/(√3).",

    options: ["3", "6", "9", "12"],

    answer: 0,

    topic: "Surds",

    explanation: "√27 ÷ √3 = √(27/3) = √9 = 3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 7),

    question: "Evaluate 5⁰ + 2³.",

    options: ["8", "9", "10", "11"],

    answer: 1,

    topic: "Indices",

    explanation: "5⁰ = 1 and 2³ = 8. Total = 9.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 8),

    question: "If log₁₀ 5 = 0.6990, evaluate log₁₀ 50.",

    options: ["0.6990", "1.6990", "2.6990", "5.6990"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log50 = log(5 × 10) = log5 + 1 = 1.6990.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 9),

    question: "Find the inverse of 5 × 2⁻¹.",

    options: ["2.5", "5", "10", "20"],

    answer: 0,

    topic: "Indices",

    explanation: "2⁻¹ = 1/2. Therefore 5 × 1/2 = 2.5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 10),

    question: "Integrate ∫ 6x dx.",

    options: ["3x² + C", "6x + C", "x² + C", "12x² + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫6x dx = 6 × x²/2 = 3x² + C.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 11),

    question: "Solve: x² − 9 = 0.",

    options: ["x = 3 only", "x = −3 only", "x = ±3", "x = 0"],

    answer: 2,

    topic: "Quadratic Equation",

    explanation: "x² = 9, therefore x = ±3.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 12),

    question: "Simplify √18 − √8.",

    options: ["√2", "2√2", "3√2", "4√2"],

    answer: 0,

    topic: "Surds",

    explanation: "√18 = 3√2 and √8 = 2√2. Difference = √2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 13),

    question: "Evaluate 2³ × 2⁴.",

    options: ["32", "64", "128", "256"],

    answer: 2,

    topic: "Indices",

    explanation: "2^(3+4) = 2⁷ = 128.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 14),

    question: "Find log₁₀ 1000.",

    options: ["1", "2", "3", "4"],

    answer: 2,

    topic: "Logarithm",

    explanation: "10³ = 1000, therefore log₁₀1000 = 3.",

    year: 2017,
  }),

  createQuestion({
    id: generateId("mathematics", 15),

    question: "Find the transpose of matrix [[1,2],[3,4]].",

    options: [
      "[[1,3],[2,4]]",
      "[[1,2],[3,4]]",
      "[[4,3],[2,1]]",
      "[[2,1],[4,3]]",
    ],

    answer: 0,

    topic: "Matrix",

    explanation: "Transpose is obtained by interchanging rows and columns.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 16),

    question: "Differentiate y = 7x².",

    options: ["7x", "14x", "21x", "28x"],

    answer: 1,

    topic: "Calculus",

    explanation: "dy/dx = 14x.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 17),

    question: "If 4x + 3 = 19, find x.",

    options: ["2", "3", "4", "5"],

    answer: 2,

    topic: "Algebra",

    explanation: "4x = 16, therefore x = 4.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 18),

    question: "Simplify (√75)/(√3).",

    options: ["5", "15", "25", "30"],

    answer: 0,

    topic: "Surds",

    explanation: "√75 ÷ √3 = √25 = 5.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 19),

    question: "Evaluate 9^(1/2).",

    options: ["1", "2", "3", "9"],

    answer: 2,

    topic: "Indices",

    explanation: "9^(1/2) means square root of 9 which is 3.",

    year: 2022,
  }),
  createQuestion({
    id: generateId("mathematics", 20),

    question: "Simplify 3√5 + 2√5.",

    options: ["5√5", "6√5", "√25", "10√5"],

    answer: 0,

    topic: "Surds",

    explanation: "Add like surds directly. 3√5 + 2√5 = 5√5.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 21),

    question: "Evaluate 5² × 5³.",

    options: ["125", "625", "3125", "15625"],

    answer: 2,

    topic: "Indices",

    explanation: "5² × 5³ = 5⁵ = 3125.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 22),

    question: "If log₁₀ 4 = 0.6021, evaluate log₁₀ 400.",

    options: ["0.6021", "1.6021", "2.6021", "3.6021"],

    answer: 2,

    topic: "Logarithm",

    explanation: "log400 = log4 + log100 = 0.6021 + 2 = 2.6021.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 23),

    question: "Find the determinant of [[4,1],[2,3]].",

    options: ["8", "10", "12", "14"],

    answer: 1,

    topic: "Matrix",

    explanation: "(4 × 3) − (1 × 2) = 12 − 2 = 10.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 24),

    question: "Differentiate y = 6x² + 3x − 1.",

    options: ["12x + 3", "6x + 3", "12x − 1", "6x² + 3"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 12x + 3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 25),

    question: "Integrate ∫ 4x³ dx.",

    options: ["x⁴ + C", "4x⁴ + C", "x³ + C", "2x⁴ + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫4x³dx = 4(x⁴/4) = x⁴ + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 26),

    question: "Solve x² − 16 = 0.",

    options: ["x = 4", "x = −4", "x = ±4", "x = 0"],

    answer: 2,

    topic: "Quadratic Equation",

    explanation: "x² = 16 therefore x = ±4.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 27),

    question: "Evaluate tan 45°.",

    options: ["0", "1", "√3", "2"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "tan45° = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 28),

    question:
      "A die is thrown once. Find the probability of getting an even number.",

    options: ["1/6", "1/3", "1/2", "2/3"],

    answer: 2,

    topic: "Probability",

    explanation: "Even numbers are 2, 4, 6. Probability = 3/6 = 1/2.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 29),

    question: "Find the mode of 2, 4, 4, 5, 7.",

    options: ["2", "4", "5", "7"],

    answer: 1,

    topic: "Statistics",

    explanation: "Mode is the most frequent number which is 4.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 30),

    question: "Find the compound interest on ₦1000 at 10% for 2 years.",

    options: ["₦100", "₦200", "₦210", "₦220"],

    answer: 2,

    topic: "Finance",

    explanation: "Amount = 1000(1.1)² = 1210. CI = 1210 − 1000 = ₦210.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 31),

    question:
      "Find the circumference of a circle of radius 7cm. (Take π = 22/7)",

    options: ["22cm", "44cm", "88cm", "154cm"],

    answer: 1,

    topic: "Mensuration",

    explanation: "Circumference = 2πr = 2 × 22/7 × 7 = 44cm.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 32),

    question: "Convert 1101₂ to base ten.",

    options: ["11", "12", "13", "14"],

    answer: 2,

    topic: "Number Base System",

    explanation: "1101₂ = 1×8 + 1×4 + 0×2 + 1×1 = 13.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 33),

    question: "Find the gradient of the line joining (1,2) and (5,10).",

    options: ["1", "2", "3", "4"],

    answer: 1,

    topic: "Coordinate Geometry",

    explanation: "(10 − 2)/(5 − 1) = 8/4 = 2.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 34),

    question: "Factorize x² − 5x + 6.",

    options: [
      "(x − 2)(x − 3)",
      "(x + 2)(x + 3)",
      "(x − 1)(x − 6)",
      "(x + 1)(x + 6)",
    ],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "Numbers that multiply to 6 and add to −5 are −2 and −3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 35),

    question: "Find the median of 3, 5, 7, 9, 11, 13, 15.",

    options: ["7", "8", "9", "10"],

    answer: 2,

    topic: "Statistics",

    explanation: "The middle number is 9.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 36),

    question: "If sin θ = 1, find θ.",

    options: ["0°", "30°", "60°", "90°"],

    answer: 3,

    topic: "Trigonometry",

    explanation: "sin90° = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 37),

    question:
      "Find the volume of a cylinder of radius 3cm and height 7cm. (Take π = 22/7)",

    options: ["99cm³", "154cm³", "198cm³", "297cm³"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Volume = πr²h = 22/7 × 9 × 7 = 198cm³.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 38),

    question: "Solve for x: 5x + 4 = 24.",

    options: ["2", "3", "4", "5"],

    answer: 2,

    topic: "Algebra",

    explanation: "5x = 20 therefore x = 4.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 39),

    question: "Evaluate cos 0°.",

    options: ["0", "1/2", "1", "√3/2"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "cos0° = 1.",

    year: 2022,
  }),
  createQuestion({
    id: generateId("mathematics", 40),

    question: "Simplify √98.",

    options: ["5√2", "6√2", "7√2", "8√2"],

    answer: 2,

    topic: "Surds",

    explanation: "√98 = √(49 × 2) = 7√2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 41),

    question: "Evaluate 3⁴ ÷ 3².",

    options: ["3", "9", "27", "81"],

    answer: 1,

    topic: "Indices",

    explanation: "3⁴ ÷ 3² = 3^(4−2) = 3² = 9.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 42),

    question: "If log₁₀3 = 0.4771, evaluate log₁₀30.",

    options: ["0.4771", "1.4771", "2.4771", "3.4771"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log30 = log3 + log10 = 0.4771 + 1 = 1.4771.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 43),

    question: "Find the determinant of [[5,2],[3,1]].",

    options: ["-1", "1", "5", "7"],

    answer: 0,

    topic: "Matrix",

    explanation: "(5 × 1) − (2 × 3) = 5 − 6 = -1.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 44),

    question: "Differentiate y = 8x³ + 2x².",

    options: ["24x² + 4x", "16x² + 2x", "24x² + 2x", "8x² + 4x"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 24x² + 4x.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 45),

    question: "Integrate ∫ 5x² dx.",

    options: ["(5x³/3) + C", "5x³ + C", "10x³ + C", "x³ + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫5x²dx = 5(x³/3) + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 46),

    question: "Solve x² + 7x + 12 = 0.",

    options: ["x = -3, -4", "x = 3, 4", "x = -2, -6", "x = 2, 6"],

    answer: 0,

    topic: "Quadratic Equation",

    explanation: "Factorize: (x + 3)(x + 4) = 0.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 47),

    question: "Evaluate sin 60°.",

    options: ["1/2", "√2/2", "√3/2", "1"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "sin60° = √3/2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 48),

    question:
      "A card is selected from a pack of 52 cards. Find the probability of selecting a king.",

    options: ["1/52", "1/26", "1/13", "4/13"],

    answer: 2,

    topic: "Probability",

    explanation: "There are 4 kings in 52 cards. Probability = 4/52 = 1/13.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 49),

    question: "Find the range of 3, 8, 12, 15, 20.",

    options: ["12", "15", "17", "20"],

    answer: 2,

    topic: "Statistics",

    explanation: "Range = Highest − Lowest = 20 − 3 = 17.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 50),

    question: "Find the simple interest on ₦8000 at 5% for 3 years.",

    options: ["₦1000", "₦1200", "₦1500", "₦1800"],

    answer: 1,

    topic: "Finance",

    explanation: "SI = (PRT)/100 = (8000 × 5 × 3)/100 = ₦1200.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 51),

    question: "Find the area of a triangle with base 12cm and height 8cm.",

    options: ["24cm²", "48cm²", "72cm²", "96cm²"],

    answer: 1,

    topic: "Mensuration",

    explanation: "Area = 1/2 × base × height = 1/2 × 12 × 8 = 48cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 52),

    question: "Convert 23₁₀ to base 2.",

    options: ["10110", "10111", "11011", "11101"],

    answer: 1,

    topic: "Number Base System",

    explanation: "23₁₀ = 10111₂.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 53),

    question:
      "Find the equation of a line with gradient 2 passing through the origin.",

    options: ["y = 2x", "y = x + 2", "2y = x", "y = 2"],

    answer: 0,

    topic: "Coordinate Geometry",

    explanation: "Equation of line through origin is y = mx.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 54),

    question: "Expand (2x + 3)(x − 4).",

    options: [
      "2x² − 5x − 12",
      "2x² + 5x − 12",
      "2x² − 8x + 3",
      "2x² + 8x − 12",
    ],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "2x² − 8x + 3x − 12 = 2x² − 5x − 12.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 55),

    question: "Find the mean of 5, 7, 9, 11, 13.",

    options: ["7", "8", "9", "10"],

    answer: 2,

    topic: "Statistics",

    explanation: "(5 + 7 + 9 + 11 + 13)/5 = 45/5 = 9.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 56),

    question: "If cos θ = 0, find θ.",

    options: ["0°", "30°", "60°", "90°"],

    answer: 3,

    topic: "Trigonometry",

    explanation: "cos90° = 0.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 57),

    question: "Find the total surface area of a cube of side 5cm.",

    options: ["25cm²", "75cm²", "125cm²", "150cm²"],

    answer: 3,

    topic: "Mensuration",

    explanation: "TSA = 6a² = 6 × 25 = 150cm².",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 58),

    question: "Solve 7x − 9 = 26.",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Algebra",

    explanation: "7x = 35 therefore x = 5.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 59),

    question: "Evaluate tan 60°.",

    options: ["1/√3", "1", "√3", "2"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "tan60° = √3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 60),

    question: "Simplify √45 + √20.",

    options: ["5√5", "6√5", "7√5", "8√5"],

    answer: 0,

    topic: "Surds",

    explanation: "√45 = 3√5 and √20 = 2√5. Therefore 3√5 + 2√5 = 5√5.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 61),

    question: "Evaluate 4³ × 4².",

    options: ["256", "512", "1024", "2048"],

    answer: 2,

    topic: "Indices",

    explanation: "4³ × 4² = 4⁵ = 1024.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 62),

    question: "If log₁₀5 = 0.6990, evaluate log₁₀0.5.",

    options: ["-0.3010", "0.3010", "-0.6990", "0.6990"],

    answer: 0,

    topic: "Logarithm",

    explanation: "log0.5 = log5 − 1 = 0.6990 − 1 = -0.3010.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 63),

    question: "Find the determinant of [[6,4],[2,5]].",

    options: ["18", "20", "22", "24"],

    answer: 2,

    topic: "Matrix",

    explanation: "(6 × 5) − (4 × 2) = 30 − 8 = 22.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 64),

    question: "Differentiate y = 9x² − 7x + 4.",

    options: ["18x − 7", "18x + 7", "9x − 7", "18x + 4"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 18x − 7.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 65),

    question: "Integrate ∫ 7x dx.",

    options: ["7x² + C", "(7x²/2) + C", "14x² + C", "x² + C"],

    answer: 1,

    topic: "Calculus",

    explanation: "∫7x dx = 7(x²/2) + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 66),

    question: "Solve x² − 25 = 0.",

    options: ["x = 5", "x = -5", "x = ±5", "x = 0"],

    answer: 2,

    topic: "Quadratic Equation",

    explanation: "x² = 25 therefore x = ±5.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 67),

    question: "Evaluate cos 30°.",

    options: ["1/2", "√2/2", "√3/2", "1"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "cos30° = √3/2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 68),

    question:
      "A bag contains 4 green balls and 6 yellow balls. Find the probability of selecting a yellow ball.",

    options: ["2/5", "3/5", "4/5", "1/2"],

    answer: 1,

    topic: "Probability",

    explanation: "Probability = 6/10 = 3/5.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 69),

    question: "Find the mean of 6, 8, 10, 12, 14.",

    options: ["8", "9", "10", "11"],

    answer: 2,

    topic: "Statistics",

    explanation: "(6 + 8 + 10 + 12 + 14)/5 = 50/5 = 10.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 70),

    question: "Find the compound interest on ₦2000 at 5% for 2 years.",

    options: ["₦200", "₦205", "₦210", "₦215"],

    answer: 1,

    topic: "Finance",

    explanation: "Amount = 2000(1.05)² = 2205. CI = 2205 − 2000 = ₦205.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 71),

    question:
      "Find the perimeter of a rectangle of length 12cm and breadth 5cm.",

    options: ["17cm", "24cm", "34cm", "60cm"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Perimeter = 2(l + b) = 2(12 + 5) = 34cm.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 72),

    question: "Convert 11101₂ to base ten.",

    options: ["27", "28", "29", "30"],

    answer: 2,

    topic: "Number Base System",

    explanation: "11101₂ = 16 + 8 + 4 + 0 + 1 = 29.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 73),

    question: "Find the distance between points (1,2) and (4,6).",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Coordinate Geometry",

    explanation: "Distance = √[(4−1)² + (6−2)²] = √25 = 5.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 74),

    question: "Factorize x² − 9.",

    options: ["(x − 3)(x + 3)", "(x − 9)(x + 1)", "(x − 1)(x + 9)", "(x + 3)²"],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "x² − 9 is a difference of two squares.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 75),

    question: "Find the mode of 1, 2, 2, 3, 4, 4, 4, 5.",

    options: ["2", "3", "4", "5"],

    answer: 2,

    topic: "Statistics",

    explanation: "4 occurs most frequently.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 76),

    question: "If tan θ = √3, find θ.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "tan60° = √3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 77),

    question:
      "Find the volume of a cone of radius 3cm and height 7cm. (Take π = 22/7)",

    options: ["22cm³", "44cm³", "66cm³", "88cm³"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Volume = 1/3πr²h = 1/3 × 22/7 × 9 × 7 = 66cm³.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 78),

    question: "Solve 9x + 5 = 50.",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Algebra",

    explanation: "9x = 45 therefore x = 5.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 79),

    question: "Evaluate sin 90°.",

    options: ["0", "1/2", "√3/2", "1"],

    answer: 3,

    topic: "Trigonometry",

    explanation: "sin90° = 1.",

    year: 2023,
  }),
  createQuestion({
    id: generateId("mathematics", 80),

    question: "Simplify 2√12 + √27.",

    options: ["5√3", "6√3", "7√3", "8√3"],

    answer: 2,

    topic: "Surds",

    explanation: "√12 = 2√3, therefore 2√12 = 4√3 and √27 = 3√3. Total = 7√3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 81),

    question: "Evaluate 2⁵ ÷ 2².",

    options: ["4", "8", "16", "32"],

    answer: 1,

    topic: "Indices",

    explanation: "2⁵ ÷ 2² = 2³ = 8.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 82),

    question: "If log₁₀7 = 0.8451, evaluate log₁₀70.",

    options: ["0.8451", "1.8451", "2.8451", "3.8451"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log70 = log7 + log10 = 0.8451 + 1 = 1.8451.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 83),

    question: "Find the determinant of [[7,3],[2,4]].",

    options: ["18", "20", "22", "24"],

    answer: 2,

    topic: "Matrix",

    explanation: "(7 × 4) − (3 × 2) = 28 − 6 = 22.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 84),

    question: "Differentiate y = 10x³ − 5x² + 2.",

    options: ["30x² − 10x", "20x² − 5x", "30x² − 5x", "10x² − 10x"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 30x² − 10x.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 85),

    question: "Integrate ∫ 8x² dx.",

    options: ["(8x³/3) + C", "8x³ + C", "4x³ + C", "2x³ + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫8x²dx = 8(x³/3) + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 86),

    question: "Solve x² + 8x + 15 = 0.",

    options: ["x = -3, -5", "x = 3, 5", "x = -1, -15", "x = 1, 15"],

    answer: 0,

    topic: "Quadratic Equation",

    explanation: "Factorize: (x + 3)(x + 5) = 0.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 87),

    question: "Evaluate cot 45°.",

    options: ["0", "1", "√3", "2"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "cot45° = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 88),

    question:
      "Two coins are tossed together. Find the probability of getting two heads.",

    options: ["1/2", "1/3", "1/4", "3/4"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Possible outcomes are HH, HT, TH, TT. Only HH satisfies the condition.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 89),

    question: "Find the median of 4, 6, 8, 10, 12.",

    options: ["6", "7", "8", "9"],

    answer: 2,

    topic: "Statistics",

    explanation: "The middle value is 8.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 90),

    question: "Find the simple interest on ₦6000 at 8% per annum for 2 years.",

    options: ["₦760", "₦860", "₦960", "₦1060"],

    answer: 2,

    topic: "Finance",

    explanation: "SI = (6000 × 8 × 2)/100 = ₦960.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 91),

    question:
      "Find the area of a trapezium with parallel sides 8cm and 12cm and height 5cm.",

    options: ["40cm²", "45cm²", "50cm²", "60cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Area = 1/2(a+b)h = 1/2(8+12) × 5 = 50cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 92),

    question: "Convert 101101₂ to base ten.",

    options: ["43", "44", "45", "46"],

    answer: 2,

    topic: "Number Base System",

    explanation: "101101₂ = 32 + 8 + 4 + 1 = 45.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 93),

    question: "Find the midpoint of the line joining (2,4) and (6,8).",

    options: ["(2,6)", "(4,6)", "(6,4)", "(8,12)"],

    answer: 1,

    topic: "Coordinate Geometry",

    explanation: "Midpoint = ((2+6)/2, (4+8)/2) = (4,6).",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 94),

    question: "Expand (x − 5)(x + 2).",

    options: ["x² − 3x − 10", "x² + 3x − 10", "x² − 7x + 10", "x² + 7x − 10"],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "x² + 2x − 5x − 10 = x² − 3x − 10.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 95),

    question: "Find the range of 7, 9, 12, 18, 20.",

    options: ["11", "12", "13", "14"],

    answer: 2,

    topic: "Statistics",

    explanation: "Range = 20 − 7 = 13.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 96),

    question: "If sec θ = 2, find cos θ.",

    options: ["1/4", "1/3", "1/2", "2"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "secθ = 1/cosθ, therefore cosθ = 1/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 97),

    question: "Find the volume of a sphere of radius 3cm. (Take π = 22/7)",

    options: ["36π cm³", "48π cm³", "72π cm³", "108π cm³"],

    answer: 0,

    topic: "Mensuration",

    explanation: "Volume = 4/3πr³ = 4/3π × 27 = 36π cm³.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 98),

    question: "Solve 4x − 7 = 21.",

    options: ["5", "6", "7", "8"],

    answer: 2,

    topic: "Algebra",

    explanation: "4x = 28 therefore x = 7.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 99),

    question: "Evaluate cos 90°.",

    options: ["0", "1/2", "√3/2", "1"],

    answer: 0,

    topic: "Trigonometry",

    explanation: "cos90° = 0.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 100),

    question: "Simplify √108 − √12.",

    options: ["2√3", "4√3", "6√3", "8√3"],

    answer: 2,

    topic: "Surds",

    explanation: "√108 = 6√3 and √12 = 2√3. Therefore 6√3 − 2√3 = 4√3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 101),

    question: "Evaluate 10² × 10⁻¹.",

    options: ["1", "10", "100", "1000"],

    answer: 1,

    topic: "Indices",

    explanation: "10² × 10⁻¹ = 10^(2−1) = 10.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 102),

    question: "If log₁₀2 = 0.3010 and log₁₀3 = 0.4771, evaluate log₁₀6.",

    options: ["0.6021", "0.7781", "1.6021", "1.7781"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log6 = log2 + log3 = 0.3010 + 0.4771 = 0.7781.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 103),

    question: "Find the determinant of [[8,5],[3,2]].",

    options: ["1", "2", "3", "4"],

    answer: 0,

    topic: "Matrix",

    explanation: "(8 × 2) − (5 × 3) = 16 − 15 = 1.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 104),

    question: "Differentiate y = 12x⁴ − 3x² + 7.",

    options: ["48x³ − 6x", "24x³ − 6x", "48x³ − 3x", "12x³ − 6x"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 48x³ − 6x.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 105),

    question: "Integrate ∫ 9x³ dx.",

    options: ["(9x⁴/4) + C", "9x⁴ + C", "3x⁴ + C", "18x⁴ + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫9x³dx = 9(x⁴/4) + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 106),

    question: "Solve x² − 7x + 10 = 0.",

    options: ["x = 2, 5", "x = -2, -5", "x = 1, 10", "x = -1, -10"],

    answer: 0,

    topic: "Quadratic Equation",

    explanation: "Factorize: (x − 2)(x − 5) = 0.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 107),

    question: "Evaluate cosec 30°.",

    options: ["1", "2", "√2", "√3"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "cosec30° = 1/sin30° = 2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 108),

    question:
      "Three coins are tossed together. Find the probability of getting exactly two heads.",

    options: ["1/8", "2/8", "3/8", "4/8"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Possible outcomes with exactly two heads are HHT, HTH, and THH. Probability = 3/8.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 109),

    question: "Find the mean of 12, 15, 18, 21, 24.",

    options: ["16", "17", "18", "19"],

    answer: 2,

    topic: "Statistics",

    explanation: "(12 + 15 + 18 + 21 + 24)/5 = 90/5 = 18.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 110),

    question: "Find the simple interest on ₦9000 at 6% for 2 years.",

    options: ["₦980", "₦1080", "₦1180", "₦1280"],

    answer: 1,

    topic: "Finance",

    explanation: "SI = (9000 × 6 × 2)/100 = ₦1080.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 111),

    question: "Find the area of a parallelogram with base 15cm and height 8cm.",

    options: ["60cm²", "90cm²", "120cm²", "150cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Area = base × height = 15 × 8 = 120cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 112),

    question: "Convert 34₁₀ to base 2.",

    options: ["100010", "100011", "100100", "100101"],

    answer: 0,

    topic: "Number Base System",

    explanation: "34₁₀ = 100010₂.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 113),

    question: "Find the gradient of the line 2y = 6x + 4.",

    options: ["1", "2", "3", "4"],

    answer: 2,

    topic: "Coordinate Geometry",

    explanation: "2y = 6x + 4 ⇒ y = 3x + 2. Gradient = 3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 114),

    question: "Factorize x² + 2x − 15.",

    options: [
      "(x + 5)(x − 3)",
      "(x − 5)(x + 3)",
      "(x + 15)(x − 1)",
      "(x − 15)(x + 1)",
    ],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "Numbers that multiply to -15 and add to 2 are 5 and -3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 115),

    question: "Find the mode of 5, 5, 6, 7, 7, 7, 9.",

    options: ["5", "6", "7", "9"],

    answer: 2,

    topic: "Statistics",

    explanation: "7 appears most frequently.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 116),

    question: "If sin θ = √3/2, find θ.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "sin60° = √3/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 117),

    question:
      "Find the curved surface area of a cylinder of radius 7cm and height 10cm. (Take π = 22/7)",

    options: ["220cm²", "330cm²", "440cm²", "550cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "CSA = 2πrh = 2 × 22/7 × 7 × 10 = 440cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 118),

    question: "Solve 6x + 11 = 47.",

    options: ["4", "5", "6", "7"],

    answer: 2,

    topic: "Algebra",

    explanation: "6x = 36 therefore x = 6.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 119),

    question: "Evaluate tan 30°.",

    options: ["1/√3", "1", "√3", "2"],

    answer: 0,

    topic: "Trigonometry",

    explanation: "tan30° = 1/√3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 120),

    question: "Simplify √200.",

    options: ["5√2", "10√2", "15√2", "20√2"],

    answer: 1,

    topic: "Surds",

    explanation: "√200 = √(100 × 2) = 10√2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 121),

    question: "Evaluate 9³ ÷ 9².",

    options: ["3", "9", "27", "81"],

    answer: 1,

    topic: "Indices",

    explanation: "9³ ÷ 9² = 9^(3−2) = 9.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 122),

    question: "If log₁₀2 = 0.3010, evaluate log₁₀8.",

    options: ["0.6020", "0.9030", "1.2040", "1.5050"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log8 = log(2³) = 3log2 = 3 × 0.3010 = 0.9030.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 123),

    question: "Find the determinant of [[9,4],[2,7]].",

    options: ["49", "55", "63", "71"],

    answer: 1,

    topic: "Matrix",

    explanation: "(9 × 7) − (4 × 2) = 63 − 8 = 55.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 124),

    question: "Differentiate y = 15x² − 4x + 9.",

    options: ["30x − 4", "15x − 4", "30x + 4", "15x + 9"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 30x − 4.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 125),

    question: "Integrate ∫ 12x dx.",

    options: ["6x² + C", "12x² + C", "24x² + C", "x² + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫12x dx = 12(x²/2) + C = 6x² + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 126),

    question: "Solve x² + 9x + 20 = 0.",

    options: ["x = -4, -5", "x = 4, 5", "x = -2, -10", "x = 2, 10"],

    answer: 0,

    topic: "Quadratic Equation",

    explanation: "Factorize: (x + 4)(x + 5) = 0.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 127),

    question: "Evaluate sec 60°.",

    options: ["1/2", "1", "2", "√3"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "sec60° = 1/cos60° = 2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 128),

    question:
      "A box contains 5 red balls and 5 blue balls. Find the probability of selecting a blue ball.",

    options: ["1/5", "2/5", "1/2", "3/5"],

    answer: 2,

    topic: "Probability",

    explanation: "Probability = 5/10 = 1/2.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 129),

    question: "Find the range of 10, 15, 20, 25, 35.",

    options: ["15", "20", "25", "30"],

    answer: 2,

    topic: "Statistics",

    explanation: "Range = 35 − 10 = 25.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 130),

    question: "Find the compound interest on ₦5000 at 10% for 2 years.",

    options: ["₦1000", "₦1050", "₦1100", "₦1200"],

    answer: 1,

    topic: "Finance",

    explanation: "Amount = 5000(1.1)² = 6050. CI = 6050 − 5000 = ₦1050.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 131),

    question:
      "Find the area of a sector of angle 90° in a circle of radius 14cm. (Take π = 22/7)",

    options: ["77cm²", "88cm²", "154cm²", "176cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Area = (90/360) × πr² = 1/4 × 22/7 × 14 × 14 = 154cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 132),

    question: "Convert 111111₂ to base ten.",

    options: ["61", "62", "63", "64"],

    answer: 2,

    topic: "Number Base System",

    explanation: "111111₂ = 32 + 16 + 8 + 4 + 2 + 1 = 63.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 133),

    question: "Find the midpoint between (3,5) and (7,9).",

    options: ["(4,6)", "(5,7)", "(6,8)", "(7,9)"],

    answer: 1,

    topic: "Coordinate Geometry",

    explanation: "Midpoint = ((3+7)/2, (5+9)/2) = (5,7).",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 134),

    question: "Factorize x² − x − 12.",

    options: [
      "(x − 4)(x + 3)",
      "(x + 4)(x − 3)",
      "(x − 6)(x + 2)",
      "(x + 6)(x − 2)",
    ],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "Numbers that multiply to -12 and add to -1 are -4 and 3.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 135),

    question: "Find the median of 5, 7, 9, 11, 13, 15, 17.",

    options: ["9", "10", "11", "12"],

    answer: 2,

    topic: "Statistics",

    explanation: "The middle value is 11.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 136),

    question: "If cos θ = 1/2, find θ.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "cos60° = 1/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 137),

    question:
      "Find the total surface area of a cylinder of radius 7cm and height 10cm. (Take π = 22/7)",

    options: ["748cm²", "756cm²", "774cm²", "880cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "TSA = 2πr(h+r) = 2 × 22/7 × 7 × (10+7) = 748cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 138),

    question: "Solve 8x − 13 = 43.",

    options: ["5", "6", "7", "8"],

    answer: 2,

    topic: "Algebra",

    explanation: "8x = 56 therefore x = 7.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 139),

    question: "Evaluate cot 60°.",

    options: ["1/√3", "1", "√3", "2"],

    answer: 0,

    topic: "Trigonometry",

    explanation: "cot60° = 1/tan60° = 1/√3.",

    year: 2023,
  }),
  createQuestion({
    id: generateId("mathematics", 140),

    question: "Simplify √147.",

    options: ["5√3", "6√3", "7√3", "8√3"],

    answer: 2,

    topic: "Surds",

    explanation: "√147 = √(49 × 3) = 7√3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 141),

    question: "Evaluate 2⁶ × 2⁻².",

    options: ["4", "8", "16", "32"],

    answer: 2,

    topic: "Indices",

    explanation: "2⁶ × 2⁻² = 2⁴ = 16.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 142),

    question: "If log₁₀2 = 0.3010, evaluate log₁₀4.",

    options: ["0.3010", "0.6020", "0.9030", "1.2040"],

    answer: 1,

    topic: "Logarithm",

    explanation: "log4 = log(2²) = 2log2 = 0.6020.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 143),

    question: "Find the determinant of [[10,3],[4,5]].",

    options: ["32", "38", "42", "50"],

    answer: 1,

    topic: "Matrix",

    explanation: "(10 × 5) − (3 × 4) = 50 − 12 = 38.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 144),

    question: "Differentiate y = 7x⁵ − 2x² + 4.",

    options: ["35x⁴ − 4x", "35x⁴ − 2x", "14x⁴ − 4x", "35x⁵ − 4x"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 35x⁴ − 4x.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 145),

    question: "Integrate ∫ 3x⁴ dx.",

    options: ["(3x⁵/5) + C", "3x⁵ + C", "x⁵ + C", "6x⁵ + C"],

    answer: 0,

    topic: "Calculus",

    explanation: "∫3x⁴dx = 3(x⁵/5) + C.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 146),

    question: "Solve x² − 11x + 24 = 0.",

    options: ["x = 3, 8", "x = 4, 6", "x = -4, -6", "x = -3, -8"],

    answer: 1,

    topic: "Quadratic Equation",

    explanation: "Factorize: (x − 4)(x − 6) = 0.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 147),

    question: "Evaluate sec 45°.",

    options: ["1", "√2", "√3", "2"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "sec45° = 1/cos45° = √2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 148),

    question:
      "A letter is chosen from the word 'HELP'. Find the probability of choosing H.",

    options: ["1/2", "1/3", "1/4", "1/5"],

    answer: 2,

    topic: "Probability",

    explanation: "There are 4 letters and only one H. Probability = 1/4.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 149),

    question: "Find the mean of 3, 6, 9, 12, 15.",

    options: ["7", "8", "9", "10"],

    answer: 2,

    topic: "Statistics",

    explanation: "(3 + 6 + 9 + 12 + 15)/5 = 45/5 = 9.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 150),

    question: "Find the simple interest on ₦7000 at 4% for 3 years.",

    options: ["₦740", "₦840", "₦940", "₦1040"],

    answer: 1,

    topic: "Finance",

    explanation: "SI = (7000 × 4 × 3)/100 = ₦840.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 151),

    question: "Find the volume of a cuboid of dimensions 8cm, 5cm and 4cm.",

    options: ["120cm³", "140cm³", "160cm³", "180cm³"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Volume = length × breadth × height = 8 × 5 × 4 = 160cm³.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 152),

    question: "Convert 52₁₀ to base 2.",

    options: ["110010", "110011", "110100", "111000"],

    answer: 2,

    topic: "Number Base System",

    explanation: "52₁₀ = 110100₂.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 153),

    question: "Find the distance between points (2,1) and (5,5).",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Coordinate Geometry",

    explanation: "Distance = √[(5−2)² + (5−1)²] = √25 = 5.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 154),

    question: "Expand (x + 4)(x + 5).",

    options: ["x² + 9x + 20", "x² − 9x + 20", "x² + x + 20", "x² + 20"],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "x² + 5x + 4x + 20 = x² + 9x + 20.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 155),

    question: "Find the mode of 2, 2, 3, 5, 5, 5, 7.",

    options: ["2", "3", "5", "7"],

    answer: 2,

    topic: "Statistics",

    explanation: "5 occurs most frequently.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 156),

    question: "If tan θ = 1/√3, find θ.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 0,

    topic: "Trigonometry",

    explanation: "tan30° = 1/√3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 157),

    question:
      "Find the curved surface area of a cone of radius 7cm and slant height 10cm. (Take π = 22/7)",

    options: ["154cm²", "220cm²", "330cm²", "440cm²"],

    answer: 1,

    topic: "Mensuration",

    explanation: "CSA = πrl = 22/7 × 7 × 10 = 220cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 158),

    question: "Solve 12x − 8 = 64.",

    options: ["4", "5", "6", "7"],

    answer: 2,

    topic: "Algebra",

    explanation: "12x = 72 therefore x = 6.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 159),

    question: "Evaluate sin 45°.",

    options: ["1/2", "√2/2", "√3/2", "1"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "sin45° = √2/2.",

    year: 2023,
  }),

  createQuestion({
    id: generateId("mathematics", 200),

    question: "Simplify √72 − √32.",

    options: ["2√2", "4√2", "6√2", "8√2"],

    answer: 201,

    topic: "Surds",

    explanation: "√72 = 6√2 and √32 = 4√2. Therefore 6√2 − 4√2 = 2√2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 202),

    question: "Evaluate 2³ × 2⁴ ÷ 2².",

    options: ["8", "16", "32", "64"],

    answer: 2,

    topic: "Indices",

    explanation: "2^(3+4−2) = 2⁵ = 32.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 203),

    question: "If log₁₀2 = 0.3010, evaluate log₁₀200.",

    options: ["0.3010", "1.3010", "2.3010", "3.3010"],

    answer: 2,

    topic: "Logarithm",

    explanation: "log200 = log(2 × 100) = log2 + log100 = 0.3010 + 2 = 2.3010.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 204),

    question: "Find the determinant of [[3,2],[1,5]].",

    options: ["13", "15", "17", "19"],

    answer: 0,

    topic: "Matrix",

    explanation: "(3 × 5) − (2 × 1) = 15 − 2 = 13.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 205),

    question: "Differentiate y = 5x³ − 4x + 7.",

    options: ["15x² − 4", "15x² − 7", "5x² − 4", "10x² − 4"],

    answer: 0,

    topic: "Calculus",

    explanation: "dy/dx = 15x² − 4.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 206),

    question: "Solve 3x − 7 = 11.",

    options: ["4", "5", "6", "7"],

    answer: 2,

    topic: "Algebra",

    explanation: "3x = 18 therefore x = 6.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 207),

    question: "Find the value of x if 2x² = 50.",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Quadratic Equation",

    explanation: "x² = 25 therefore x = 5.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 208),

    question: "Evaluate sin 30°.",

    options: ["0", "1/2", "√3/2", "1"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "sin30° = 1/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 209),

    question:
      "A bag contains 3 red balls and 2 blue balls. Find the probability of picking a red ball.",

    options: ["1/5", "2/5", "3/5", "4/5"],

    answer: 2,

    topic: "Probability",

    explanation: "Probability = Number of red balls / Total balls = 3/5.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 210),

    question: "Find the mean of 4, 6, 8, 12.",

    options: ["6", "7", "7.5", "8"],

    answer: 2,

    topic: "Statistics",

    explanation: "(4 + 6 + 8 + 12) / 4 = 30 / 4 = 7.5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 211),

    question: "Find the simple interest on ₦5000 at 10% per annum for 2 years.",

    options: ["₦500", "₦1000", "₦1500", "₦2000"],

    answer: 1,

    topic: "Mensuration and Finance",

    explanation: "SI = (PRT)/100 = (5000 × 10 × 2)/100 = ₦1000.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 212),

    question: "Find the area of a circle of radius 7cm. (Take π = 22/7)",

    options: ["44cm²", "88cm²", "154cm²", "308cm²"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Area = πr² = (22/7) × 7 × 7 = 154cm².",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 213),

    question: "Convert 1011₂ to base ten.",

    options: ["9", "10", "11", "12"],

    answer: 2,

    topic: "Number Base System",

    explanation: "1011₂ = 1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 8 + 2 + 1 = 11.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 214),

    question: "Find the gradient of the line joining (2,3) and (6,11).",

    options: ["1", "2", "3", "4"],

    answer: 1,

    topic: "Coordinate Geometry",

    explanation: "Gradient = (11 − 3)/(6 − 2) = 8/4 = 2.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 215),

    question: "Expand (x + 3)(x − 2).",

    options: ["x² + x − 6", "x² − x − 6", "x² + 5x − 6", "x² − 5x − 6"],

    answer: 0,

    topic: "Algebraic Process",

    explanation: "x² − 2x + 3x − 6 = x² + x − 6.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 216),

    question: "Find the median of 2, 4, 6, 8, 10.",

    options: ["4", "5", "6", "7"],

    answer: 2,

    topic: "Statistics",

    explanation: "The middle number is 6.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 217),

    question: "If tan θ = 1, find θ.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "tan45° = 1.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 218),

    question: "Find the volume of a cube of side 4cm.",

    options: ["16cm³", "32cm³", "48cm³", "64cm³"],

    answer: 3,

    topic: "Mensuration",

    explanation: "Volume = side³ = 4³ = 64cm³.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 219),

    question: "Solve for x: x/3 + 5 = 9.",

    options: ["10", "11", "12", "13"],

    answer: 2,

    topic: "Algebra",

    explanation: "x/3 = 4 therefore x = 12.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 220),

    question: "Evaluate cos 60°.",

    options: ["0", "1/2", "√3/2", "1"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "cos60° = 1/2.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 220),

    question: "If 2x + 3y = 12 and x - y = 1, find the value of x² + y².",

    options: ["10", "13", "17", "25"],

    answer: 1,

    topic: "Simultaneous Equations",

    explanation:
      "From x - y = 1, x = y + 1. Substitute into 2x + 3y = 12: 2(y + 1) + 3y = 12 → 5y = 10 → y = 2 and x = 3. Therefore, x² + y² = 3² + 2² = 13.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 221),

    question: "Solve for x: log₂(x - 1) + log₂(x - 3) = 3.",

    options: ["3", "5", "7", "9"],

    answer: 1,

    topic: "Logarithm",

    explanation:
      "Using log laws: log₂[(x - 1)(x - 3)] = 3. Therefore, (x - 1)(x - 3) = 2³ = 8. Expanding gives x² - 4x - 5 = 0. Solving gives x = 5 or -1, but x > 3, hence x = 5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 222),

    question:
      "The roots of the equation x² - 7x + k = 0 are equal. Find the value of k.",

    options: ["49/2", "49/4", "14", "7"],

    answer: 1,

    topic: "Quadratic Equation",

    explanation:
      "For equal roots, discriminant = 0. Therefore, b² - 4ac = 0. So, (-7)² - 4(1)(k) = 0 → 49 - 4k = 0 → k = 49/4.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 223),

    question: "If sin θ = 3/5 where 0° < θ < 90°, find cos θ.",

    options: ["3/4", "4/5", "5/3", "2/5"],

    answer: 1,

    topic: "Trigonometry",

    explanation:
      "Using sin²θ + cos²θ = 1: cos²θ = 1 - (3/5)² = 1 - 9/25 = 16/25. Therefore, cosθ = 4/5.",

    year: 2017,
  }),

  createQuestion({
    id: generateId("mathematics", 224),

    question:
      "Find the sum of the first 20 terms of the arithmetic progression 5, 8, 11, 14, ...",

    options: ["620", "670", "720", "770"],

    answer: 0,

    topic: "Arithmetic Progression",

    explanation:
      "a = 5, d = 3, n = 20. Sum formula: Sₙ = n/2[2a + (n - 1)d]. Therefore, S₂₀ = 20/2[10 + 19(3)] = 10(67) = 670.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 225),

    question:
      "A bag contains 5 red balls, 4 blue balls, and 3 green balls. One ball is selected at random. Find the probability that the ball is neither red nor blue.",

    options: ["1/12", "1/4", "1/3", "3/4"],

    answer: 1,

    topic: "Probability",

    explanation:
      "Total balls = 5 + 4 + 3 = 12. Balls neither red nor blue are green balls = 3. Probability = 3/12 = 1/4.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 226),

    question: "Simplify: (2x² - 8)/(x² - 4).",

    options: ["2", "x + 2", "2(x - 2)", "2(x² - 4)/(x² - 4)"],

    answer: 0,

    topic: "Algebraic Expression",

    explanation:
      "Factorize numerator and denominator: 2(x² - 4)/(x² - 4). Cancelling gives 2.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 227),

    question: "The gradient of a line perpendicular to the line y = 3x + 5 is:",

    options: ["3", "-3", "1/3", "-1/3"],

    answer: 3,

    topic: "Coordinate Geometry",

    explanation:
      "The gradient of y = 3x + 5 is 3. The gradient of a perpendicular line is the negative reciprocal: -1/3.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 228),

    question: "Evaluate (27/8)^(2/3).",

    options: ["9/4", "3/2", "4/9", "8/27"],

    answer: 0,

    topic: "Indices",

    explanation: "(27/8)^(2/3) = [(27/8)^(1/3)]² = (3/2)² = 9/4.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 229),

    question: "Find the value of x if 3^(x+1) = 81.",

    options: ["2", "3", "4", "5"],

    answer: 1,

    topic: "Exponential Equation",

    explanation: "81 = 3⁴. Therefore, x + 1 = 4, so x = 3.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 230),

    question: "The volume of a cylinder of radius 7 cm and height 10 cm is:",

    options: ["220 cm³", "440 cm³", "1540 cm³", "3080 cm³"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Volume = πr²h = 22/7 × 7 × 7 × 10 = 1540 cm³.",

    year: 2022,
  }),
  createQuestion({
    id: generateId("mathematics", 231),

    question: "Solve for x: 2x² - 7x + 3 = 0.",

    options: [
      "x = 3 or x = 1/2",
      "x = -3 or x = -1/2",
      "x = 1 or x = 3/2",
      "x = 7 or x = 3",
    ],

    answer: 0,

    topic: "Quadratic Equation",

    explanation:
      "Factorizing: 2x² - 7x + 3 = (2x - 1)(x - 3) = 0. Therefore, x = 1/2 or x = 3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 232),

    question: "If log₁₀2 = 0.3010, evaluate log₁₀8.",

    options: ["0.6020", "0.9030", "1.2040", "2.4080"],

    answer: 1,

    topic: "Logarithm",

    explanation:
      "Since 8 = 2³, log₁₀8 = log₁₀(2³) = 3log₁₀2 = 3 × 0.3010 = 0.9030.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 233),

    question: "Find the value of θ if tan θ = 1 and 0° ≤ θ ≤ 180°.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "tan45° = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 234),

    question: "Find the next term in the sequence: 2, 6, 12, 20, 30, ...",

    options: ["36", "40", "42", "44"],

    answer: 2,

    topic: "Number Sequence",

    explanation:
      "Differences are 4, 6, 8, 10. Next difference is 12. Therefore, 30 + 12 = 42.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 235),

    question:
      "A chord of a circle subtends an angle of 60° at the center. If the radius is 14 cm, find the length of the chord.",

    options: ["7 cm", "14 cm", "21 cm", "28 cm"],

    answer: 1,

    topic: "Circle Geometry",

    explanation:
      "Chord length = 2r sin(θ/2) = 2 × 14 × sin30° = 28 × 1/2 = 14 cm.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 236),

    question:
      "If x varies inversely as y and x = 6 when y = 4, find x when y = 8.",

    options: ["2", "3", "4", "6"],

    answer: 1,

    topic: "Variation",

    explanation:
      "Since x varies inversely as y, xy = k. Therefore, 6 × 4 = 24. When y = 8, x = 24/8 = 3.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 237),

    question: "Evaluate: (3x - 2)(2x + 5).",

    options: [
      "6x² + 11x - 10",
      "6x² + 15x - 4",
      "6x² + 11x + 10",
      "5x² + 11x - 10",
    ],

    answer: 0,

    topic: "Algebraic Expansion",

    explanation: "(3x - 2)(2x + 5) = 6x² + 15x - 4x - 10 = 6x² + 11x - 10.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 238),

    question: "Find the median of the data set: 4, 7, 9, 12, 15, 18, 20.",

    options: ["9", "12", "15", "18"],

    answer: 1,

    topic: "Statistics",

    explanation:
      "There are 7 numbers. The middle value is the 4th number, which is 12.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 239),

    question:
      "The angle of elevation of the top of a tower from a point 20 m away is 45°. Find the height of the tower.",

    options: ["10 m", "20 m", "30 m", "40 m"],

    answer: 1,

    topic: "Height and Distance",

    explanation: "tan45° = height/20 = 1. Therefore, height = 20 m.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 240),

    question: "Simplify: (x² - 9)/(x + 3).",

    options: ["x - 3", "x + 3", "x² + 3", "x² - 3"],

    answer: 0,

    topic: "Algebraic Expression",

    explanation: "x² - 9 = (x - 3)(x + 3). Cancelling (x + 3) gives x - 3.",

    year: 2021,
  }),
  createQuestion({
    id: generateId("mathematics", 241),

    question: "Solve the inequality: 3x - 5 > 10.",

    options: ["x > 3", "x > 5", "x < 3", "x < 5"],

    answer: 1,

    topic: "Inequality",

    explanation: "3x - 5 > 10 → 3x > 15 → x > 5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 242),

    question: "Find the sum of the interior angles of a decagon.",

    options: ["1260°", "1440°", "1620°", "1800°"],

    answer: 1,

    topic: "Polygon",

    explanation:
      "Sum of interior angles = (n - 2) × 180°. For a decagon, n = 10. Therefore, (10 - 2) × 180° = 1440°.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 243),

    question:
      "If 5 men can complete a job in 12 days, how many days will 8 men take to complete the same job?",

    options: ["6.5 days", "7.5 days", "8 days", "9 days"],

    answer: 1,

    topic: "Variation",

    explanation:
      "Men × Days = constant. Therefore, 5 × 12 = 8 × d. Hence, d = 60/8 = 7.5 days.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 244),

    question:
      "Find the probability of getting a prime number when a fair die is thrown once.",

    options: ["1/6", "1/3", "1/2", "2/3"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Prime numbers on a die are 2, 3, and 5. Therefore, probability = 3/6 = 1/2.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 245),

    question: "Factorize completely: x² - 16.",

    options: [
      "(x - 4)(x + 4)",
      "(x - 8)(x + 2)",
      "(x - 2)(x + 8)",
      "(x - 16)(x + 1)",
    ],

    answer: 0,

    topic: "Factorization",

    explanation:
      "x² - 16 is a difference of two squares: x² - 4² = (x - 4)(x + 4).",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 246),

    question: "Evaluate: 4⁻².",

    options: ["16", "1/16", "-16", "-1/16"],

    answer: 1,

    topic: "Indices",

    explanation: "4⁻² = 1/4² = 1/16.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 247),

    question:
      "Find the equation of a line with gradient 2 passing through the point (1, 3).",

    options: ["y = 2x + 1", "y = 2x - 1", "y = x + 2", "y = 3x - 1"],

    answer: 0,

    topic: "Coordinate Geometry",

    explanation:
      "Using y = mx + c. Substitute m = 2 and point (1,3): 3 = 2(1) + c → c = 1. Therefore, y = 2x + 1.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 248),

    question:
      "A trader bought an item for ₦4,500 and sold it for ₦5,400. Find the percentage profit.",

    options: ["15%", "20%", "25%", "30%"],

    answer: 1,

    topic: "Percentage",

    explanation:
      "Profit = 5400 - 4500 = 900. Percentage profit = (900/4500) × 100 = 20%.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 249),

    question: "Simplify: √98.",

    options: ["7√2", "14√2", "49√2", "2√49"],

    answer: 0,

    topic: "Surds",

    explanation: "√98 = √(49 × 2) = √49 × √2 = 7√2.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 250),

    question: "Find the simple interest on ₦8,000 at 5% per annum for 3 years.",

    options: ["₦1,000", "₦1,200", "₦1,500", "₦2,000"],

    answer: 1,

    topic: "Simple Interest",

    explanation: "Simple Interest = (PRT)/100 = (8000 × 5 × 3)/100 = ₦1,200.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 251),

    question: "If x + 1/x = 5, find the value of x² + 1/x².",

    options: ["21", "23", "25", "27"],

    answer: 1,

    topic: "Algebra",

    explanation:
      "(x + 1/x)² = x² + 1/x² + 2. Therefore, 5² = x² + 1/x² + 2 → 25 = x² + 1/x² + 2. Hence, x² + 1/x² = 23.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 252),

    question: "Solve for x: 2^(x+2) = 32.",

    options: ["2", "3", "4", "5"],

    answer: 1,

    topic: "Exponential Equation",

    explanation: "32 = 2⁵. Therefore, x + 2 = 5, hence x = 3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 253),

    question: "Find the area of a triangle with base 12 cm and height 9 cm.",

    options: ["48 cm²", "54 cm²", "96 cm²", "108 cm²"],

    answer: 1,

    topic: "Mensuration",

    explanation:
      "Area of triangle = 1/2 × base × height = 1/2 × 12 × 9 = 54 cm².",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 254),

    question: "Evaluate: sin²30° + cos²30°.",

    options: ["0", "1/2", "1", "2"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "Using the identity sin²θ + cos²θ = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 255),

    question: "Find the mode of the data set: 3, 5, 7, 5, 8, 5, 9.",

    options: ["3", "5", "7", "9"],

    answer: 1,

    topic: "Statistics",

    explanation:
      "The mode is the number that appears most frequently. 5 appears three times.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 256),

    question: "Simplify: (3x²y)(2xy³).",

    options: ["5x³y⁴", "6x²y³", "6x³y⁴", "6x⁴y³"],

    answer: 2,

    topic: "Algebraic Expression",

    explanation: "(3x²y)(2xy³) = 6x³y⁴.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 257),

    question: "The circumference of a circle is 44 cm. Find its radius.",

    options: ["7 cm", "14 cm", "21 cm", "28 cm"],

    answer: 0,

    topic: "Circle Geometry",

    explanation:
      "Circumference = 2πr. Therefore, 44 = 2 × 22/7 × r. Solving gives r = 7 cm.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 258),

    question:
      "A number increases from 80 to 100. Find the percentage increase.",

    options: ["20%", "25%", "30%", "40%"],

    answer: 1,

    topic: "Percentage",

    explanation:
      "Increase = 100 - 80 = 20. Percentage increase = (20/80) × 100 = 25%.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 259),

    question: "Find the value of x in the equation 5x - 8 = 2x + 13.",

    options: ["5", "6", "7", "8"],

    answer: 2,

    topic: "Linear Equation",

    explanation: "5x - 8 = 2x + 13 → 3x = 21 → x = 7.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 260),

    question: "Find the nth term of the sequence: 4, 7, 10, 13, ...",

    options: ["3n + 1", "3n + 4", "4n - 1", "4n + 3"],

    answer: 0,

    topic: "Sequence and Series",

    explanation:
      "The sequence is an AP with first term 4 and common difference 3. nth term = a + (n - 1)d = 4 + 3(n - 1) = 3n + 1.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 261),

    question: "If 3x - 2 = 13, find the value of x.",

    options: ["3", "4", "5", "6"],

    answer: 2,

    topic: "Linear Equation",

    explanation: "3x - 2 = 13 → 3x = 15 → x = 5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 262),

    question: "Evaluate: (81)^(3/4).",

    options: ["9", "18", "27", "81"],

    answer: 2,

    topic: "Indices",

    explanation: "81 = 3⁴. Therefore, (81)^(3/4) = (3⁴)^(3/4) = 3³ = 27.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 263),

    question: "Find the value of θ if cos θ = 1/2 and 0° ≤ θ ≤ 180°.",

    options: ["30°", "45°", "60°", "90°"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "cos60° = 1/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 264),

    question:
      "The sum of two numbers is 18 and their difference is 4. Find the larger number.",

    options: ["7", "9", "11", "13"],

    answer: 2,

    topic: "Simultaneous Equations",

    explanation:
      "Let the numbers be x and y. x + y = 18 and x - y = 4. Adding both equations gives 2x = 22, hence x = 11.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 265),

    question:
      "Find the simple interest on ₦12,000 at 8% per annum for 2 years.",

    options: ["₦1,440", "₦1,920", "₦2,400", "₦2,880"],

    answer: 1,

    topic: "Simple Interest",

    explanation: "Simple Interest = (PRT)/100 = (12000 × 8 × 2)/100 = ₦1,920.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 266),

    question:
      "Find the probability of selecting a vowel from the word MATHEMATICS.",

    options: ["3/11", "4/11", "5/11", "6/11"],

    answer: 1,

    topic: "Probability",

    explanation:
      "MATHEMATICS has 11 letters. Vowels are A, E, A, I = 4 vowels. Probability = 4/11.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 267),

    question: "Factorize completely: 2x² + 7x + 3.",

    options: [
      "(2x + 1)(x + 3)",
      "(2x - 1)(x - 3)",
      "(x + 1)(2x + 3)",
      "(x - 1)(2x - 3)",
    ],

    answer: 0,

    topic: "Factorization",

    explanation: "2x² + 7x + 3 = (2x + 1)(x + 3).",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 268),

    question: "Find the mean of the numbers: 6, 8, 10, 12, 14.",

    options: ["8", "9", "10", "11"],

    answer: 2,

    topic: "Statistics",

    explanation: "Mean = (6 + 8 + 10 + 12 + 14)/5 = 50/5 = 10.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 269),

    question: "The volume of a cube is 216 cm³. Find the length of one side.",

    options: ["4 cm", "5 cm", "6 cm", "7 cm"],

    answer: 2,

    topic: "Mensuration",

    explanation: "Volume of cube = side³. Therefore, side = ∛216 = 6 cm.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 270),

    question: "Simplify: (2a³b²)/(4ab).",

    options: ["ab", "a²b", "a²b²", "2a²b"],

    answer: 1,

    topic: "Algebraic Fraction",

    explanation: "(2a³b²)/(4ab) = (1/2)a²b.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 271),

    question: "Solve for x: x² - 9 = 0.",

    options: ["x = ±2", "x = ±3", "x = ±6", "x = 9"],

    answer: 1,

    topic: "Quadratic Equation",

    explanation: "x² - 9 = 0 → x² = 9 → x = ±3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 272),

    question: "Evaluate: log₁₀10000.",

    options: ["2", "3", "4", "5"],

    answer: 2,

    topic: "Logarithm",

    explanation: "Since 10⁴ = 10000, log₁₀10000 = 4.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 273),

    question: "Find the value of tan 45°.",

    options: ["0", "1", "√2", "√3"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "tan45° = 1.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 274),

    question:
      "Find the 10th term of the arithmetic progression: 3, 7, 11, 15, ...",

    options: ["35", "39", "43", "47"],

    answer: 1,

    topic: "Arithmetic Progression",

    explanation: "a = 3, d = 4. nth term = a + (n - 1)d = 3 + 9(4) = 39.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 275),

    question:
      "A fair coin is tossed twice. Find the probability of getting two heads.",

    options: ["1/2", "1/3", "1/4", "3/4"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Possible outcomes are HH, HT, TH, TT. Only HH gives two heads. Probability = 1/4.",

    year: 2018,
  }),

  createQuestion({
    id: generateId("mathematics", 276),

    question: "Simplify: (x² + 5x + 6)/(x + 2).",

    options: ["x + 2", "x + 3", "x + 5", "x + 6"],

    answer: 1,

    topic: "Algebraic Fraction",

    explanation:
      "Factorize numerator: (x + 2)(x + 3)/(x + 2). Cancelling gives x + 3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 277),

    question:
      "Find the gradient of the line joining the points (2, 3) and (6, 11).",

    options: ["1", "2", "3", "4"],

    answer: 1,

    topic: "Coordinate Geometry",

    explanation: "Gradient = (11 - 3)/(6 - 2) = 8/4 = 2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 278),

    question: "Evaluate: √144 + √81.",

    options: ["19", "21", "23", "25"],

    answer: 1,

    topic: "Surds",

    explanation: "√144 = 12 and √81 = 9. Therefore, 12 + 9 = 21.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 279),

    question:
      "The area of a circle is 154 cm². Find its radius. (Take π = 22/7)",

    options: ["7 cm", "14 cm", "21 cm", "28 cm"],

    answer: 0,

    topic: "Mensuration",

    explanation:
      "Area = πr². Therefore, 154 = 22/7 × r². Solving gives r² = 49, hence r = 7 cm.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 280),

    question:
      "If y varies directly as x and y = 18 when x = 6, find y when x = 10.",

    options: ["24", "30", "36", "42"],

    answer: 1,

    topic: "Variation",

    explanation:
      "Since y varies directly as x, y = kx. Therefore, 18 = 6k → k = 3. When x = 10, y = 3 × 10 = 30.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 281),

    question: "If x² - 5x + 6 = 0, find the possible values of x.",

    options: ["1 and 6", "2 and 3", "3 and 5", "1 and 5"],

    answer: 1,

    topic: "Quadratic Equation",

    explanation:
      "Factorizing gives (x - 2)(x - 3) = 0. Therefore, x = 2 or x = 3.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 282),

    question: "Evaluate: (16)^(3/2).",

    options: ["32", "48", "64", "128"],

    answer: 2,

    topic: "Indices",

    explanation: "16^(3/2) = (√16)³ = 4³ = 64.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 283),

    question: "Find the value of sin 30°.",

    options: ["0", "1/2", "√2/2", "√3/2"],

    answer: 1,

    topic: "Trigonometry",

    explanation: "sin30° = 1/2.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 284),

    question:
      "The sum of the first n terms of an AP is given by Sₙ = n/2[2a + (n - 1)d]. Find S₁₅ for the AP 2, 5, 8, ...",

    options: ["315", "330", "345", "360"],

    answer: 1,

    topic: "Arithmetic Progression",

    explanation:
      "a = 2, d = 3, n = 15. S₁₅ = 15/2[2(2) + 14(3)] = 15/2(46) = 345.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 285),

    question:
      "A box contains 4 red, 5 blue and 6 green balls. Find the probability of selecting a blue ball.",

    options: ["1/5", "1/3", "5/15", "2/5"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Total balls = 4 + 5 + 6 = 15. Probability of blue = 5/15 = 1/3.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 286),

    question: "Simplify: (x² - 25)/(x - 5).",

    options: ["x - 5", "x + 5", "x² + 5", "x² - 5"],

    answer: 1,

    topic: "Algebraic Fraction",

    explanation: "x² - 25 = (x - 5)(x + 5). Cancelling (x - 5) gives x + 5.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 287),

    question:
      "Find the equation of the line passing through (0, 4) with gradient -3.",

    options: ["y = -3x + 4", "y = 3x + 4", "y = -3x - 4", "y = 4x - 3"],

    answer: 0,

    topic: "Coordinate Geometry",

    explanation: "Using y = mx + c where m = -3 and c = 4 gives y = -3x + 4.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 288),

    question: "Evaluate: 5!.",

    options: ["25", "60", "120", "240"],

    answer: 2,

    topic: "Permutation and Combination",

    explanation: "5! = 5 × 4 × 3 × 2 × 1 = 120.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 289),

    question:
      "The length and breadth of a rectangle are 15 cm and 8 cm respectively. Find the diagonal.",

    options: ["15 cm", "16 cm", "17 cm", "18 cm"],

    answer: 2,

    topic: "Mensuration",

    explanation:
      "Using Pythagoras theorem: diagonal² = 15² + 8² = 225 + 64 = 289. Therefore, diagonal = 17 cm.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 290),

    question: "If y = 3x² - 2x + 5, find y when x = 2.",

    options: ["9", "11", "13", "15"],

    answer: 2,

    topic: "Substitution",

    explanation: "y = 3(2²) - 2(2) + 5 = 12 - 4 + 5 = 13.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 291),

    question: "Solve for x: 4x + 7 = 3x + 15.",

    options: ["6", "7", "8", "9"],

    answer: 2,

    topic: "Linear Equation",

    explanation: "4x + 7 = 3x + 15 → x = 15 - 7 = 8.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 292),

    question: "Evaluate: log₃81.",

    options: ["2", "3", "4", "5"],

    answer: 2,

    topic: "Logarithm",

    explanation: "Since 3⁴ = 81, log₃81 = 4.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 293),

    question: "Find the value of cos 0°.",

    options: ["0", "1/2", "1", "-1"],

    answer: 2,

    topic: "Trigonometry",

    explanation: "cos0° = 1.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("mathematics", 294),

    question: "Find the sum of the first 12 terms of the AP 4, 7, 10, 13, ...",

    options: ["210", "222", "246", "264"],

    answer: 2,

    topic: "Arithmetic Progression",

    explanation:
      "a = 4, d = 3, n = 12. S₁₂ = 12/2[2(4) + 11(3)] = 6(41) = 246.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 295),

    question:
      "A die is thrown once. Find the probability of getting an even number.",

    options: ["1/6", "1/3", "1/2", "2/3"],

    answer: 2,

    topic: "Probability",

    explanation:
      "Even numbers on a die are 2, 4 and 6. Probability = 3/6 = 1/2.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 296),

    question: "Factorize completely: x² + 9x + 20.",

    options: [
      "(x + 4)(x + 5)",
      "(x - 4)(x - 5)",
      "(x + 2)(x + 10)",
      "(x - 2)(x - 10)",
    ],

    answer: 0,

    topic: "Factorization",

    explanation: "x² + 9x + 20 = (x + 4)(x + 5).",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 297),

    question: "Find the mean of 12, 15, 18, 21 and 24.",

    options: ["16", "17", "18", "19"],

    answer: 2,

    topic: "Statistics",

    explanation: "Mean = (12 + 15 + 18 + 21 + 24)/5 = 90/5 = 18.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("mathematics", 298),

    question: "Find the volume of a sphere of radius 3 cm. (Take π = 22/7)",

    options: ["36π cm³", "48π cm³", "72π cm³", "108π cm³"],

    answer: 0,

    topic: "Mensuration",

    explanation: "Volume of sphere = 4/3πr³ = 4/3 × π × 27 = 36π cm³.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("mathematics", 299),

    question: "If 2x : 3y = 4 : 5 and x = 8, find y.",

    options: ["5", "6", "20/3", "15"],

    answer: 2,

    topic: "Ratio",

    explanation:
      "2x/3y = 4/5. Substitute x = 8: 16/3y = 4/5. Cross multiply: 80 = 12y. Therefore, y = 20/3.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("mathematics", 300),

    question: "Simplify: (3a²b³)(2ab²).",

    options: ["5a³b⁵", "6a²b⁵", "6a³b⁵", "6a⁵b³"],

    answer: 2,

    topic: "Algebraic Expression",

    explanation: "(3a²b³)(2ab²) = 6a³b⁵.",

    year: 2020,
  }),
];

/* =========================================================
PHYSICS
========================================================= */

const physics = [
  createQuestion({
    id: generateId("physics", 20),

    question: "The SI unit of force is?",

    options: ["Joule", "Newton", "Watt", "Pascal"],

    answer: 1,

    topic: "Mechanics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 21),

    question: "Study the circuit diagram below.",

    options: [
      "Series Circuit",
      "Parallel Circuit",
      "Open Circuit",
      "Short Circuit",
    ],

    answer: 0,

    image: physicsCircuit,

    topic: "Electricity",

    difficulty: "medium",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 20),

    question: "Speed is defined as?",

    options: [
      "Distance / Time",
      "Time / Distance",
      "Mass × Velocity",
      "Force × Distance",
    ],

    answer: 0,

    topic: "Motion",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 0),
    question:
      "A car accelerates uniformly from rest at 2 m/s². What is its velocity after 5 seconds?",
    options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
    answer: 1,
    topic: "Kinematics",
    explanation: "v = u + at = 0 + (2 × 5) = 10 m/s",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 1),
    question: "What is the SI unit of force?",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    answer: 1,
    topic: "Mechanics",
    explanation: "Force is measured in Newton (N).",
    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 2),
    question: "Which of the following is a scalar quantity?",
    options: ["Velocity", "Force", "Speed", "Acceleration"],
    answer: 2,
    topic: "Vectors",
    explanation: "Speed has magnitude only, so it is scalar.",
    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 3),
    question: "A body of mass 2 kg has a weight of (g = 10 m/s²):",
    options: ["2 N", "10 N", "20 N", "200 N"],
    answer: 2,
    topic: "Weight and Mass",
    explanation: "W = mg = 2 × 10 = 20 N",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 4),
    question: "Which of the following is a vector quantity?",
    options: ["Speed", "Distance", "Mass", "Displacement"],
    answer: 3,
    topic: "Vectors",
    explanation: "Displacement has both magnitude and direction.",
    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 5),
    question: "The unit of work is:",
    options: ["Newton", "Watt", "Joule", "Pascal"],
    answer: 2,
    topic: "Work, Energy and Power",
    explanation: "Work is measured in Joules.",
    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 6),
    question: "If a force of 10 N moves an object 3 m, the work done is:",
    options: ["13 J", "30 J", "20 J", "40 J"],
    answer: 1,
    topic: "Work",
    explanation: "Work = F × d = 10 × 3 = 30 J",
    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 7),
    question: "The acceleration due to gravity on Earth is approximately:",
    options: ["5 m/s²", "8 m/s²", "10 m/s²", "12 m/s²"],
    answer: 2,
    topic: "Gravitation",
    explanation: "Standard value of g ≈ 10 m/s² in exams.",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 8),
    question: "Which instrument is used to measure electric current?",
    options: ["Voltmeter", "Ammeter", "Barometer", "Thermometer"],
    answer: 1,
    topic: "Electricity",
    explanation: "Ammeter measures current.",
    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 9),
    question: "Ohm’s law is expressed as:",
    options: ["V = IR", "P = IV", "F = ma", "E = mc²"],
    answer: 0,
    topic: "Electricity",
    explanation: "Voltage = Current × Resistance",
    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 10),
    question: "The SI unit of power is:",
    options: ["Joule", "Newton", "Watt", "Ampere"],
    answer: 2,
    topic: "Power",
    explanation: "Power is measured in Watts.",
    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 11),
    question: "Which of the following is a renewable energy source?",
    options: ["Coal", "Petroleum", "Solar", "Natural gas"],
    answer: 2,
    topic: "Energy",
    explanation: "Solar energy is renewable.",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 12),
    question: "A body moving in a circle at constant speed is said to have:",
    options: [
      "Uniform velocity",
      "Uniform acceleration",
      "Centripetal acceleration",
      "No acceleration",
    ],
    answer: 2,
    topic: "Circular Motion",
    explanation:
      "Direction changes continuously, causing centripetal acceleration.",
    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 13),
    question: "Which of the following waves requires a medium to travel?",
    options: ["Light waves", "Radio waves", "Sound waves", "X-rays"],
    answer: 2,
    topic: "Waves",
    explanation: "Sound waves are mechanical waves.",
    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 14),
    question: "The frequency of a wave is measured in:",
    options: ["Metre", "Second", "Hertz", "Newton"],
    answer: 2,
    topic: "Waves",
    explanation: "Frequency is measured in Hertz (Hz).",
    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 15),
    question: "A lens that diverges light rays is called:",
    options: ["Convex lens", "Concave lens", "Plane lens", "Cylindrical lens"],
    answer: 1,
    topic: "Optics",
    explanation: "Concave lens diverges light rays.",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 16),
    question: "The process of changing liquid to gas is called:",
    options: ["Condensation", "Evaporation", "Freezing", "Melting"],
    answer: 1,
    topic: "States of Matter",
    explanation: "Evaporation is liquid → gas.",
    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 17),
    question: "Which of the following is a conductor of electricity?",
    options: ["Rubber", "Plastic", "Copper", "Wood"],
    answer: 2,
    topic: "Electricity",
    explanation: "Copper is a good conductor.",
    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 18),
    question: "The resistance of a wire depends on its:",
    options: [
      "Colour only",
      "Length and area",
      "Mass only",
      "Temperature only",
    ],
    answer: 1,
    topic: "Electricity",
    explanation: "R ∝ L and inversely ∝ area.",
    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 19),
    question:
      "Which law states that pressure increases with depth in a liquid?",
    options: [
      "Newton’s law",
      "Pascal’s principle",
      "Archimedes’ principle",
      "Boyle’s law",
    ],
    answer: 1,
    topic: "Pressure",
    explanation: "Pascal’s principle explains fluid pressure.",
    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 61),

    question: "The SI unit of pressure is?",

    options: ["Newton", "Pascal", "Joule", "Watt"],

    answer: 1,

    topic: "Pressure",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 62),

    question: "Velocity is a vector quantity because it has?",

    options: [
      "Mass only",
      "Magnitude only",
      "Direction only",
      "Magnitude and direction",
    ],

    answer: 3,

    topic: "Motion",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 63),

    question:
      "The tendency of a body to resist change in its state of rest or motion is called?",

    options: ["Momentum", "Inertia", "Acceleration", "Impulse"],

    answer: 1,

    topic: "Mechanics",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 64),

    question: "Which of the following is a scalar quantity?",

    options: ["Velocity", "Force", "Displacement", "Energy"],

    answer: 3,

    topic: "Vectors and Scalars",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 65),

    question: "The acceleration due to gravity on Earth is approximately?",

    options: ["9.8 m/s²", "98 m/s²", "0.98 m/s²", "1.8 m/s²"],

    answer: 0,

    topic: "Gravity",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 66),

    question: "Work is done when a force causes?",

    options: ["Acceleration", "Displacement", "Mass", "Pressure"],

    answer: 1,

    topic: "Work and Energy",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 67),

    question: "The unit of electrical resistance is?",

    options: ["Volt", "Ampere", "Ohm", "Watt"],

    answer: 2,

    topic: "Electricity",

    year: 2018,
  }),

  createQuestion({
    id: generateId("physics", 68),

    question: "A body moving with uniform velocity has?",

    options: [
      "Constant acceleration",
      "Zero acceleration",
      "Increasing speed",
      "Decreasing speed",
    ],

    answer: 1,

    topic: "Motion",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 69),

    question: "Heat transfer through liquids and gases mainly occurs by?",

    options: ["Radiation", "Conduction", "Convection", "Reflection"],

    answer: 2,

    topic: "Thermal Physics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 70),

    question: "The image formed by a plane mirror is?",

    options: [
      "Real and inverted",
      "Virtual and upright",
      "Real and upright",
      "Virtual and inverted",
    ],

    answer: 1,

    topic: "Optics",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 71),

    question: "The frequency of a wave is measured in?",

    options: ["Metres", "Seconds", "Hertz", "Joules"],

    answer: 2,

    topic: "Waves",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 72),

    question: "A fuse wire is connected in a circuit to?",

    options: [
      "Increase current",
      "Store energy",
      "Protect appliances",
      "Reduce voltage",
    ],

    answer: 2,

    topic: "Electricity",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 73),

    question:
      "The boiling point of pure water at standard atmospheric pressure is?",

    options: ["0°C", "50°C", "100°C", "212°C"],

    answer: 2,

    topic: "Thermal Physics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 74),

    question: "The instrument used to measure atmospheric pressure is?",

    options: ["Thermometer", "Hydrometer", "Barometer", "Manometer"],

    answer: 2,

    topic: "Pressure",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 75),

    question: "Which colour of light has the longest wavelength?",

    options: ["Blue", "Green", "Red", "Violet"],

    answer: 2,

    topic: "Optics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 76),

    question: "The rate of doing work is known as?",

    options: ["Energy", "Power", "Momentum", "Impulse"],

    answer: 1,

    topic: "Work and Energy",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 77),

    question:
      "Which of the following materials is a good conductor of electricity?",

    options: ["Rubber", "Plastic", "Copper", "Wood"],

    answer: 2,

    topic: "Electricity",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 78),

    question: "The force that opposes motion between two surfaces is?",

    options: ["Tension", "Gravity", "Friction", "Upthrust"],

    answer: 2,

    topic: "Mechanics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 79),

    question: "Sound cannot travel through?",

    options: ["Water", "Air", "Steel", "Vacuum"],

    answer: 3,

    topic: "Sound",

    year: 2022,
  }),
  createQuestion({
    id: generateId("physics", 21),

    question: "Current is measured using?",

    options: ["Voltmeter", "Ammeter", "Hydrometer", "Galvanometer"],

    answer: 1,

    topic: "Electricity",

    year: 2018,
  }),

  createQuestion({
    id: generateId("physics", 22),

    question: "The energy possessed by a body due to its motion is?",

    options: [
      "Potential energy",
      "Chemical energy",
      "Kinetic energy",
      "Electrical energy",
    ],

    answer: 2,

    topic: "Work and Energy",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 23),

    question: "An object immersed in fluid experiences an upward force called?",

    options: ["Friction", "Weight", "Upthrust", "Tension"],

    answer: 2,

    topic: "Fluids",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 24),

    question: "The pitch of a sound depends on its?",

    options: ["Amplitude", "Frequency", "Velocity", "Intensity"],

    answer: 1,

    topic: "Sound",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 25),

    question: "A transformer works with?",

    options: [
      "Direct current",
      "Alternating current",
      "Static current",
      "Stored current",
    ],

    answer: 1,

    topic: "Electromagnetism",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 26),

    question: "The unit of electric power is?",

    options: ["Watt", "Volt", "Ohm", "Coulomb"],

    answer: 0,

    topic: "Electricity",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 27),

    question: "Radioactivity was discovered by?",

    options: [
      "Isaac Newton",
      "Marie Curie",
      "Henri Becquerel",
      "Albert Einstein",
    ],

    answer: 2,

    topic: "Atomic Physics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 28),

    question:
      "The bending of light as it passes from one medium to another is?",

    options: ["Reflection", "Diffraction", "Refraction", "Dispersion"],

    answer: 2,

    topic: "Optics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 29),

    question:
      "Which law states that pressure applied to a liquid is transmitted equally in all directions?",

    options: ["Newton's law", "Pascal's principle", "Ohm's law", "Hooke's law"],

    answer: 1,

    topic: "Pressure",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 30),

    question:
      "The relationship between voltage, current and resistance is given by?",

    options: ["Newton's law", "Ohm's law", "Boyle's law", "Charles' law"],

    answer: 1,

    topic: "Electricity",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 31),

    question: "A concave mirror can produce?",

    options: [
      "Only virtual images",
      "Only real images",
      "Both real and virtual images",
      "No image",
    ],

    answer: 2,

    topic: "Optics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 32),

    question: "The time taken for one complete oscillation is called?",

    options: ["Frequency", "Amplitude", "Period", "Velocity"],

    answer: 2,

    topic: "Waves",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 33),

    question: "The unit of momentum is?",

    options: ["kg m/s", "N/m", "J/s", "kg/m³"],

    answer: 0,

    topic: "Mechanics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 34),

    question: "The instrument used to measure potential difference is?",

    options: ["Ammeter", "Thermometer", "Voltmeter", "Hydrometer"],

    answer: 2,

    topic: "Electricity",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 35),

    question: "A body floating in water displaces?",

    options: ["Equal mass of water", "Less water", "More water", "No water"],

    answer: 0,

    topic: "Fluids",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 36),

    question:
      "The device used for converting mechanical energy to electrical energy is?",

    options: ["Motor", "Generator", "Transformer", "Rectifier"],

    answer: 1,

    topic: "Electromagnetism",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 37),

    question: "Which particle carries a negative charge?",

    options: ["Proton", "Electron", "Neutron", "Photon"],

    answer: 1,

    topic: "Atomic Physics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 38),

    question: "Echoes are produced due to?",

    options: ["Refraction", "Reflection", "Diffraction", "Dispersion"],

    answer: 1,

    topic: "Sound",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 39),

    question: "The density of a substance is defined as?",

    options: [
      "Mass × Volume",
      "Mass / Volume",
      "Volume / Mass",
      "Weight / Area",
    ],

    answer: 1,

    topic: "Properties of Matter",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 40),

    question: "The unit of frequency is?",

    options: ["Hertz", "Pascal", "Joule", "Newton"],

    answer: 0,

    topic: "Waves",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 41),

    question: "An increase in temperature generally causes solids to?",

    options: ["Contract", "Expand", "Melt instantly", "Disappear"],

    answer: 1,

    topic: "Thermal Expansion",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 42),

    question: "Which law explains the operation of hydraulic machines?",

    options: ["Pascal's principle", "Boyle's law", "Ohm's law", "Charles' law"],

    answer: 0,

    topic: "Pressure",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 43),

    question: "The process by which heat travels through solids is?",

    options: ["Convection", "Conduction", "Radiation", "Reflection"],

    answer: 1,

    topic: "Thermal Physics",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 44),

    question: "A magnet attracts materials such as?",

    options: ["Wood", "Plastic", "Iron", "Glass"],

    answer: 2,

    topic: "Magnetism",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 45),

    question: "The path followed by a projectile is called?",

    options: ["Circle", "Ellipse", "Parabola", "Straight line"],

    answer: 2,

    topic: "Projectile Motion",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 46),

    question: "The quantity of matter in a body is known as?",

    options: ["Weight", "Mass", "Density", "Volume"],

    answer: 1,

    topic: "Mechanics",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 47),

    question:
      "Which electromagnetic wave is used in television remote controls?",

    options: ["Gamma rays", "Infrared rays", "X-rays", "Ultraviolet rays"],

    answer: 1,

    topic: "Electromagnetic Waves",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 48),

    question: "The force that keeps planets in orbit around the sun is?",

    options: [
      "Magnetic force",
      "Electrostatic force",
      "Gravitational force",
      "Frictional force",
    ],

    answer: 2,

    topic: "Gravity",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 49),

    question: "The image formed by a convex mirror is always?",

    options: [
      "Real and enlarged",
      "Virtual and diminished",
      "Real and inverted",
      "Virtual and magnified",
    ],

    answer: 1,

    topic: "Optics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 50),

    question: "The energy stored in a stretched spring is?",

    options: [
      "Chemical energy",
      "Elastic potential energy",
      "Nuclear energy",
      "Electrical energy",
    ],

    answer: 1,

    topic: "Energy",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 51),

    question: "Which of the following is used to detect electric current?",

    options: ["Hydrometer", "Galvanometer", "Barometer", "Thermometer"],

    answer: 1,

    topic: "Electricity",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 52),

    question: "The unit of capacitance is?",

    options: ["Farad", "Henry", "Tesla", "Weber"],

    answer: 0,

    topic: "Electronics",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 53),

    question:
      "The angle between the incident ray and reflected ray is 90°. The angle of incidence is?",

    options: ["30°", "45°", "60°", "90°"],

    answer: 1,

    topic: "Reflection of Light",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 54),

    question: "The process of converting a liquid to gas is called?",

    options: ["Condensation", "Freezing", "Evaporation", "Melting"],

    answer: 2,

    topic: "Thermal Physics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 55),

    question: "The nucleus of an atom contains?",

    options: [
      "Electrons only",
      "Protons only",
      "Protons and neutrons",
      "Neutrons and electrons",
    ],

    answer: 2,

    topic: "Atomic Structure",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 56),

    question: "The loudness of sound depends on its?",

    options: ["Frequency", "Amplitude", "Velocity", "Wavelength"],

    answer: 1,

    topic: "Sound",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 57),

    question: "A body is said to be in equilibrium when?",

    options: [
      "It is moving fast",
      "The resultant force is zero",
      "Its acceleration increases",
      "Its velocity changes",
    ],

    answer: 1,

    topic: "Equilibrium",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 58),

    question: "The speed of light in vacuum is approximately?",

    options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁴ m/s", "3 × 10² m/s"],

    answer: 0,

    topic: "Light",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 59),

    question: "The splitting of heavy atomic nuclei is known as?",

    options: ["Fusion", "Fission", "Ionization", "Radiation"],

    answer: 1,

    topic: "Nuclear Physics",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 60),

    question: "Study the circuit diagram below.",

    options: [
      "Parallel Circuit",
      "Series Circuit",
      "Open Circuit",
      "Short Circuit",
    ],

    answer: 1,

    image: physicsSeriesCircuit,

    topic: "Electric Circuits",

    difficulty: "medium",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 80),

    question: "The turning effect of a force about a pivot is called?",

    options: ["Momentum", "Torque", "Pressure", "Impulse"],

    answer: 1,

    topic: "Rotational Motion",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 81),

    question:
      "The device used to convert sound energy into electrical energy is?",

    options: ["Loudspeaker", "Microphone", "Generator", "Transformer"],

    answer: 1,

    topic: "Sound",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 82),

    question: "The slope of a velocity-time graph represents?",

    options: ["Distance", "Displacement", "Acceleration", "Momentum"],

    answer: 2,

    topic: "Motion",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 83),

    question:
      "The force responsible for keeping an object moving in a circular path is?",

    options: [
      "Gravitational force",
      "Magnetic force",
      "Centripetal force",
      "Electrostatic force",
    ],

    answer: 2,

    topic: "Circular Motion",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 84),

    question:
      "A ray passing through the optical center of a thin lens emerges?",

    options: ["Refracted", "Reflected", "Undeviated", "Diffused"],

    answer: 2,

    topic: "Lenses",

    year: 2019,
  }),

  createQuestion({
    id: generateId("physics", 85),

    question: "The unit of electric charge is?",

    options: ["Ampere", "Volt", "Coulomb", "Farad"],

    answer: 2,

    topic: "Electricity",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 86),

    question: "The process by which unstable nuclei emit radiation is called?",

    options: ["Fusion", "Fission", "Radioactivity", "Diffraction"],

    answer: 2,

    topic: "Atomic Physics",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 87),

    question:
      "The image formed by a convex lens when the object is beyond 2F is?",

    options: [
      "Virtual and enlarged",
      "Real and diminished",
      "Virtual and upright",
      "Real and same size",
    ],

    answer: 1,

    topic: "Lenses",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 88),

    question: "A body weighs less in water because of?",

    options: ["Friction", "Upthrust", "Density", "Pressure"],

    answer: 1,

    topic: "Fluids",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 89),

    question:
      "The relationship between pressure and volume of a gas at constant temperature is given by?",

    options: ["Charles' law", "Newton's law", "Boyle's law", "Hooke's law"],

    answer: 2,

    topic: "Gas Laws",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 90),

    question: "The instrument used to measure humidity is?",

    options: ["Hydrometer", "Barometer", "Hygrometer", "Thermometer"],

    answer: 2,

    topic: "Humidity",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 91),

    question: "The energy possessed by water stored in a dam is?",

    options: [
      "Kinetic energy",
      "Potential energy",
      "Electrical energy",
      "Thermal energy",
    ],

    answer: 1,

    topic: "Energy",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 92),

    question: "Which of the following waves can travel through vacuum?",

    options: [
      "Sound waves",
      "Water waves",
      "Electromagnetic waves",
      "Seismic waves",
    ],

    answer: 2,

    topic: "Waves",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 93),

    question: "The minimum distance of distinct vision for a normal eye is?",

    options: ["25 cm", "2.5 cm", "50 cm", "100 cm"],

    answer: 0,

    topic: "Optics",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 94),

    question: "The force between unlike magnetic poles is?",

    options: ["Repulsion", "Attraction", "Neutral", "Friction"],

    answer: 1,

    topic: "Magnetism",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 95),

    question:
      "An object moving at constant speed in a circular path experiences?",

    options: [
      "No acceleration",
      "Constant acceleration",
      "Variable acceleration",
      "Zero force",
    ],

    answer: 2,

    topic: "Circular Motion",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 96),

    question:
      "The amount of heat required to raise the temperature of a substance by 1°C is its?",

    options: [
      "Latent heat",
      "Specific heat capacity",
      "Thermal conductivity",
      "Heat index",
    ],

    answer: 1,

    topic: "Thermal Physics",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 97),

    question: "The instrument used to measure electric resistance directly is?",

    options: ["Voltmeter", "Ammeter", "Ohmmeter", "Galvanometer"],

    answer: 2,

    topic: "Electricity",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 98),

    question: "A concave lens always forms an image that is?",

    options: [
      "Real and magnified",
      "Virtual and diminished",
      "Real and inverted",
      "Virtual and enlarged",
    ],

    answer: 1,

    topic: "Lenses",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 99),

    question: "The rate of flow of electric charge is known as?",

    options: ["Voltage", "Resistance", "Current", "Power"],

    answer: 2,

    topic: "Electricity",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 100),

    question: "Study the electromagnetic setup shown below.",

    options: ["Electric bell", "Transformer", "Electric motor", "Generator"],

    answer: 2,

    image: physicsMotorDiagram,

    topic: "Electromagnetism",

    difficulty: "medium",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 101),

    question: "The unit of magnetic flux density is?",

    options: ["Tesla", "Weber", "Henry", "Farad"],

    answer: 0,

    topic: "Magnetism",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 102),

    question:
      "Which of the following quantities is conserved in all collisions?",

    options: ["Kinetic energy", "Velocity", "Momentum", "Acceleration"],

    answer: 2,

    topic: "Collisions",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 103),

    question: "The phenomenon responsible for the formation of shadows is?",

    options: [
      "Reflection",
      "Refraction",
      "Rectilinear propagation",
      "Diffraction",
    ],

    answer: 2,

    topic: "Light",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 104),

    question: "The SI unit of capacitance is?",

    options: ["Tesla", "Farad", "Coulomb", "Weber"],

    answer: 1,

    topic: "Electronics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 105),

    question: "Which of the following is an example of renewable energy?",

    options: ["Coal", "Petroleum", "Solar energy", "Natural gas"],

    answer: 2,

    topic: "Energy",

    year: 2023,
  }),

  createQuestion({
    id: generateId("physics", 106),

    question:
      "The change in frequency of a wave due to motion between source and observer is called?",

    options: [
      "Photoelectric effect",
      "Doppler effect",
      "Diffraction",
      "Interference",
    ],

    answer: 1,

    topic: "Waves",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 107),

    question: "The property of a liquid responsible for capillary action is?",

    options: ["Viscosity", "Surface tension", "Density", "Pressure"],

    answer: 1,

    topic: "Properties of Matter",

    year: 2020,
  }),

  createQuestion({
    id: generateId("physics", 108),

    question: "The instrument used to measure very high temperatures is?",

    options: ["Clinical thermometer", "Pyrometer", "Barometer", "Hydrometer"],

    answer: 1,

    topic: "Thermal Physics",

    year: 2021,
  }),

  createQuestion({
    id: generateId("physics", 109),

    question: "The process of charging a body without contact is called?",

    options: ["Conduction", "Induction", "Radiation", "Convection"],

    answer: 1,

    topic: "Electrostatics",

    year: 2022,
  }),

  createQuestion({
    id: generateId("physics", 110),

    question: "Study the ray diagram below.",

    options: ["Convex Lens", "Concave Lens", "Plane Mirror", "Prism"],

    answer: 0,

    image: physicsLensDiagram,

    topic: "Optics",

    difficulty: "medium",

    year: 2023,
  }),
];

/* =========================================================
CHEMISTRY
========================================================= */

const chemistry = [
  createQuestion({
    id: generateId("chemistry", 1),

    question:
      "The smallest particle of an element that can take part in a chemical reaction is called?",

    options: ["Atom", "Molecule", "Ion", "Electron"],

    answer: 0,

    topic: "Atomic Structure",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 2),

    question: "The pH value of a neutral substance is?",

    options: ["0", "7", "14", "10"],

    answer: 1,

    topic: "Acids and Bases",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 3),

    question: "Which of the following is a chemical change?",

    options: [
      "Melting of ice",
      "Boiling of water",
      "Rusting of iron",
      "Breaking of glass",
    ],

    answer: 2,

    topic: "Chemical Changes",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 4),

    question: "The atomic number of an element represents the number of?",

    options: ["Neutrons", "Electrons and neutrons", "Protons", "Nucleons"],

    answer: 2,

    topic: "Atomic Structure",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 5),

    question: "A catalyst increases the rate of a reaction by?",

    options: [
      "Increasing temperature",
      "Providing activation energy",
      "Lowering activation energy",
      "Reducing concentration",
    ],

    answer: 2,

    topic: "Reaction Rates",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 6),

    question: "Which gas is commonly known as laughing gas?",

    options: ["Nitrogen", "Nitrous oxide", "Carbon dioxide", "Sulphur dioxide"],

    answer: 1,

    topic: "Gases",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 7),

    question: "The process of separating crude oil into fractions is known as?",

    options: [
      "Evaporation",
      "Filtration",
      "Fractional distillation",
      "Chromatography",
    ],

    answer: 2,

    topic: "Petroleum Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 8),

    question: "Which of the following is an alkali?",

    options: ["HCl", "NaOH", "H₂SO₄", "CO₂"],

    answer: 1,

    topic: "Acids and Bases",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 9),

    question: "The process by which a solid changes directly to gas is called?",

    options: ["Condensation", "Evaporation", "Sublimation", "Melting"],

    answer: 2,

    topic: "States of Matter",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 10),

    question: "Which of the following is a noble gas?",

    options: ["Nitrogen", "Helium", "Oxygen", "Hydrogen"],

    answer: 1,

    topic: "Periodic Table",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 11),

    question: "The formula for methane is?",

    options: ["C₂H₆", "CH₄", "C₂H₄", "CH₃OH"],

    answer: 1,

    topic: "Organic Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 12),

    question: "Which of the following substances will turn blue litmus red?",

    options: ["Soap solution", "Lime water", "Acid", "Salt solution"],

    answer: 2,

    topic: "Acids and Bases",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 13),

    question: "The chemical symbol for sodium is?",

    options: ["So", "Sd", "Na", "S"],

    answer: 2,

    topic: "Chemical Symbols",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 14),

    question: "Which method is suitable for separating sand from water?",

    options: ["Distillation", "Filtration", "Sublimation", "Crystallization"],

    answer: 1,

    topic: "Separation Techniques",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 15),

    question: "The valency of oxygen is?",

    options: ["1", "2", "3", "4"],

    answer: 1,

    topic: "Chemical Bonding",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 16),

    question:
      "A substance that contains two or more elements chemically combined is called?",

    options: ["Mixture", "Compound", "Solution", "Alloy"],

    answer: 1,

    topic: "Elements and Compounds",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 17),

    question: "The gas evolved during photosynthesis is?",

    options: ["Nitrogen", "Hydrogen", "Oxygen", "Carbon dioxide"],

    answer: 2,

    topic: "Air and Atmosphere",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 18),

    question:
      "The brown gas produced when copper reacts with concentrated nitric acid is?",

    options: ["NO", "NO₂", "CO₂", "SO₂"],

    answer: 1,

    topic: "Nitrogen Compounds",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 19),

    question: "The process of adding oxygen to a substance is known as?",

    options: ["Reduction", "Oxidation", "Neutralization", "Hydrolysis"],

    answer: 1,

    topic: "Redox Reactions",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 20),

    question: "Study the laboratory apparatus below.",

    options: ["Burette", "Pipette", "Conical Flask", "Measuring Cylinder"],

    answer: 0,

    image: chemistryBurette,

    topic: "Laboratory Apparatus",

    difficulty: "medium",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 21),

    question: "The common name for calcium oxide is?",

    options: ["Slaked lime", "Quick lime", "Limestone", "Gypsum"],

    answer: 1,

    topic: "Industrial Chemistry",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 22),

    question: "Which of the following metals reacts vigorously with water?",

    options: ["Copper", "Iron", "Sodium", "Silver"],

    answer: 2,

    topic: "Metals",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 23),

    question: "The empirical formula of benzene is?",

    options: ["CH", "CH₂", "C₂H₂", "C₆H₆"],

    answer: 0,

    topic: "Organic Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 24),

    question: "Which of the following is used in the vulcanization of rubber?",

    options: ["Oxygen", "Sulphur", "Nitrogen", "Chlorine"],

    answer: 1,

    topic: "Polymers",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 25),

    question: "The colour of methyl orange in acidic medium is?",

    options: ["Yellow", "Blue", "Red", "Green"],

    answer: 2,

    topic: "Indicators",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 26),

    question: "The main constituent of natural gas is?",

    options: ["Ethane", "Methane", "Propane", "Butane"],

    answer: 1,

    topic: "Hydrocarbons",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 27),

    question:
      "An isotope differs from another isotope of the same element by the number of?",

    options: ["Protons", "Electrons", "Neutrons", "Valence electrons"],

    answer: 2,

    topic: "Atomic Structure",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 28),

    question: "Which of the following is an example of a covalent compound?",

    options: ["NaCl", "MgO", "H₂O", "KCl"],

    answer: 2,

    topic: "Chemical Bonding",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 29),

    question: "The process of removing impurities from metals is called?",

    options: ["Smelting", "Refining", "Roasting", "Calcination"],

    answer: 1,

    topic: "Metallurgy",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 30),

    question: "The gas responsible for acid rain is mainly?",

    options: ["Oxygen", "Sulphur dioxide", "Nitrogen", "Hydrogen"],

    answer: 1,

    topic: "Environmental Chemistry",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 31),

    question: "Which of the following is an unsaturated hydrocarbon?",

    options: ["Methane", "Ethane", "Ethene", "Propane"],

    answer: 2,

    topic: "Hydrocarbons",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 32),

    question:
      "The number of electrons an atom can donate, accept or share is called?",

    options: ["Atomic number", "Mass number", "Valency", "Isotopy"],

    answer: 2,

    topic: "Chemical Bonding",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 33),

    question: "Which of the following substances is used for bleaching?",

    options: ["NaCl", "Cl₂", "CO₂", "NH₃"],

    answer: 1,

    topic: "Chlorine and its Compounds",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 34),

    question:
      "The process of heating limestone strongly to produce quicklime is called?",

    options: ["Roasting", "Calcination", "Distillation", "Neutralization"],

    answer: 1,

    topic: "Industrial Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 35),

    question: "Which of the following is a reducing agent?",

    options: ["Oxygen", "Hydrogen", "Chlorine", "Nitric acid"],

    answer: 1,

    topic: "Redox Reactions",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 36),

    question:
      "The gas produced when zinc reacts with dilute hydrochloric acid is?",

    options: ["Oxygen", "Hydrogen", "Nitrogen", "Carbon dioxide"],

    answer: 1,

    topic: "Laboratory Preparation of Gases",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 37),

    question:
      "The process by which large molecules are broken into smaller molecules using heat is called?",

    options: ["Cracking", "Polymerization", "Distillation", "Hydrogenation"],

    answer: 0,

    topic: "Petroleum Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 38),

    question: "The IUPAC name of CH₃COOH is?",

    options: [
      "Methanoic acid",
      "Ethanoic acid",
      "Propanoic acid",
      "Butanoic acid",
    ],

    answer: 1,

    topic: "Organic Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 39),

    question: "Which of the following is used to test for starch?",

    options: [
      "Benedict's solution",
      "Iodine solution",
      "Litmus solution",
      "Lime water",
    ],

    answer: 1,

    topic: "Food Chemistry",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 40),

    question: "The process of converting a gas directly into solid is called?",

    options: ["Condensation", "Deposition", "Evaporation", "Sublimation"],

    answer: 1,

    topic: "States of Matter",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 41),

    question: "Which of the following compounds is ionic?",

    options: ["H₂O", "CO₂", "NaCl", "NH₃"],

    answer: 2,

    topic: "Chemical Bonding",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 42),

    question: "The gas used in the manufacture of ammonia is?",

    options: ["Nitrogen", "Oxygen", "Chlorine", "Sulphur dioxide"],

    answer: 0,

    topic: "Nitrogen Compounds",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 43),

    question: "The percentage of oxygen in the atmosphere is approximately?",

    options: ["78%", "21%", "10%", "50%"],

    answer: 1,

    topic: "Air and Atmosphere",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 44),

    question: "Which of the following metals is extracted by electrolysis?",

    options: ["Iron", "Copper", "Aluminium", "Lead"],

    answer: 2,

    topic: "Metallurgy",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 45),

    question:
      "The process of adding hydrogen to an unsaturated compound is called?",

    options: ["Hydrogenation", "Polymerization", "Cracking", "Oxidation"],

    answer: 0,

    topic: "Organic Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 46),

    question: "Which of the following is a greenhouse gas?",

    options: ["Hydrogen", "Carbon dioxide", "Nitrogen", "Helium"],

    answer: 1,

    topic: "Environmental Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 47),

    question: "The process used to soften hard water is known as?",

    options: [
      "Distillation",
      "Neutralization",
      "Water treatment",
      "Ion exchange",
    ],

    answer: 3,

    topic: "Water",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 48),

    question: "The colour of hydrated copper(II) sulphate crystals is?",

    options: ["Green", "Blue", "White", "Yellow"],

    answer: 1,

    topic: "Salts",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 49),

    question: "The element with atomic number 6 is?",

    options: ["Nitrogen", "Carbon", "Oxygen", "Sulphur"],

    answer: 1,

    topic: "Periodic Table",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 50),

    question: "Study the apparatus below used in titration.",

    options: ["Burette", "Retort stand", "Pipette filler", "Conical flask"],

    answer: 2,

    image: chemistryTitrationSetup,

    topic: "Volumetric Analysis",

    difficulty: "medium",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 51),

    question: "Which of the following is an example of an ester?",

    options: ["CH₃COOH", "C₂H₅OH", "CH₃COOC₂H₅", "CH₄"],

    answer: 2,

    topic: "Organic Chemistry",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 52),

    question: "The drying agent commonly used in the laboratory is?",

    options: ["NaOH", "Concentrated H₂SO₄", "NaCl", "HNO₃"],

    answer: 1,

    topic: "Laboratory Chemicals",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 53),

    question: "The ore of iron commonly used in blast furnaces is?",

    options: ["Bauxite", "Haematite", "Cassiterite", "Galena"],

    answer: 1,

    topic: "Metallurgy",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 54),

    question: "Which of the following is used in making glass?",

    options: ["Sulphur", "Silica", "Graphite", "Gypsum"],

    answer: 1,

    topic: "Industrial Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 55),

    question: "The process by which plants manufacture food is?",

    options: ["Respiration", "Fermentation", "Photosynthesis", "Transpiration"],

    answer: 2,

    topic: "Applied Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 56),

    question: "Which of the following is amphoteric?",

    options: ["NaOH", "ZnO", "HCl", "CO₂"],

    answer: 1,

    topic: "Oxides",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 57),

    question: "The molecular formula of glucose is?",

    options: ["C₆H₁₂O₆", "C₂H₅OH", "CH₄", "C₆H₆"],

    answer: 0,

    topic: "Biochemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 58),

    question:
      "Which of the following is used as fuel in oxy-acetylene welding?",

    options: ["Methane", "Ethene", "Acetylene", "Propane"],

    answer: 2,

    topic: "Hydrocarbons",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 59),

    question: "The process of converting starch to alcohol involves?",

    options: [
      "Neutralization",
      "Fermentation",
      "Hydrogenation",
      "Distillation",
    ],

    answer: 1,

    topic: "Industrial Chemistry",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 60),

    question: "Study the periodic table section below.",

    options: ["Halogens", "Noble gases", "Alkali metals", "Transition metals"],

    answer: 0,

    image: chemistryPeriodicTable,

    topic: "Periodic Table",

    difficulty: "medium",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 61),

    question:
      "The main gas responsible for the depletion of the ozone layer is?",

    options: ["Carbon dioxide", "Chlorofluorocarbons", "Nitrogen", "Methane"],

    answer: 1,

    topic: "Environmental Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 62),

    question: "Which of the following is a property of acids?",

    options: [
      "They turn red litmus blue",
      "They have a bitter taste",
      "They turn blue litmus red",
      "They feel slippery",
    ],

    answer: 2,

    topic: "Acids and Bases",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 63),

    question: "The substance added to rubber to improve its strength is?",

    options: ["Sulphur", "Carbon", "Silicon", "Hydrogen"],

    answer: 0,

    topic: "Polymers",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 64),

    question: "Which of the following substances is an electrolyte?",

    options: [
      "Sugar solution",
      "Distilled water",
      "Sodium chloride solution",
      "Kerosene",
    ],

    answer: 2,

    topic: "Electrolysis",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 65),

    question: "The colour of bromine vapour is?",

    options: ["Blue", "Brown", "Green", "Yellow"],

    answer: 1,

    topic: "Halogens",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 66),

    question: "The process of coating iron with zinc is known as?",

    options: ["Electroplating", "Galvanization", "Smelting", "Refining"],

    answer: 1,

    topic: "Corrosion",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 67),

    question:
      "Which of the following is used in the manufacture of fertilizers?",

    options: ["Ammonia", "Methane", "Oxygen", "Helium"],

    answer: 0,

    topic: "Industrial Chemistry",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 68),

    question:
      "The movement of particles from a region of higher concentration to lower concentration is called?",

    options: ["Osmosis", "Diffusion", "Evaporation", "Condensation"],

    answer: 1,

    topic: "States of Matter",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 69),

    question: "The colour change of phenolphthalein in alkaline medium is?",

    options: ["Red", "Blue", "Pink", "Yellow"],

    answer: 2,

    topic: "Indicators",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 70),

    question: "Which of the following is a strong acid?",

    options: [
      "Ethanoic acid",
      "Citric acid",
      "Hydrochloric acid",
      "Carbonic acid",
    ],

    answer: 2,

    topic: "Acids and Bases",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 71),

    question:
      "The process by which a liquid changes to vapour below its boiling point is?",

    options: ["Condensation", "Evaporation", "Sublimation", "Melting"],

    answer: 1,

    topic: "States of Matter",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 72),

    question:
      "The gas evolved when calcium carbonate reacts with dilute hydrochloric acid is?",

    options: ["Hydrogen", "Chlorine", "Carbon dioxide", "Oxygen"],

    answer: 2,

    topic: "Carbon Compounds",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 73),

    question: "The number of elements in the modern periodic table is?",

    options: ["92", "102", "118", "120"],

    answer: 2,

    topic: "Periodic Table",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 74),

    question: "Which of the following is an example of a base?",

    options: ["H₂SO₄", "NaOH", "HNO₃", "CO₂"],

    answer: 1,

    topic: "Acids and Bases",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 75),

    question: "The removal of water molecules from hydrated salts is called?",

    options: ["Efflorescence", "Deliquescence", "Dehydration", "Distillation"],

    answer: 2,

    topic: "Salts",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 76),

    question: "Which of the following substances is used in making soap?",

    options: [
      "Fat and alkali",
      "Oil and acid",
      "Water and sugar",
      "Salt and chlorine",
    ],

    answer: 0,

    topic: "Industrial Chemistry",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 77),

    question:
      "The process of obtaining pure crystals from a solution is known as?",

    options: [
      "Distillation",
      "Filtration",
      "Crystallization",
      "Chromatography",
    ],

    answer: 2,

    topic: "Separation Techniques",

    year: 2023,
  }),

  createQuestion({
    id: generateId("chemistry", 78),

    question: "The chemical used in the treatment of drinking water is?",

    options: ["Chlorine", "Nitrogen", "Hydrogen", "Sulphur"],

    answer: 0,

    topic: "Water Treatment",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 79),

    question: "The process in which atoms gain electrons is called?",

    options: ["Oxidation", "Reduction", "Neutralization", "Combustion"],

    answer: 1,

    topic: "Redox Reactions",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 80),

    question: "Study the laboratory setup below.",

    options: ["Distillation", "Filtration", "Chromatography", "Electrolysis"],

    answer: 0,

    image: chemistryDistillationSetup,

    topic: "Separation Techniques",

    difficulty: "medium",

    year: 2023,
  }),
  createQuestion({
    id: generateId("chemistry", 81),

    question:
      "Which quantum number describes the orientation of an orbital in space?",

    options: [
      "Principal quantum number",
      "Azimuthal quantum number",
      "Magnetic quantum number",
      "Spin quantum number",
    ],

    answer: 2,

    topic: "Atomic Structure",

    explanation:
      "The magnetic quantum number determines the orientation of an orbital in space.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 82),

    question:
      "What volume of oxygen is required to completely burn 50 cm³ of methane according to the equation CH₄ + 2O₂ → CO₂ + 2H₂O?",

    options: ["25 cm³", "50 cm³", "75 cm³", "100 cm³"],

    answer: 3,

    topic: "Stoichiometry",

    explanation:
      "From the equation, 1 volume of CH₄ reacts with 2 volumes of O₂. Therefore, 50 cm³ of CH₄ requires 100 cm³ of O₂.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 83),

    question:
      "Which of the following substances will conduct electricity in the solid state?",

    options: ["Sodium chloride", "Copper", "Sugar", "Sulphur"],

    answer: 1,

    topic: "Electrochemistry",

    explanation:
      "Copper conducts electricity in the solid state because it contains free-moving electrons.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 84),

    question: "The oxidation number of sulphur in H₂SO₄ is:",

    options: ["+2", "+4", "+6", "+8"],

    answer: 2,

    topic: "Oxidation and Reduction",

    explanation:
      "Hydrogen is +1 and oxygen is -2. Therefore, 2(+1) + x + 4(-2) = 0. Solving gives x = +6.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 85),

    question:
      "Which gas is evolved when dilute hydrochloric acid reacts with zinc?",

    options: ["Oxygen", "Chlorine", "Hydrogen", "Carbon dioxide"],

    answer: 2,

    topic: "Acids and Bases",

    explanation: "Zn + 2HCl → ZnCl₂ + H₂. Hydrogen gas is evolved.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 86),

    question: "The functional group present in alcohols is:",

    options: ["-COOH", "-OH", "-CHO", "-NH₂"],

    answer: 1,

    topic: "Organic Chemistry",

    explanation: "Alcohols contain the hydroxyl functional group (-OH).",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 87),

    question:
      "What is the empirical formula of a compound containing 40% carbon, 6.7% hydrogen and 53.3% oxygen?",

    options: ["CH₂O", "C₂H₄O", "CH₄O", "C₂H₆O"],

    answer: 0,

    topic: "Chemical Combination",

    explanation:
      "Converting percentages to mole ratio gives C:H:O = 1:2:1. Therefore, empirical formula = CH₂O.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 88),

    question: "Which of the following is an example of a strong acid?",

    options: [
      "Ethanoic acid",
      "Carbonic acid",
      "Hydrochloric acid",
      "Citric acid",
    ],

    answer: 2,

    topic: "Acids and Bases",

    explanation:
      "Hydrochloric acid ionizes completely in water and is a strong acid.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 89),

    question:
      "The process by which a solid changes directly into gas without passing through the liquid state is called:",

    options: ["Evaporation", "Condensation", "Sublimation", "Melting"],

    answer: 2,

    topic: "States of Matter",

    explanation: "Sublimation is the direct change of a solid to gas.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 90),

    question:
      "Which of the following metals reacts most vigorously with water?",

    options: ["Copper", "Iron", "Sodium", "Silver"],

    answer: 2,

    topic: "Metals",

    explanation:
      "Sodium reacts vigorously with cold water to produce sodium hydroxide and hydrogen gas.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 91),

    question: "The number of electrons in the outermost shell of chlorine is:",

    options: ["5", "6", "7", "8"],

    answer: 2,

    topic: "Atomic Structure",

    explanation:
      "Chlorine has atomic number 17 with electronic configuration 2,8,7. Therefore, it has 7 valence electrons.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 92),

    question:
      "What mass of NaOH is required to prepare 500 cm³ of 0.2 mol/dm³ solution? (NaOH = 40 g/mol)",

    options: ["2 g", "4 g", "6 g", "8 g"],

    answer: 1,

    topic: "Mole Concept",

    explanation:
      "Moles = concentration × volume = 0.2 × 0.5 = 0.1 mol. Mass = moles × molar mass = 0.1 × 40 = 4 g.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 93),

    question:
      "Which of the following is used as a catalyst in the Haber process?",

    options: ["Nickel", "Iron", "Copper", "Zinc"],

    answer: 1,

    topic: "Industrial Chemistry",

    explanation:
      "Iron is the catalyst used in the Haber process for ammonia production.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 94),

    question: "The pH of a neutral solution at 25°C is:",

    options: ["0", "5", "7", "14"],

    answer: 2,

    topic: "Acids and Bases",

    explanation: "A neutral solution has pH 7 at 25°C.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 95),

    question: "Which of the following compounds is unsaturated?",

    options: ["Ethane", "Propane", "Ethene", "Methane"],

    answer: 2,

    topic: "Organic Chemistry",

    explanation:
      "Ethene contains a carbon-carbon double bond and is unsaturated.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 96),

    question: "The major constituent of natural gas is:",

    options: ["Ethane", "Methane", "Propane", "Butane"],

    answer: 1,

    topic: "Hydrocarbons",

    explanation: "Methane is the major component of natural gas.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 97),

    question: "Which of the following salts is soluble in water?",

    options: [
      "Silver chloride",
      "Lead(II) sulphate",
      "Sodium nitrate",
      "Calcium carbonate",
    ],

    answer: 2,

    topic: "Solubility",

    explanation: "All nitrates are soluble in water.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 98),

    question:
      "The process of coating iron with zinc to prevent rusting is known as:",

    options: ["Electroplating", "Galvanizing", "Alloying", "Smelting"],

    answer: 1,

    topic: "Corrosion",

    explanation:
      "Galvanizing involves coating iron with zinc to prevent rusting.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 99),

    question: "Which of the following gases turns lime water milky?",

    options: ["Hydrogen", "Oxygen", "Carbon dioxide", "Nitrogen"],

    answer: 2,

    topic: "Chemical Reactions",

    explanation:
      "Carbon dioxide reacts with lime water to form calcium carbonate, making it milky.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 100),

    question: "The IUPAC name of CH₃COOH is:",

    options: [
      "Methanoic acid",
      "Ethanoic acid",
      "Propanoic acid",
      "Butanoic acid",
    ],

    answer: 1,

    topic: "Organic Chemistry",

    explanation: "CH₃COOH is ethanoic acid.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 101),

    question: "Which particle determines the identity of an element?",

    options: ["Electron", "Neutron", "Proton", "Photon"],

    answer: 2,

    topic: "Atomic Structure",

    explanation:
      "The number of protons (atomic number) determines the identity of an element.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 102),

    question:
      "What is the molar volume of a gas at standard temperature and pressure (STP)?",

    options: ["11.2 dm³", "22.4 dm³", "24 dm³", "44.8 dm³"],

    answer: 1,

    topic: "Gas Laws",

    explanation: "At STP, one mole of gas occupies 22.4 dm³.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 103),

    question: "Which of the following is an amphoteric oxide?",

    options: ["CO₂", "Na₂O", "Al₂O₃", "SO₂"],

    answer: 2,

    topic: "Oxides",

    explanation:
      "Aluminium oxide is amphoteric because it reacts with both acids and bases.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 104),

    question: "The chemical formula of washing soda is:",

    options: ["NaHCO₃", "Na₂CO₃·10H₂O", "CaCO₃", "NaCl"],

    answer: 1,

    topic: "Chemical Compounds",

    explanation:
      "Washing soda is sodium trioxocarbonate(V) decahydrate: Na₂CO₃·10H₂O.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 105),

    question: "Which type of bond is formed by the transfer of electrons?",

    options: ["Covalent bond", "Metallic bond", "Ionic bond", "Hydrogen bond"],

    answer: 2,

    topic: "Chemical Bonding",

    explanation:
      "Ionic bonding involves transfer of electrons from one atom to another.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 106),

    question: "Which of the following is a reducing agent?",

    options: ["Oxygen", "Hydrogen", "Chlorine", "Nitric acid"],

    answer: 1,

    topic: "Redox Reaction",

    explanation:
      "Hydrogen removes oxygen from metal oxides and acts as a reducing agent.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 107),

    question: "The gas produced during photosynthesis is:",

    options: ["Nitrogen", "Carbon dioxide", "Hydrogen", "Oxygen"],

    answer: 3,

    topic: "Environmental Chemistry",

    explanation: "Photosynthesis releases oxygen gas into the atmosphere.",

    year: 2019,
  }),

  createQuestion({
    id: generateId("chemistry", 108),

    question: "Which of the following is an alkali?",

    options: [
      "Copper(II) oxide",
      "Ammonium hydroxide",
      "Hydrochloric acid",
      "Carbon dioxide",
    ],

    answer: 1,

    topic: "Acids and Bases",

    explanation:
      "Ammonium hydroxide is a soluble base and therefore an alkali.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 109),

    question:
      "The atomic number of an element is 12. The element belongs to which group?",

    options: ["Group I", "Group II", "Group III", "Group VII"],

    answer: 1,

    topic: "Periodic Table",

    explanation:
      "Atomic number 12 is magnesium with electronic configuration 2,8,2. Therefore, it belongs to Group II.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 110),

    question:
      "Which of the following compounds will undergo addition reaction?",

    options: ["Ethane", "Ethene", "Methane", "Propane"],

    answer: 1,

    topic: "Organic Chemistry",

    explanation:
      "Ethene contains a double bond and undergoes addition reactions.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 111),

    question:
      "What is the relative molecular mass of H₂SO₄? (H = 1, S = 32, O = 16)",

    options: ["96", "98", "100", "102"],

    answer: 1,

    topic: "Relative Molecular Mass",

    explanation: "Mr = 2(1) + 32 + 4(16) = 2 + 32 + 64 = 98.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 112),

    question:
      "The process of converting starch to glucose using enzymes is called:",

    options: ["Hydrogenation", "Hydrolysis", "Polymerization", "Cracking"],

    answer: 1,

    topic: "Biochemistry",

    explanation:
      "Hydrolysis breaks starch into glucose molecules using water and enzymes.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 113),

    question:
      "Which of the following is used in the manufacture of fertilizers?",

    options: ["Ammonia", "Chlorine", "Hydrogen", "Helium"],

    answer: 0,

    topic: "Industrial Chemistry",

    explanation: "Ammonia is a major raw material in fertilizer production.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 114),

    question: "The brown ring test is used to identify the presence of:",

    options: [
      "Sulphate ions",
      "Chloride ions",
      "Nitrate ions",
      "Carbonate ions",
    ],

    answer: 2,

    topic: "Qualitative Analysis",

    explanation: "The brown ring test confirms the presence of nitrate ions.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 115),

    question:
      "Which of the following is an example of a heterogeneous mixture?",

    options: ["Salt solution", "Air", "Brass", "Sand and water"],

    answer: 3,

    topic: "Mixtures",

    explanation:
      "Sand and water form a heterogeneous mixture because the components are visibly distinct.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 116),

    question:
      "The electrode where oxidation occurs during electrolysis is called:",

    options: ["Cathode", "Anode", "Electrolyte", "Salt bridge"],

    answer: 1,

    topic: "Electrolysis",

    explanation: "Oxidation occurs at the anode during electrolysis.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 117),

    question: "Which of the following metals is extracted by electrolysis?",

    options: ["Iron", "Copper", "Aluminium", "Lead"],

    answer: 2,

    topic: "Metallurgy",

    explanation: "Aluminium is extracted from bauxite by electrolysis.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 118),

    question:
      "The major cause of temporary hardness in water is the presence of:",

    options: [
      "Calcium chloride",
      "Magnesium sulphate",
      "Calcium hydrogen trioxocarbonate(IV)",
      "Sodium chloride",
    ],

    answer: 2,

    topic: "Water Chemistry",

    explanation:
      "Temporary hardness is caused by dissolved calcium and magnesium hydrogen trioxocarbonates(IV).",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 119),

    question:
      "Which of the following gases is responsible for the greenhouse effect?",

    options: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"],

    answer: 2,

    topic: "Environmental Chemistry",

    explanation:
      "Carbon dioxide traps heat in the atmosphere and contributes to the greenhouse effect.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 120),

    question:
      "The reaction between an acid and a base to form salt and water is known as:",

    options: ["Oxidation", "Neutralization", "Hydrolysis", "Reduction"],

    answer: 1,

    topic: "Acids and Bases",

    explanation:
      "Neutralization is the reaction of an acid with a base to produce salt and water.",

    year: 2022,
  }),
  createQuestion({
    id: generateId("chemistry", 121),

    question:
      "Which of the following is a characteristic of transition metals?",

    options: [
      "They form only ionic compounds",
      "They have variable oxidation states",
      "They are non-conductors",
      "They are all gases",
    ],

    answer: 1,

    topic: "Transition Elements",

    explanation:
      "Transition metals exhibit variable oxidation states due to involvement of d-orbitals.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 122),

    question:
      "What is the pH of a solution with hydrogen ion concentration of 1 × 10⁻³ mol/dm³?",

    options: ["1", "3", "5", "7"],

    answer: 1,

    topic: "pH Calculation",

    explanation: "pH = -log[H⁺] = -log(10⁻³) = 3.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 123),

    question: "Which of the following is a characteristic of an ideal gas?",

    options: [
      "It has strong intermolecular forces",
      "It occupies fixed volume",
      "It obeys gas laws at all temperatures",
      "It is incompressible",
    ],

    answer: 2,

    topic: "Gas Laws",

    explanation:
      "An ideal gas obeys all gas laws under all conditions of temperature and pressure.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 124),

    question: "Which of the following processes involves gain of electrons?",

    options: ["Oxidation", "Reduction", "Combustion", "Evaporation"],

    answer: 1,

    topic: "Redox Reaction",

    explanation: "Reduction is defined as gain of electrons.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 125),

    question:
      "Which gas is commonly used in welding because of its high temperature flame?",

    options: ["Hydrogen", "Oxygen", "Acetylene", "Nitrogen"],

    answer: 2,

    topic: "Industrial Chemistry",

    explanation:
      "Acetylene produces a very hot flame used in oxy-acetylene welding.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 126),

    question:
      "Which of the following elements has the highest electronegativity?",

    options: ["Oxygen", "Fluorine", "Chlorine", "Nitrogen"],

    answer: 1,

    topic: "Periodic Table",

    explanation: "Fluorine is the most electronegative element.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 127),

    question: "What type of bond is present in NaCl?",

    options: ["Covalent bond", "Metallic bond", "Ionic bond", "Hydrogen bond"],

    answer: 2,

    topic: "Chemical Bonding",

    explanation:
      "NaCl is formed by transfer of electrons between sodium and chlorine.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 128),

    question: "Which of the following is an example of a polymer?",

    options: ["Glucose", "Ethene", "Polythene", "Methane"],

    answer: 2,

    topic: "Polymers",

    explanation: "Polythene is a polymer formed from ethene monomers.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 129),

    question:
      "Which of the following increases the rate of a chemical reaction?",

    options: [
      "Decrease in temperature",
      "Decrease in concentration",
      "Use of catalyst",
      "Increase in particle size",
    ],

    answer: 2,

    topic: "Reaction Kinetics",

    explanation:
      "Catalysts increase reaction rate by lowering activation energy.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 130),

    question: "Which of the following is a noble gas?",

    options: ["Oxygen", "Nitrogen", "Argon", "Hydrogen"],

    answer: 2,

    topic: "Periodic Table",

    explanation: "Argon is a noble gas with a stable electronic configuration.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 131),

    question: "Which of the following acids is found in vinegar?",

    options: ["Citric acid", "Ethanoic acid", "Sulphuric acid", "Nitric acid"],

    answer: 1,

    topic: "Organic Chemistry",

    explanation: "Vinegar contains ethanoic acid (acetic acid).",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 132),

    question: "What is the main ore of aluminium?",

    options: ["Hematite", "Bauxite", "Galena", "Cassiterite"],

    answer: 1,

    topic: "Metallurgy",

    explanation: "Bauxite is the main ore of aluminium.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 133),

    question:
      "Which of the following is used as a drying agent in the laboratory?",

    options: [
      "Water",
      "Sodium chloride",
      "Concentrated sulphuric acid",
      "Hydrogen peroxide",
    ],

    answer: 2,

    topic: "Laboratory Techniques",

    explanation:
      "Concentrated sulphuric acid is a strong dehydrating agent used for drying gases.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 134),

    question: "Which of the following is a physical change?",

    options: [
      "Burning of paper",
      "Rusting of iron",
      "Melting of ice",
      "Cooking of food",
    ],

    answer: 2,

    topic: "States of Matter",

    explanation:
      "Melting of ice is a physical change because no new substance is formed.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 135),

    question: "Which of the following is used to test for carbon dioxide gas?",

    options: [
      "Lime water",
      "Litmus paper",
      "Hydrochloric acid",
      "Universal indicator",
    ],

    answer: 0,

    topic: "Qualitative Analysis",

    explanation: "Carbon dioxide turns lime water milky.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 136),

    question: "Which of the following is a property of metals?",

    options: ["Poor conductor of heat", "Brittle", "Malleable", "Non-lustrous"],

    answer: 2,

    topic: "Metals and Non-metals",

    explanation: "Metals are malleable and can be hammered into sheets.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 137),

    question: "Which gas is responsible for acid rain formation?",

    options: ["Oxygen", "Nitrogen", "Sulphur dioxide", "Hydrogen"],

    answer: 2,

    topic: "Environmental Chemistry",

    explanation: "Sulphur dioxide reacts with water to form acid rain.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 138),

    question: "Which of the following is an alkane?",

    options: ["Ethene", "Ethyne", "Methane", "Benzene"],

    answer: 2,

    topic: "Hydrocarbons",

    explanation: "Methane is a saturated hydrocarbon (alkane).",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 139),

    question: "Which of the following is used in water purification?",

    options: ["Chlorine", "Hydrogen", "Nitrogen", "Carbon"],

    answer: 0,

    topic: "Water Treatment",

    explanation: "Chlorine is used to disinfect and purify water.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 140),

    question:
      "Which of the following is a characteristic of covalent compounds?",

    options: [
      "High melting point",
      "Conduct electricity in solid state",
      "Low melting point",
      "Good conductors of electricity",
    ],

    answer: 2,

    topic: "Chemical Bonding",

    explanation:
      "Covalent compounds generally have low melting points due to weak intermolecular forces.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 141),

    question: "Which of the following is a strong base?",

    options: ["Ammonia", "Sodium hydroxide", "Water", "Carbonic acid"],

    answer: 1,

    topic: "Acids and Bases",

    explanation:
      "Sodium hydroxide completely dissociates in water and is a strong base.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 142),

    question: "Which of the following is used in dry cells?",

    options: ["Copper", "Zinc", "Silver", "Iron"],

    answer: 1,

    topic: "Electrochemistry",

    explanation: "Zinc is used as the anode in dry cells.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 143),

    question: "Which of the following is a greenhouse gas apart from CO₂?",

    options: ["Oxygen", "Methane", "Nitrogen", "Hydrogen"],

    answer: 1,

    topic: "Environmental Chemistry",

    explanation: "Methane is a potent greenhouse gas.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 144),

    question: "Which of the following is the electron configuration of sodium?",

    options: ["2,8,1", "2,8,2", "2,7", "2,8,8"],

    answer: 0,

    topic: "Atomic Structure",

    explanation: "Sodium has atomic number 11, so its configuration is 2,8,1.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 145),

    question: "Which of the following is used to detect starch?",

    options: [
      "Benedict’s solution",
      "Iodine solution",
      "Fehling’s solution",
      "Litmus paper",
    ],

    answer: 1,

    topic: "Biochemistry",

    explanation: "Iodine turns blue-black in the presence of starch.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 146),

    question:
      "Which of the following is a product of complete combustion of hydrocarbons?",

    options: [
      "Carbon monoxide and water",
      "Carbon dioxide and water",
      "Carbon and hydrogen",
      "Methane and oxygen",
    ],

    answer: 1,

    topic: "Combustion",

    explanation: "Complete combustion produces carbon dioxide and water.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 147),

    question:
      "Which of the following increases solubility of a solid in a liquid?",

    options: [
      "Decrease in temperature",
      "Increase in temperature",
      "Decrease in pressure",
      "Increase in particle size",
    ],

    answer: 1,

    topic: "Solubility",

    explanation: "For most solids, solubility increases with temperature.",

    year: 2022,
  }),

  createQuestion({
    id: generateId("chemistry", 148),

    question: "Which of the following is a characteristic of acids?",

    options: [
      "Turn red litmus blue",
      "Have pH greater than 7",
      "Turn blue litmus red",
      "Are always insoluble",
    ],

    answer: 2,

    topic: "Acids and Bases",

    explanation: "Acids turn blue litmus paper red.",

    year: 2021,
  }),

  createQuestion({
    id: generateId("chemistry", 149),

    question: "Which of the following metals is liquid at room temperature?",

    options: ["Mercury", "Iron", "Copper", "Aluminium"],

    answer: 0,

    topic: "Metals",

    explanation:
      "Mercury is the only metal that is liquid at room temperature.",

    year: 2020,
  }),

  createQuestion({
    id: generateId("chemistry", 150),

    question: "Which of the following is the correct IUPAC name for CH₃CH₂OH?",

    options: ["Methanol", "Ethanol", "Propanol", "Butanol"],

    answer: 1,

    topic: "Organic Chemistry",

    explanation: "CH₃CH₂OH is ethanol.",

    year: 2022,
  }),
];

/* =========================================================
BIOLOGY
========================================================= */

const biology = [
  createQuestion({
    id: "biology-2011-1",
    question: `Which Question Paper Type of Biology is given to you?`,
    options: ["Type A", "Type B", "Type C", "Type D"],
    answer: `Type A`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-2",
    question: `The function of the red head in male Agama lizards is to`,
    options: [
      "conceal and camouflage the animal from predators",
      "scare other males from the territory",
      "attract female lizards for mating purposes",
      "warm predators of the distastefulness of the animal",
    ],
    answer: `conceal and camouflage the animal from predators`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-3",
    question: `In which of the following species is the biomass of an individual the smallest?`,
    options: ["Agama sp.", "Bufo sp.", "Spirogyra sp.", "Tilapia sp."],
    answer: `Agama sp.`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-4",
    question: `Seed plants are divided into`,
    options: [
      "tracheophytes and ferns",
      "angiosperms and gymnosperms",
      "monocotyledons and dicotyledons",
      "thallophytes and bryophytes",
    ],
    answer: `tracheophytes and ferns`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-5",
    question: `In which of the following groups of vertebrates is parental care mostly exhibited?`,
    options: [
      "Reptilia",
      "Amphibia",
      "Aves",
      "Mammalia Use the Diagrams below to answer questions 6 to 8",
    ],
    answer: `Reptilia`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-6",
    question: `Which of the organisms represented are notable agricultural pests?`,
    options: ["II and IV", "I and IV", "II and III", "I and III"],
    answer: `II and IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-7",
    question: `An economic importance of the organism represented by IV is that`,
    options: [
      "it transmits water borne disease to humans",
      "it is destructive to farm crops",
      "its faeces pollutes drinking water",
      "it helps in the control of mosquito larvae",
    ],
    answer: `it transmits water borne disease to humans`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-8",
    question: `The adult form of iii is a vector of`,
    options: [
      "sleeping sickness",
      "river blindness",
      "cholera",
      "elephantiasis",
    ],
    answer: `sleeping sickness`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-9",
    question: `The adaptive importance of nuptial flight from termite colonies is to`,
    options: [
      "disperse the reproductives in order to establish new colonies",
      "provide abundant food for birds and other animals during the early rains",
      "ensure cross -breeding between members of one colony and another",
      "expel the reproductives so as to provide enough food for other members Use the diagram below to answer question 10 and 11 Page 9",
    ],
    answer: `disperse the reproductives in order to establish new colonies`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-10",
    question: `The gas evolved in the process is`,
    options: ["carbon (IV) oxide", "nitrogen", "oxygen", "carbon (II) oxide"],
    answer: `carbon (IV) oxide`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-11",
    question: `The experimental set -up above is used to demonstrate the process of`,
    options: ["diffusion", "photosynthesis", "fermentation", "plasmolysis"],
    answer: `diffusion`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-12",
    question: `Which of the following can cause shrinkage of living cells?`,
    options: [
      "Hypotonic solution",
      "Isotonic solution",
      "Deionized water",
      "Hypertonic solution",
    ],
    answer: `Hypotonic solution`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-13",
    question: `Which of the following is true of leucocytes?`,
    options: [
      "they are respiratory pigments",
      "they are most numerous and ramify all cells",
      "they are large and nucleated",
      "they are involved in blood clotting",
    ],
    answer: `they are respiratory pigments`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-14",
    question: `The conversion of a nutrient into a molecule in the body of a consumer is referred to as`,
    options: ["digestion", "assimilation", "absorption", "inhibition"],
    answer: `digestion`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-15",
    question: `The ability of living organism to detect and respond to changes in the environment is referred to as`,
    options: ["locomotion", "irritability", "growth", "taxis"],
    answer: `locomotion`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-16",
    question: `In mammals, the exchange of nutrients and metabolic products occurs in the`,
    options: ["lungs", "oesophagus", "trachea", "lymph"],
    answer: `lungs`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-17",
    question: `An example of an endospermous seed is`,
    options: ["maize gain", "cashew nut", "cotton seed", "been seed"],
    answer: `maize gain`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-18",
    question: `I. Parasitism → Sundew. II. Autotrophism →Amoeba. III. Saprophytism → Alga. IV Heterotrophism → Agama. Which of the above modes of nutrition is correctly matched with the organism that exhibits it?`,
    options: [
      "II",
      "III",
      "II",
      "I Use the following information to answer the questions 19 and",
    ],
    answer: `II`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-19",
    question: `In which of the test tubes will glucose be detected after complete hydrolysis?`,
    options: ["I and II only", "II and III only", "I only", "I, II and III"],
    answer: `I and II only`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-20",
    question: `The enzyme involved in the hydrolysis is`,
    options: ["rennin", "erepsin Page 10", "sucrase", "maltase"],
    answer: `rennin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-21",
    question: `The part of the mammalian ear responsible for the maintenance of balance is the`,
    options: ["cochlea", "pinna", "perilymph", "ossicles"],
    answer: `cochlea`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-22",
    question: `The path followed by air as it passes through the lungs in mammals is`,
    options: [
      "trachea → bronchi → bronchioles → alveoli",
      "bronchi → trachea → alveoli → bronchioles",
      "trachea → bronchioles →bronchi → alveoli",
      "bronchioles → alveoli → bronchi →trachea",
    ],
    answer: `trachea → bronchi → bronchioles → alveoli`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-23",
    question: `The movement response of a cockroach away from a light source can be described as`,
    options: [
      "positive phototaxism",
      "negative phototaxism",
      "negative phototropism",
      "positive phototropism",
    ],
    answer: `positive phototaxism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-24",
    question: `The vascular tissues in higher plants are responsible for`,
    options: [
      "the movement of food and water",
      "suction pressure",
      "transpiration pull",
      "the transport of gases and water",
    ],
    answer: `the movement of food and water`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-25",
    question: `Which of the following organs regulates the levels of water, salts, hydrogen ions and urea in the mammalian blood?`,
    options: ["Liver", "Kidney", "Bladder", "Colon"],
    answer: `Liver`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-26",
    question: `The sequence of the one -way gaseous exchange mechanism in a fish is`,
    options: [
      "operculum → gills → mouth",
      "gills → operculum → mouth",
      "mouth → operculum → gills",
      "mouth → gills → operculum",
    ],
    answer: `operculum → gills → mouth`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-27",
    question: `The type of asexual reproduction that is common to both Paramecium and protists is`,
    options: ["budding", "sporulation", "fragmentation", "fission"],
    answer: `budding`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-28",
    question: `In nature, plants and animals are perpetually engaged in mutualism because`,
    options: [
      "they are rivals",
      "all animals rely on food produced by plants",
      "they utilize respiratory wastes of each other",
      "they are neighbours",
    ],
    answer: `they are rivals`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-30",
    question: `An example of a filter -feeding animal is`,
    options: ["shark", "butterfly", "whale", "mosquito"],
    answer: `shark`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-31",
    question: `Which of the following is a feature of the population pyramid of a developing country?`,
    options: [
      "long lifespan",
      "low birth rate",
      "low death rate Page 11",
      "short lifespan",
    ],
    answer: `long lifespan`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-32",
    question: `The interaction of a community of organisms with its abiotic environment constitutes`,
    options: ["niche", "a food chain", "an ecosystem", "a microhabitat"],
    answer: `niche`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-33",
    question: `The vector of the malaria parasite is`,
    options: [
      "female Aedes mosquito",
      "female Anopheles mosquito",
      "male Culex mosquito",
      "female Culex mosquito",
    ],
    answer: `female Aedes mosquito`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-34",
    question: `Which of the following instruments is used to measure relative humidity?`,
    options: ["Hydrometer", "Thermometer", "Hygrometer", "Anemometer"],
    answer: `Hydrometer`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-35",
    question: `Exo-erythrocytic phase of the life cycle of malaria parasite occurs in the`,
    options: [
      "liver of humans",
      "reticuloendothelial cells of humans",
      "Malpighian tubules of mosquito",
      "brain of humans",
    ],
    answer: `liver of humans`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-36",
    question: `Habitats are generally classified into`,
    options: [
      "biotic and abiotic",
      "aquatic and terrestrial",
      "arboreal and marine biomes",
      "microhabitats and macrohabitats",
    ],
    answer: `biotic and abiotic`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-37",
    question: `Dracunculiasis can be contacted through`,
    options: [
      "eating contaminated food",
      "drinking contaminated water",
      "bathing in contaminated water",
      "bites of blackfly",
    ],
    answer: `eating contaminated food`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-38",
    question: `Which of the following groups of environmental factors are density - dependent?`,
    options: [
      "Food, salinity, accumulation of metabolites and light",
      "Temperature, salinity predation and disease",
      "Food predation, disease and accumulation of metabolites",
      "Temperature food disease and light",
    ],
    answer: `Food, salinity, accumulation of metabolites and light`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-39",
    question: `Millet, sorghum, maize and onions are common crops growth in Nigeria in the`,
    options: [
      "tropical rainforests",
      "Sudan savanna",
      "montane forests",
      "Sahel savanna",
    ],
    answer: `tropical rainforests`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-40",
    question: `In which of the following biomes is the south western part of Nigeria located?`,
    options: [
      "Temperate forest",
      "Tropical rainforest",
      "Tropical woodland",
      "Desert",
    ],
    answer: `Temperate forest`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-41",
    question: `The inheritable characters that are determined by a gene located on the X - chromosome is`,
    options: ["recessive", "sex-linked", "homozygous", "dominant"],
    answer: `recessive`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-42",
    question: `Lack of space in a population could lead to an increase in`,
    options: ["water scarcity", "birth rate", "disease rate", "drought"],
    answer: `water scarcity`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-43",
    question: `If the cross of a red -flowered plant with a white -flowered plant produces a pink - flowered plant, it is an example of`,
    options: ["codominance", "incomplete dominance", "mutation", "linkage"],
    answer: `codominance`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-44",
    question: `Which of the following theories was NOT considered by Darwin in his evolutionary theory?`,
    options: [
      "Variation",
      "Survival of the fittest",
      "Use and disuse",
      "Competition",
    ],
    answer: `Variation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-45",
    question: `The crossing of individuals of the same species with different genetic characters is`,
    options: [
      "cross breeding Page 12",
      "polygenic inheritance",
      "non -disjunction",
      "inbreeding",
    ],
    answer: `cross breeding Page 12`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-46",
    question: `The number of alleles controlling blood groups in humans`,
    options: ["3", "4", "5", "2"],
    answer: `3`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-47",
    question: `During blood transfusion, agglutination may occur as a result of the reaction between`,
    options: [
      "contrasting antigens and antibodies",
      "two different antigens",
      "two different antibodies",
      "similar antigens and antibodies",
    ],
    answer: `contrasting antigens and antibodies`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-48",
    question: `The fallacy in Lamarck's evolutionary theory was the assumption that`,
    options: [
      "traits are acquired through disuse of body parts",
      "acquired traits are heritable",
      "acquired traits are seldom formed",
      "traits are acquired through the use of body parts",
    ],
    answer: `traits are acquired through disuse of body parts`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-49",
    question: `The bright coloured eye spots on the wings of moth are an example of`,
    options: [
      "warning colouration",
      "disruptive colouration",
      "crypsis",
      "mimicry",
    ],
    answer: `warning colouration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2011-50",
    question: `The wings of a bat and those of a bird are examples of`,
    options: [
      "convergent evolution",
      "continuous variation",
      "coevolution",
      "divergent evolution Page 13",
    ],
    answer: `convergent evolution`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2011,
  }),

  createQuestion({
    id: "biology-2012-1",
    question: `Which Question Paper Type of Biology as indicated above is given to you?`,
    options: [
      "Type Green",
      "Type Purple",
      "Type Red",
      "Type Yellow Use the diagram below to answer question 2 and 3",
    ],
    answer: `Type Red`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-2",
    question: `The organelle responsible for heredity is labelled`,
    options: ["l", "ll", "lll", "I"],
    answer: `ll`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-3",
    question: `The part labelled IV is the`,
    options: ["mitochondrion", "cell wall", "endoplasmic reticulum", "nucleus"],
    answer: `endoplasmic reticulum`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-4",
    question: `Which of the following is most advanced in the evolutionary trend of animals?`,
    options: ["Liver fluke", "Earthworm", "Snail", "Cockroach"],
    answer: `Cockroach`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-5",
    question: `Which of the following is the lowest category of classification?`,
    options: ["Class", "Species", "Family"],
    answer: `Species`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-6",
    question: `Plants that show secondary growth are usually found among the`,
    options: [
      "thallophytes",
      "pteridophytes",
      "monocotyledons",
      "dicotyledons",
    ],
    answer: `pteridophytes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-7",
    question: `The fungi are distinct group of eukaryotes mainly because they have`,
    options: [
      "spores",
      "no chlorophyll",
      "many fruiting bodies",
      "sexual and sexual reproduction",
    ],
    answer: `no chlorophyll`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-8",
    question: `An arthropod that is destructive at early stage of its life cycle is`,
    options: ["butterfly", "mosquito", "bee", "millipede"],
    answer: `butterfly`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-9",
    question: `An animal body that can be cut along its axis in any plane to give two identical parts is said to be`,
    options: [
      "radially symmetrical",
      "bilaterally symmetrical",
      "asymmetrical",
      "symmetrical",
    ],
    answer: `radially symmetrical`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-10",
    question: `Which of the following possesses mammary gland?`,
    options: ["Dogfish", "whale", "shark", "catfish"],
    answer: `Dogfish`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-11",
    question: `The feature that links birds to reptiles in evolution is the possession of`,
    options: ["feathers", "break", "skeleton", "scales Page 15"],
    answer: `feathers`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-12",
    question: `Countershading is an adaptive feature that enables animals to`,
    options: [
      "fight enemies",
      "remain undetected",
      "warn enemies",
      "attract mates",
    ],
    answer: `fight enemies`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-13",
    question: `Which of the following plant structures lacks a waterproof cuticle?`,
    options: ["leaf", "stem", "root", "shoot"],
    answer: `leaf`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-14",
    question: `In the mammalian male reproductive system, the part that serves as a passage for both urine and semen is the`,
    options: ["urethra", "ureter", "bladder", "seminal vesicle"],
    answer: `urethra`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-15",
    question: `In plants which of the following is required in minute quantities for growth?`,
    options: ["Copper", "Potassium", "Phosphorus", "Sodium"],
    answer: `Copper`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-16",
    question: `Which of the following organisms is both parasitic and autotrophic?`,
    options: ["Sundew", "Loran thus", "Rhizopus", "Tapeworm"],
    answer: `Sundew`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-17",
    question: `A function of the hydrochloric acid produced in the human stomach during digestion is to`,
    options: [
      "neutralise the effect of bile",
      "coagulate milk protein and emulsify fats",
      "stop the action of ptyalin",
      "break up food into smaller particles",
    ],
    answer: `neutralise the effect of bile`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-18",
    question: `Which of the following is a polysaccharide?`,
    options: [
      "Glucose",
      "Sucrose",
      "Maltose",
      "Cellulose Use the diagram below to answer this question 19 and",
    ],
    answer: `Glucose`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-19",
    question: `Arrows represent directional movement materials. Transportation in the xylem is represented by`,
    options: ["I", "II", "III", "IV"],
    answer: `I`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-20",
    question: `The arrow labelled ll represents the`,
    options: [
      "release of oxygen",
      "intake of carbon (IV) oxide",
      "movement of photosynthates",
      "movement of nutrients",
    ],
    answer: `release of oxygen`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-21",
    question: `In the kidney of mammals, the site of ultrafiltration is the`,
    options: [
      "uriniferous tubule",
      "Bowman's capsule",
      "loop of Henle",
      "renal tubule",
    ],
    answer: `uriniferous tubule`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-22",
    question: `Which of the following is involved in secondary thickening in plants?`,
    options: [
      "Collenchyma and xylem cells",
      "Vascular cambium",
      "Vascular cambium and cork cambium",
      "Cork cambium and sclerenchyma Page 16",
    ],
    answer: `Collenchyma and xylem cells`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-23",
    question: `An example of a fruit that develops from a single carpel is`,
    options: ["okro", "tomato", "bean", "orange"],
    answer: `okro`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-24",
    question: `The developing embryo is usually contained in the part labelled`,
    options: ["IV", "III", "II", "I"],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-25",
    question: `The function of the part labelled lll is to`,
    options: [
      "produce egg cells",
      "protect sperms during fertilization",
      "secrete hormones during coitus",
      "protect the developing embryo",
    ],
    answer: `produce egg cells`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-26",
    question: `Plant growth can be artificially stimulated by the addition of`,
    options: ["gibberellin", "kinin", "abscisic acid", "ethylene"],
    answer: `gibberellin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-27",
    question: `The autonomic nervous system consists of neurons that control the`,
    options: ["voluntary muscles", "heart beat", "tongue", "hands"],
    answer: `voluntary muscles`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-28",
    question: `Plants of temperate origin can be grown in tropical areas in the vegetation zones of the`,
    options: [
      "rain forest",
      "Guinea savanna",
      "Sudan savanna",
      "montane forest",
    ],
    answer: `rain forest`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-29",
    question: `The water cycle is maintained mainly by`,
    options: [
      "evaporation of water in the environment",
      "evaporation and condensation of water in the environment",
      "condensation of water in the environment",
      "transpiration and respiration in plants",
    ],
    answer: `evaporation of water in the environment`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-30",
    question: `Organisms living in an estuarine habitat are adapted to`,
    options: [
      "withstand wide fluctu ations in temperature",
      "survive only in water with low salinity",
      "withstand wide fluctuations in salinity",
      "feed only on phytoplankton and dead organic matter",
    ],
    answer: `withstand wide fluctu ations in temperature`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-31",
    question: `The presence of stilt roots, pneumatophores, sunken stomata and salt glands are adaptive features of plants found in the`,
    options: [
      "tropical rainforest",
      "mangrove swamps",
      "grassland",
      "montane forest",
    ],
    answer: `tropical rainforest`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-32",
    question: `Which of the following animals can exist solely on the water they get from food and metabolic reactions?`,
    options: [
      "forest arboreal dweller",
      "Desert dwellers",
      "forest -ground dweller",
      "rainforest dwellers",
    ],
    answer: `forest arboreal dweller`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-33",
    question: `The most likely first colonizers of a bare rock are`,
    options: ["mosses", "ferns", "lichen", "fungi"],
    answer: `mosses`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-34",
    question: `The carrying capacity of a habitat is reached when the population growth begins to`,
    options: [
      "increase slowly",
      "increase exponentially",
      "slow down",
      "remain steady",
    ],
    answer: `increase slowly`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-35",
    question: `The abiotic factors that control human population include`,
    options: [
      "disease and famine",
      "space and rainfall",
      "flooding and earthquake",
      "temperature and disease",
    ],
    answer: `disease and famine`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-36",
    question: `An indigenous method of renewing and maintaining soil fertility is by`,
    options: [
      "clearing farms by burning",
      "planting one crop type Page 17",
      "adding inorganic fertilizers yearly",
      "crop rotation and shifting cultivation",
    ],
    answer: `clearing farms by burning`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-37",
    question: `The diseases caused by water -borne pathogens include`,
    options: [
      "gonorrhoea and poliomyelitis",
      "typhoid and syphilis",
      "tuberculosis and cholera",
      "typhoid and cholera Use the diagram below to answer question 38 and",
    ],
    answer: `gonorrhoea and poliomyelitis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-38",
    question: `The graph illustrates`,
    options: [
      "the highest frequency for height of 2 metres",
      "a discontinuously varying character",
      "a continuously varying character",
      "total yield in a cassava farm",
    ],
    answer: `the highest frequency for height of 2 metres`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-40",
    question: `Which of the following is true in blood transfusion?`,
    options: [
      "person of blood group AB can donate blood only to another person of blood group AB",
      "persons of blood groups A and B can donate or receive blood from each other",
      "A person of blood group AB can receive blood only from persons of blood group A or B",
      "A person of blood group O can donate only to a person of blood group O",
    ],
    answer: `person of blood group AB can donate blood only to another person of blood group AB`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-1",
    question: `The yellow seed is said to be`,
    options: [
      "non-heritable",
      "sex-linked",
      "a recessive trait",
      "a dominant trait",
    ],
    answer: `a recessive trait`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-42",
    question: `When a colour -blind man marries a carrier woman. What is the probability of their offspring being colour blind?`,
    options: ["25%", "50%", "75%", "100%"],
    answer: `25%`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-43",
    question: `The correct base pairing for DNA is`,
    options: [
      "adenine → thymine and guanine → cytosine",
      "adenine → guanine and thymine → cytosine",
      "adenine → cytosine and guanine → thymine",
      "adenine → adenine and cytosine → cytosine Use the diagram above to answer this question 44 and 45",
    ],
    answer: `adenine → thymine and guanine → cytosine`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-44",
    question: `The type of interaction shown is referred to as`,
    options: [
      "interspecific competition",
      "intraspecific competition",
      "mutualism",
      "cooperation",
    ],
    answer: `interspecific competition`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-45",
    question: `Which of the following statement is true of the interaction?`,
    options: [
      "P aurelia is better adapted for obtaining food than P caudatum",
      "P caudatum is better adapted for obtaining food than P. aurelia",
      "both organisms cannot coexist",
      "both organisms cannot reproduce Page 18",
    ],
    answer: `P aurelia is better adapted for obtaining food than P caudatum`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-46",
    question: `The short thick break in birds is an adaptation for`,
    options: [
      "crushing seeds",
      "sucking nectar",
      "tearing flash",
      "straining mud",
    ],
    answer: `crushing seeds`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-47",
    question: `The basking of Agama lizards in the sun is to`,
    options: [
      "change the colour of their body",
      "raise their body temperature to become active",
      "fight to defend their territories",
      "attract the female for courtship",
    ],
    answer: `change the colour of their body`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-48",
    question: `The significance of a very large number of termites involved in nuptial swarming is to`,
    options: [
      "provide birds with plenty of food",
      "ensure their perpetuation despite predatory pressure",
      "search for a favourable place to breed",
      "ensure that every individual gets a mate",
    ],
    answer: `provide birds with plenty of food`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-49",
    question: `The use and disuse of body parts and the inheritance of acquired traits were used to explain`,
    options: [
      "Darwin's theory",
      "Lamarek's theory",
      "genetic drift",
      "gene flow",
    ],
    answer: `Darwin's theory`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2012-50",
    question: `From his study of Galapagos finches, Darwin derived his theory of evolution from`,
    options: [
      "comparative anatomy",
      "comparative physiology",
      "fossil remains",
      "comparative embryology Page 19",
    ],
    answer: `comparative anatomy`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2012,
  }),

  createQuestion({
    id: "biology-2013-1",
    question: `Which Question Paper Type of Biology is given to you?`,
    options: ["Type D", "Type I", "Type B", "Type U"],
    answer: `Type B`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-2",
    question: `The process in which complex substances are broken down into simpler ones is referred to as`,
    options: ["anabolism", "catabolism", "metabolism", "tropism"],
    answer: `catabolism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-3",
    question: `The organ which is sensitive to light in Euglena is the`,
    options: ["gullet", "flagellum", "chloroplast", "eyespot"],
    answer: `eyespot`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-4",
    question: `The organelles present in cells that are actively respiring and photosynthesizing are`,
    options: [
      "lysosomes and ribosomes",
      "Golgi apparatus and endoplasmic reticulum",
      "nucleus and centrioles",
      "mitochondria and chloroplast",
    ],
    answer: `mitochondria and chloroplast`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-5",
    question: `Taenia solium can be found in`,
    options: ["cow", "goat", "dog", "pig"],
    answer: `pig`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-6",
    question: `The structure labelled II is the`,
    options: ["spermathecal pore", "cocoon", "clitellum", "chaetae"],
    answer: `clitellum`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-7",
    question: `The organism is found in soils rich in`,
    options: ["mud", "humus", "clay", "sand"],
    answer: `humus`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-8",
    question: `Which of the following describes a characteristic of arthropods?`,
    options: [
      "The organism finds it easy to grow freely",
      "the organism has a pair of jointed appendages",
      "the body is not divided into a number of segments seg",
      "the body is covered by chitin",
    ],
    answer: `the body is covered by chitin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-9",
    question: `Which of the following distinguishes a butterfly from a moth?`,
    options: [
      "the wings of butterfly rest horizontally but those of moth rest vertically",
      "Both are active during the day",
      "they have similar antennae",
      "the abdomen of moth is fatter than that of butterfly",
    ],
    answer: `the wings of butterfly rest horizontally but those of moth rest vertically`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-10",
    question: `Which of the following types of feathers is used for flight in birds?`,
    options: ["Quill", "Filo plume", "Covert", "Down"],
    answer: `Quill`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-11",
    question: `The plants that grow in deserts or very dry areas are referred to as`,
    options: ["mesophytes", "hydrophytes", "epiphytes", "xerophytes Page 21"],
    answer: `xerophytes Page 21`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-12",
    question: `Which of the following is the simplest living organism?`,
    options: ["Paramecium", "Virus", "Amoeba", "Chlamydomonas"],
    answer: `Amoeba`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-13",
    question: `Proboscis is a structure that is mostly found in`,
    options: ["insects", "tapeworms", "amphibians", "molluscs"],
    answer: `insects`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-14",
    question: `The structural adaptation of desert plants for water conservation is`,
    options: [
      "broad leaves with numerous stomata",
      "spongy mesophyll",
      "spiny leaves",
      "prominent stomata in leaves",
    ],
    answer: `spiny leaves`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-15",
    question: `The long and sharp clawed feet of birds is an adaptation for`,
    options: [
      "crushing seeds",
      "scooping mud",
      "tearing flesh",
      "grasping prey",
    ],
    answer: `grasping prey`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-16",
    question: `During the manufacture of food by plants, which of the following organism use energy from the sun?`,
    options: [
      "anabaena",
      "sulphur bacteria",
      "Nitrosomonas sp.",
      "Nitrobacter sp.",
    ],
    answer: `anabaena`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-17",
    question: `Movement of minerals and chemical compounds with a plant occurs during`,
    options: ["osmosis", "translocation", "transpiration", "diffusion"],
    answer: `translocation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-18",
    question: `The enzyme that is present in the saliva is`,
    options: ["rennin", "lipase", "pepsin", "ptyalin"],
    answer: `ptyalin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-19",
    question: `Plants that have special devices for trapping and digesting insects are`,
    options: ["carnivorous", "symbiotic", "parasitic", "saprophytic"],
    answer: `carnivorous`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-20",
    question: `The process of transforming the chemical energy of cellular fuels into the high energy bonds of ATP in plants is`,
    options: ["autotropism", "photosynthesis", "photolysis", "respiration"],
    answer: `respiration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-21",
    question: `Fungi are referred to as hetotrophs because they`,
    options: [
      "are filamentous",
      "lack chlorophyll",
      "have mycelium",
      "lack roots",
    ],
    answer: `lack chlorophyll`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-22",
    question: `An example of a parasitic protozoan is`,
    options: ["Paramecium", "Plasmodium", "Euglena", "Chlamydomonas"],
    answer: `Plasmodium`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-23",
    question: `Which blood cell are involved in the immune response of vertebrates?`,
    options: ["Phagoecytes", "lymphocytes", "erythrocytes", "monocytes"],
    answer: `Phagoecytes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-24",
    question: `The blood circulatory system of vertebrates consists of`,
    options: [
      "heart, arteries, capillaries and veins",
      "heart, aorta, capillaries and veins",
      "heart, aorta, arteries and veins Page 22",
      "heart, vena cava, arteries, and veins",
    ],
    answer: `heart, arteries, capillaries and veins`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-25",
    question: `A plant tissue that carries water and mineral salts is the`,
    options: ["cambium", "xylem", "cortex", "phloem"],
    answer: `xylem`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-26",
    question: `Which of the following helps in the clotting of blood?`,
    options: ["Red blood cells", "White blood cells", "Plasma", "Platelets"],
    answer: `Red blood cells`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-27",
    question: `Which of the following forms about 55% of the volume of the blood in man?`,
    options: ["leucocytes", "platelets", "plasma", "erythrocytes"],
    answer: `leucocytes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-28",
    question: `The part of the mammalian skin involved in excretion is the`,
    options: [
      "sweat glands",
      "Malpighian layer",
      "sebaceous gland",
      "horny layer",
    ],
    answer: `sweat glands`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-29",
    question: `Which of the following is a waste product of an insect?`,
    options: ["Alkaloids", "Uric acid", "Sweat", "Mucilage"],
    answer: `Alkaloids`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-30",
    question: `The main structure in vertebrates that supports and protects the body is the`,
    options: ["skeleton", "ligament", "muscle", "joint"],
    answer: `skeleton`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-31",
    question: `The chitin in the exoskeleton of many arthropods is strengthened by`,
    options: ["lids", "proteins", "calcium compounds", "organic salt"],
    answer: `lids`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-32",
    question: `The transfer of pollen grains from the anther to a sigma is`,
    options: ["propagation", "placentation", "pollination", "fertilization"],
    answer: `propagation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-33",
    question: `The male reproductive organ of a flower is the`,
    options: ["carpel", "stamen", "petal", "sepal"],
    answer: `carpel`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-34",
    question: `The gland that is found just below the hypothalamus is the`,
    options: ["parathyroid", "adrenal", "pituitary", "thyroid"],
    answer: `parathyroid`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-35",
    question: `The most important plant hormone is`,
    options: ["cytokinin", "abscisic acid", "auxin", "gibberellin"],
    answer: `cytokinin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-36",
    question: `The sensory cell that responds to dim light is referred to as the`,
    options: ["cone", "lens", "rod", "iris"],
    answer: `cone`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-37",
    question: `The absence of anti -diuretic hormone in humans results in`,
    options: [
      "decreasing dehydration",
      "drastic dehydration Page 23",
      "eliminating dehydration",
      "increasing dehydration",
    ],
    answer: `decreasing dehydration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-38",
    question: `Oestrogen is a hormone that is synthesized in the`,
    options: ["ovaries", "testes", "anterior pituitary", "adrenal cortex"],
    answer: `ovaries`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-39",
    question: `The eye defect cause by the development of cloudy areas in the lenses is`,
    options: ["presbyopia", "glaucoma", "cataract", "astigmatism"],
    answer: `presbyopia`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-40",
    question: `A pollutant that is biodegradable is`,
    options: ["crude oil", "heavy metals", "cellophane", "sewage"],
    answer: `crude oil`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-41",
    question: `A tropical disease caused by Trypanosoma is`,
    options: [
      "sleeping sickness",
      "river blindness",
      "yellow fever",
      "malaria",
    ],
    answer: `sleeping sickness`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-42",
    question: `The solid part of the ecosystem is referred to as the`,
    options: ["atmosphere", "hydrosphere", "biosphere", "lithosphere"],
    answer: `atmosphere`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-43",
    question: `Which of the following is caused by Treponema palladium?`,
    options: ["Gonorrhoea", "Leprosy", "Tuberculosis", "Syphilis"],
    answer: `Gonorrhoea`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-44",
    question: `To which blood group do universal recipients belong?`,
    options: ["B", "A", "O", "AB"],
    answer: `B`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-45",
    question: `The clumping together of red blood cells is`,
    options: ["agglutination", "fusion", "transfusion", "compatibility"],
    answer: `agglutination`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-46",
    question: `Physiological adaptation to very dry conditions in animals demonstrates`,
    options: ["rejuvenation", "xeromorphism", "hibernation", "aestivation"],
    answer: `rejuvenation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-47",
    question: `One of adaptation of Cactus opuntia to conserve water is the reduction of`,
    options: ["internodes", "stem to leaves", "leaves to spine", "flower size"],
    answer: `internodes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-48",
    question: `Which of the following structure is adapted for feeding in a bird of prey?`,
    options: [
      "Hooked break and sharp claws",
      "Smooth beak and strong claws",
      "Big beaks and strong feet",
      "Pointed beak and strong claws",
    ],
    answer: `Hooked break and sharp claws`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-49",
    question: `The special pigment for colour change in chameleon is`,
    options: ["melanin", "carotenoid", "chromatin", "chromatophore"],
    answer: `melanin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2013-50",
    question: `The behavioural adaptation in social insects could best be described as`,
    options: [
      "symbiosis Page 24",
      "saprophytism",
      "parasitism",
      "commensalisms Page 25",
    ],
    answer: `symbiosis Page 24`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2013,
  }),

  createQuestion({
    id: "biology-2014-1",
    question: `Which Question paper Type of Biology is given to you?`,
    options: [
      "Type F",
      "Type E",
      "Type L",
      "Type S Use the diagram below to answer and",
    ],
    answer: `Type L`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-2",
    question: `The part labelled II is the`,
    options: ["nucleus", "eyespot", "basal granule", "contractile vacuole"],
    answer: `contractile vacuole`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-3",
    question: `The part responsible for photosynthesis is labelled`,
    options: ["III", "IV", "I", "II"],
    answer: `III`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-4",
    question: `The lowest level of organization in living organisms is`,
    options: ["organ", "cell", "system", "tissue"],
    answer: `cell`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-5",
    question: `Which of the following is the most complex according to their cellular level of organization?`,
    options: [
      "Heart",
      "Hair Use the diagram below to answer questions 6 and 7",
    ],
    answer: `Hair Use the diagram below to answer questions 6 and 7`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-6",
    question: `The organs for attachments to the lining of the host's intestine are labelled`,
    options: ["II and III", "III and IV", "I and II", "I and III"],
    answer: `II and III`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-7",
    question: `The young proglottid is represented by`,
    options: ["III", "IV", "I", "II"],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-8",
    question: `Which of the following organisms is multi-cellular?`,
    options: ["Chlamydomonas", "Spirogyra", "Amoeba", "Euglena"],
    answer: `Spirogyra`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-9",
    question: `In bryophytes, sex organs are produced in the`,
    options: ["protonema", "sporophyte", "gametophyte", "rhizoid Page 27"],
    answer: `gametophyte`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-10",
    question: `Seed plants are the most dominant vegetation on land because of`,
    options: [
      "their motile gametes",
      "their ability to photosynthesize",
      "efficient seed dispersal",
      "availability of water",
    ],
    answer: `efficient seed dispersal`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-11",
    question: `Which of the following is an arboreal organism?`,
    options: [
      "Elephant",
      "Fish",
      "Antelope",
      "Bird Use the diagram below to answer questions 12 and 13",
    ],
    answer: `Bird Use the diagram below to answer questions 12 and 13`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-12",
    question: `The part labelled I is the`,
    options: ["xylem", "phloem", "root hairs", "cortex"],
    answer: `root hairs`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-13",
    question: `The diagram is the transverse section of a`,
    options: [
      "monocotyledonous stem",
      "dicotyledonous stem",
      "monocotyledonous root",
      "dicotyledonous root",
    ],
    answer: `dicotyledonous root`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
    image: "../images/biology_2014_13.svg",
  }),

  createQuestion({
    id: "biology-2014-3",
    question: `The general formula above represents that of`,
    options: ["an omnivore", "a detritus feeder", "a carnivore", "a herbivore"],
    answer: `an omnivore`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-15",
    question: `A circulatory system is very essential in mammals but not in smaller organisms like Amoeba because`,
    options: [
      "amoeba lives in freshwater",
      "diffusion is sufficient to transport materials in Amoeba",
      "amoeba lacks blood containing haemoglobin",
      "amoeba exhibits anaerobic respiration",
    ],
    answer: `amoeba lives in freshwater`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-16",
    question: `In vascular plants, the sieve tubes and companion cells are present in the`,
    options: ["cambium", "cortex", "xylem", "phloem"],
    answer: `cambium`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-17",
    question: `The stomata of leaves are similar in function to the`,
    options: [
      "pharynx of humans",
      "scales of fish",
      "spiracle of insects",
      "trachea of toads",
    ],
    answer: `pharynx of humans`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-18",
    question: `The use of moist skin for respiration in amphibians is known as`,
    options: [
      "cellular respiration",
      "cutaneous respiration",
      "buccal respiration",
      "pulmonary respiration",
    ],
    answer: `cellular respiration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-19",
    question: `Water in plants is removed as water vapour through the process of`,
    options: ["diffusion", "osmosis", "evaporation", "transpiration"],
    answer: `diffusion`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-20",
    question: `An example of an organ of perennation in plants is`,
    options: ["rhizome", "seed", "petal of a flower", "calyx of flower"],
    answer: `rhizome`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-21",
    question: `Alternation of generation is a feature shown in`,
    options: ["mosses", "fungi", "grasses", "conifers Page 28"],
    answer: `mosses`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-22",
    question: `I. Growth is mainly apical II. Growth is specific with definite shape III. Growth is throughout life. Which of the above correctly describes the growth pattern in plants?`,
    options: [
      "I, II and III only",
      "II and III only",
      "I and II only",
      "I and III only",
    ],
    answer: `I, II and III only`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-23",
    question: `Coordination and regulation of body activities in mammals are achieved by the`,
    options: [
      "nerves and muscle",
      "nerves and hormones",
      "nerves only",
      "hormones only",
    ],
    answer: `nerves and muscle`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-24",
    question: `The Cerebellum of the Brain controls`,
    options: [
      "reflex action",
      "muscular activity",
      "emotional expressions",
      "the Endocrine system",
    ],
    answer: `reflex action`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-25",
    question: `The part of the brain responsible for peristalsis is the`,
    options: [
      "Olfactory Lobe",
      "Medulla Oblongata",
      "Hypothalamus",
      "Thalamus",
    ],
    answer: `Olfactory Lobe`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-26",
    question: `Which of the following instruments is used for measuring atmospheric pressure?`,
    options: ["Hydrometer", "Hygrometer", "Thermometer", "Barometer"],
    answer: `Hydrometer`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-27",
    question: `The influence of soil on organisms in a habitat is referred to as`,
    options: ["edaphic", "physiographic", "biotic", "topographic"],
    answer: `edaphic`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-28",
    question: `The genetic make -up of an organism is described as`,
    options: ["allele", "chromosome", "phenotype", "genotype"],
    answer: `allele`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-29",
    question: `The major limiting factor of productivity in the aquatic habitat is`,
    options: ["food", "temperature", "water", "sunlight"],
    answer: `food`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-30",
    question: `Which of the following group of organisms feeds directly on green plants?`,
    options: [
      "Primary Consumers",
      "Secondary Consumers",
      "Producers",
      "Decomposers",
    ],
    answer: `Primary Consumers`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-31",
    question: `A characteristic feature of tropical rainforest is that it`,
    options: [
      "Contains trees with narrow leaves",
      "Contains large number of plant species",
      "Contains fewer number of plant species",
      "Has total annual rainfall of less than 50cm",
    ],
    answer: `Contains trees with narrow leaves`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-32",
    question: `The study of how and why population size change over time is`,
    options: [
      "Population estimation",
      "Population dynamics",
      "Population ecology",
      "Population Cycle",
    ],
    answer: `Population estimation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-33",
    question: `A severe and long dry season is a characteristic feature of`,
    options: [
      "Sahel Savanna",
      "Mangrove Swamps",
      "Sudan Savanna",
      "Guinea Savanna",
    ],
    answer: `Sahel Savanna`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-34",
    question: `Which of the following is a nitrogen - fixing blue -green algae of soil?`,
    options: ["Rhizobium", "Nitrosomonas", "Clostridium", "Anabaena"],
    answer: `Rhizobium`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-35",
    question: `The soil with highest water -retaining capacity is`,
    options: ["Clayey Soil Page 29", "Stoney soil", "Sandy soil", "Loamy Soil"],
    answer: `Clayey Soil Page 29`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-36",
    question: `The causative agent of Poliomyelitis is`,
    options: ["Virus", "Fungus", "Protozoan", "Bacterium"],
    answer: `Virus`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-37",
    question: `One of the ways of controlling noise pollution in urban areas is`,
    options: [
      "by siting industries away from residential areas",
      "that fuel should be completely combusted by engines",
      "by planting trees on both sides of the road",
      "by wearing ear devices",
    ],
    answer: `by siting industries away from residential areas`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-38",
    question: `A constituent of the exhaust fumes from electricity generating sets which causes serious pollution is`,
    options: [
      "Carbon (II) Oxide",
      "Water Vapour",
      "Ozone",
      "Carbon (IV) Oxide",
    ],
    answer: `Carbon (II) Oxide`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-39",
    question: `Which of the following is true of small pox?`,
    options: [
      "It is transmitted by bacteria",
      "It can effectively be controlled with antibiotics",
      "It can effectively be controlled by vaccination",
      "It is a water -borne infection",
    ],
    answer: `It is transmitted by bacteria`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-40",
    question: `A pollutant that is mostly associated with acid rain is`,
    options: ["Nitrogen (IV) Oxide", "Ozone", "Fluorine"],
    answer: `Nitrogen (IV) Oxide`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-41",
    question: `When the adults have reach a certain degree of weakness, the process of binary fission is replaced by conjugation in`,
    options: ["Paramecium", "Euglena", "Amoeba", "Plasmodium"],
    answer: `Paramecium`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-42",
    question: `Whorls, arches, loops and compounds are types of variation in`,
    options: ["Colour", "Finger prints", "Hair Colour", "Blood group"],
    answer: `Colour`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-43",
    question: `A couple has 10 children, all female. Which of the following best explains the situation?`,
    options: [
      "The sex determination was by the man's X chromosome",
      "The man's sperm count is low",
      "The woman is not capable of producing male children",
      "The sex determination was by the man's Y chromosome",
    ],
    answer: `The sex determination was by the man's X chromosome`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-44",
    question: `A biological agent with antiviral property is`,
    options: ["Interferon", "enzyme", "antibiotic", "disinfectant"],
    answer: `Interferon`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-45",
    question: `One of the advantages of outbreeding is`,
    options: [
      "pests tolerance",
      "disease resistance",
      "fast growth",
      "tall height",
    ],
    answer: `pests tolerance`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-46",
    question: `An individual with blood group AB can receive blood from those in blood group(s)`,
    options: ["A, B, AB, O", "A, AB and O only", "AB only", "A and B only"],
    answer: `A, B, AB, O`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-47",
    question: `The stream -lined shape of fishes is an adaptation for`,
    options: [
      "Securing mates",
      "easy movement",
      "obtaining food",
      "defence and attack",
    ],
    answer: `Securing mates`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-48",
    question: `An example of a poikilothermic organism is a`,
    options: ["Lizard", "Cockroach", "rabbit", "bird Page 30"],
    answer: `Lizard`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2014-50",
    question: `Adaptive radiation is illustrated in`,
    options: [
      "modified insect mouthparts",
      "dentition in mammals",
      "wings in birds and bats",
      "appendages in insects Page 31",
    ],
    answer: `modified insect mouthparts`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2014,
  }),

  createQuestion({
    id: "biology-2015-1",
    question: `Which of the following has the most primitive respiratory system?`,
    options: ["insect", "fish", "snail", "mouse"],
    answer: `insect`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-2",
    question: `One adaptation shown by hydrophytes in fresh water habitats is the`,
    options: [
      "waxy cuticle on shoot surface",
      "poor development of roots and xylem tissues",
      "well-developed roots and supporting system",
      "leaves reduced to spines",
    ],
    answer: `waxy cuticle on shoot surface`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-3",
    question: `Which of the following use diffusion as the principal method of gaseous exchange?`,
    options: ["grasshopper", "rat spines", "lizard", "earthworm"],
    answer: `grasshopper`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-4",
    question: `The theory which supports the view that the large muscles developed by an athlete will be passed on to the offspring was proposed by`,
    options: ["Mendel", "Darwin", "Lamark", "Pasteur"],
    answer: `Mendel`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-5",
    question: `The chromosomes of members of the kingdom Monera are within the`,
    options: ["nucleoplasm", "nucleus", "nucleolus", "cytoplasm"],
    answer: `nucleoplasm`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-6",
    question: `The mangrove swamp in Nigeria is restricted to the`,
    options: [
      "Sahel savanna",
      "Guinea savanna",
      "Tropical rainforest",
      "Sudan savanna",
    ],
    answer: `Sahel savanna`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-7",
    question: `The pancrease secretes enzymes for the digestion of`,
    options: [
      "fats, proteins and carbohydrates",
      "fats, vitamins and cellulose",
      "fats, carbohydrates and vitamins",
      "proteins, cellulose and minerals",
    ],
    answer: `fats, proteins and carbohydrates`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-8",
    question: `The causative agent of bird flu is a`,
    options: ["protozoan", "virus", "bacterium", "fungus"],
    answer: `protozoan`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-9",
    question: `A water medium is necessary for fertilization in`,
    options: ["conifers", "angiosperms", "ferns", "fungi"],
    answer: `conifers`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-10",
    question: `An example of a sex -linked trait is the`,
    options: [
      "colour of the skin in humans",
      "ability to roll the tongue",
      "possession of facial hair in adult humans",
      "ability to grow. long hair in females",
    ],
    answer: `colour of the skin in humans`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-11",
    question: `In which of the following Nigerian states can montane vegetation be found?`,
    options: ["Bauchi", "Plateau", "Taraba", "Enugu"],
    answer: `Bauchi`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-12",
    question: `Which of the following is true of cloning?`,
    options: [
      "it is welcomed as an ethically and normally sound science",
      "it involves the asexual multiplication of the tissues of the original organism",
      "the clone is similar to but not exactly like the original organism",
      "only one cell of the o riginal organism is needed to imitate the process Page 33",
    ],
    answer: `it is welcomed as an ethically and normally sound science`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-13",
    question: `The process of shedding the exoskeleton of an arthropod is known as`,
    options: ["ecdysis", "in star formation", "metamorphosis", "osmosis"],
    answer: `ecdysis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-14",
    question: `Which of the following is a major cause of constipation in humans?`,
    options: ["lack of roughage", "vitamin B", "vitamin E", "lack of salts"],
    answer: `lack of roughage`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-15",
    question: `In mammals, the organ directly on top of the kidney is the`,
    options: ["adrenal gland", "prostate gland", "pancrease", "thyroid gland"],
    answer: `adrenal gland`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-16",
    question: `An accurate identification of a rapist can be carried out by conducting a`,
    options: [
      "RNA analysis",
      "blood group test",
      "behavioural traits test",
      "DNA analysis",
    ],
    answer: `RNA analysis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-17",
    question: `An example of a fish that aestivates is`,
    options: ["croaker", "lung fish", "shark", "cat fish"],
    answer: `croaker`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-18",
    question: `The opening and closing of the stoma are regulated by`,
    options: ["respiration", "osmosis", "diffusion", "transpiration"],
    answer: `respiration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-19",
    question: `Which of the following is common to the mosquito, housefly and blackfly?`,
    options: [
      "they are parasites of man",
      "their immature stages are aquatic",
      "they undergo complete metamorphosis",
      "their adults have two pairs of wings",
    ],
    answer: `they are parasites of man`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-20",
    question: `The organs that will be most useful to giant African rats in finding their way in underground habitats are the`,
    options: ["nostrils", "eyes", "vibrissae", "tails"],
    answer: `nostrils`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-22",
    question: `The waste product of plants used in the conversion of hide to leather is`,
    options: ["alkaloid", "resin", "tannin", "gun"],
    answer: `alkaloid`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-23",
    question: `The correct sequence of the movement of urea during formation is`,
    options: [
      "glomerulus - Bowman's capsule - convoluted tubule - Henle's loop - collecting tubule",
      "convoluted tubule - glomerulus - Henle's loop - Bowman's capsule - collecting tubule",
      "glomerulus - Bowman's capsule - convoluted tubule - Henle's loop collecting tubule Page 34",
      "convoluted tubule - Bowman's capsule - Henle's loop -glomerulus - collecting tubule",
    ],
    answer: `glomerulus - Bowman's capsule - convoluted tubule - Henle's loop - collecting tubule`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-24",
    question: `In lizards, the lowing of the gular fold is used to`,
    options: [
      "defend their territory",
      "attract mates",
      "frighten enemies",
      "catch insects",
    ],
    answer: `defend their territory`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-25",
    question: `The photosynthetic pigments include`,
    options: [
      "chloroplast and cytochromes",
      "melanin and haemoglobin",
      "chlorophyll and carotenoids",
      "carotenoids and haemoglobin",
    ],
    answer: `chloroplast and cytochromes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-26",
    question: `The highest level of ecological organization is the`,
    options: ["ecosystem", "niche", "biosphere", "population"],
    answer: `ecosystem`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-27",
    question: `A biotic factor which affects the distribution and abundance of organism in a terrestrial habitat is`,
    options: ["pH", "competition", "temperature", "light"],
    answer: `pH`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-28",
    question: `The eye defect that rises because the cornea is not curved smoothly is`,
    options: [
      "astigmatism",
      "short-sightedness",
      "long-sightedness",
      "presbyopia",
    ],
    answer: `astigmatism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-29",
    question: `Which of the following is an example of parasitism?`,
    options: [
      "a squirrel living in an abandoned nest of a bird",
      "mistletoe growing on an orange tree",
      "fungi growing on a dead tree branch",
      "cattle egrets taking tasks from the body of cattle",
    ],
    answer: `a squirrel living in an abandoned nest of a bird`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-30",
    question: `The increasing order of the particle size in the following soil types is`,
    options: [
      "cattle sand – clay-gravel",
      "clay - silt sand – gravel",
      "silt - clay - sand - gravel",
      "clay - sand - silt – gravel",
    ],
    answer: `cattle sand – clay-gravel`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-31",
    question: `Which of following factors can bring about competition population?`,
    options: [
      "emigration",
      "drought",
      "mortality",
      "dispersion Stunted growth and poor root development are a result of a deficiency in",
    ],
    answer: `emigration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-33",
    question: `The cell organelle solely responsible for respiration is the`,
    options: ["nucleus", "nucleolus", "endoplasmic reticulum", "mitochondrion"],
    answer: `nucleus`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-34",
    question: `The organelle responsible for heredity is Page 35`,
    options: [
      "IV",
      "I",
      "II",
      "III Use the diagram below to answer questions 35 and",
    ],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-35",
    question: `The process illustrated is`,
    options: [
      "gametogenesis",
      "sexual reproduction in Rhizopus",
      "sexual reproduction in Spirogyra",
      "sporulation",
    ],
    answer: `gametogenesis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-36",
    question: `The structure labelled I is the`,
    options: [
      "zygospore",
      "conidiophore",
      "sporangium",
      "hypha Use the diagram below to answer questions 37 and",
    ],
    answer: `zygospore`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-37",
    question: `The organelle responsible for sexual reproduction is`,
    options: ["IV", "I", "II", "III"],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-38",
    question: `The part labelled IV is responsible for`,
    options: [
      "respiration",
      "ingestion",
      "locomotion",
      "osmoregulation Use the diagram below to answer questions 39 and",
    ],
    answer: `respiration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-39",
    question: `The part labelled I is the`,
    options: ["pulmonary artery", "bicuspid valve", "aorta", "vena carva"],
    answer: `pulmonary artery`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-40",
    question: `Oxygenated blood is pumped to the entire body from the part labelled`,
    options: [
      "IV",
      "I",
      "II",
      "III Use the diagram below to answer questions 41 and",
    ],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-41",
    question: `The experiment demonstrates`,
    options: ["hydrotropism", "phototropism", "thigmotropism", "hydrotropism"],
    answer: `hydrotropism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-42",
    question: `The part marked I will contain a high concentration of Page 36`,
    options: [
      "ethylene",
      "abscisic acid",
      "auxin",
      "ascorbic acid Use the diagram below to answer questions 43 and 44",
    ],
    answer: `ethylene`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-43",
    question: `The breeding posture illustrated in the diagram is known as`,
    options: ["reproductive swimming", "amplexus", "mating", "courtship"],
    answer: `reproductive swimming`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
    image: "../images/biology_2015_43.svg",
  }),

  createQuestion({
    id: "biology-2015-44",
    question: `The diagram shows that the organisms are`,
    options: ["viviparous", "hermaphrodite", "ovoviviparous", "oviparous"],
    answer: `viviparous`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
    image: "../images/biology_2015_44.svg",
  }),

  createQuestion({
    id: "biology-2015-45",
    question: `Insulin is produced by the endocrine organ labeled`,
    options: ["I", "IV", "III", "II"],
    answer: `I`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-46",
    question: `Which of the following will be true of dog II which lost its tail in an accident if it mates with dog III?`,
    options: [
      "all its offspring will be born without tails",
      "3/4 of its offspring will be born without tails",
      "none of its offspring will be born without a tail",
      "1/4 of its offspring will be born without tails.",
    ],
    answer: `all its offspring will be born without tails`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-47",
    question: `If the dogs are offspring of a monohybrid cross and the gene G for grey head is dominant over as illele g, the individual whose genotype is likely to be gg is`,
    options: [
      "I",
      "IV",
      "III",
      "II Use the diagram below to answer questions 48 and 49 .",
    ],
    answer: `III`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-48",
    question: `The type of protective adaptation exhibited by the animal is`,
    options: [
      "flash coloration",
      "countershading colouration",
      "warning colouration",
      "disruptive colouration",
    ],
    answer: `warning colouration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2015-49",
    question: `The structure labeled I is`,
    options: [
      "tactile",
      "radiosensitive",
      "photosensitive",
      "chemoreceptive Page 37",
    ],
    answer: `radiosensitive`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2015,
  }),

  createQuestion({
    id: "biology-2016-1",
    question: `Which of the following structures is a protective adaptive feature of the Agama Lizard to the environment?`,
    options: ["Nuchal crest", "Claws", "Scaly skin", "Gular fold."],
    answer: `Scaly skin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-2",
    question: `Which of the following adapts an insect for feeding?`,
    options: [
      "suitable mouthparts",
      "paired antennae",
      "segmented body",
      "jointed appendages",
    ],
    answer: `suitable mouthparts`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-3",
    question: `Which of the following results from the cross between Yy and Yy?`,
    options: ["2Yy-2yy", "2Yy:yy:YY", "YY:2Yy:yy", "YY: Yy:2yy"],
    answer: `YY:2Yy:yy`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-4",
    question: `Which of the following is NOT part of the carbon cycle?`,
    options: [
      "Organic carbon",
      "Decomposition",
      "Nitrates formation",
      "Photosynthesis",
    ],
    answer: `Nitrates formation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-5",
    question: `I. Tissues II. System III. Cell IV. Organs Which of the above is the level of organization of a leaf?`,
    options: ["IV", "I.", "III.", "II."],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-6",
    question: `In cellular respiration, energy is stored in the form of`,
    options: [
      "heat energy",
      "adenosine diphosphate",
      "adenosine monophosphate",
      "adenosine triphosphate",
    ],
    answer: `adenosine triphosphate`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-7",
    question: `The principal organ for the manufacture of food in autotrophy is the`,
    options: ["root hair", "growing root", "mature fruit", "green leaf"],
    answer: `green leaf`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-8",
    question: `A disease that results from lack of iodine in the diet of humans is`,
    options: ["beriberi", "scurvy", "rickets", "goiter"],
    answer: `goiter`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-9",
    question: `The process whereby some organism with certain favourable features get established in an area is`,
    options: [
      "gene mutation",
      "dispersal",
      "overcrowding",
      "natural selection",
    ],
    answer: `natural selection`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-10",
    question: `The rise and fall of ocean water during the day is referred to as`,
    options: ["gravity", "a pull", "tide", "zone"],
    answer: `tide`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-11",
    question: `Which of the following is a producer in an aquatic habitat?`,
    options: ["Nymphaea", "Dryopteris", "planarian", "Similium"],
    answer: `planarian`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-12",
    question: `The relationship that exist between a shark and Remora is`,
    options: [
      "parasitism",
      "commensalism",
      "saprophytism",
      "symbiosis Page 39",
    ],
    answer: `commensalism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-13",
    question: `I. Tissue II. System III. Cell IV Organ The correct sequence of increasing level of complexity is`,
    options: ["IV-II-III", "I-II-III-IV", "IV-III-I-II", "III-I-IV-II"],
    answer: `III-I-IV-II`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-14",
    question: `Which of the following is not an inheritable disease?`,
    options: [
      "Poliomyelitis",
      "Sickle -cell anaemia",
      "Mental illness",
      "Haemophilia",
    ],
    answer: `Poliomyelitis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-15",
    question: `Which of the finger print types occur most frequently in the population of human beings`,
    options: ["Double -loop", "Whorl", "Arch", "Loop"],
    answer: `Whorl`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-16",
    question: `Beriberi results from a deficiency of`,
    options: ["vitamin A", "vitamin E.", "vitamin B", "vitamin C"],
    answer: `vitamin E.`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-17",
    question: `Bacteria which add atmospheric nitrogen to the soil are`,
    options: [
      "putrefying bacteria",
      "nitrifying bacteria",
      "nitrogen fixing bacteria",
      "denitrifying bacteria",
    ],
    answer: `nitrogen fixing bacteria`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-18",
    question: `The spines of the hedgehog is an adaptive features for`,
    options: ["Courtship", "defence", "water conservation", "obtaining food"],
    answer: `water conservation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-19",
    question: `The dental formula of carnivores is represented by`,
    options: [
      "I 0⁄3, C 1⁄1, pm 4⁄4, m 2⁄3",
      "I 0⁄2, C 1⁄1, pm 4⁄4, m 2⁄4",
      "I 2⁄3, C 2⁄1, pm 3⁄4, m 2⁄3",
      "I 3⁄3, C 1⁄1, pm 4⁄4, m 2⁄2",
    ],
    answer: `I 0⁄2, C 1⁄1, pm 4⁄4, m 2⁄4`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-20",
    question: `Which of the following instruments is used to measure temperature?`,
    options: ["Thermometer", "Hygrometer", "Anemometer", "Hydrometer"],
    answer: `Anemometer`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-21",
    question: `In human, puffiness and water retention in the body is a possible symptom of`,
    options: [
      "bladder malfunction",
      "poor digestion",
      "kidney malfunction",
      "obesity",
    ],
    answer: `bladder malfunction`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-22",
    question: `The theory of evolution which postulates that all living organisms have a common ancestor was proposed by`,
    options: ["Linnaeus", "Darwin", "Lamarck", "Mendel"],
    answer: `Lamarck`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-23",
    question: `Mammals requires roughage in their food to`,
    options: [
      "provide energy",
      "slow down aging",
      "ease digestion",
      "prevent disease",
    ],
    answer: `slow down aging`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-24",
    question: `Variation can occur among offspring of living organism because`,
    options: [
      "seeds are produced by self-pollination",
      "zygotes are produced by cross fertilisation",
      "they are produced by binary fission",
      "they are produced without fertilisation Page 40",
    ],
    answer: `they are produced by binary fission`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-25",
    question: `The most important biotic factors which affect plants and animals in the habitat are`,
    options: [
      "temperature and rainfall",
      "temperature and turbidity",
      "salinity and relative humidity",
      "rainfall and relative humidity",
    ],
    answer: `temperature and turbidity`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-26",
    question: `The lowest unit of classification is the`,
    options: ["Kingdom", "class", "phylum", "species"],
    answer: `Kingdom`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-27",
    question: `Two important process involved in the absorption and transport of materials in plants are`,
    options: [
      "flaccidity and turgidity",
      "diffusion and plasmolysis",
      "plasmolysis and capillarity",
      "osmosis and diffusion",
    ],
    answer: `osmosis and diffusion`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-28",
    question: `A series of organism existing in an ecosystem through which energy is transformed can be referred to as`,
    options: ["food cycle", "food chain", "pyramid on numbers", "food web"],
    answer: `food web`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-29",
    question: `The cell organelle solely responsible for respiration is the`,
    options: ["nucleus", "nucleolus", "endoplasmic reticulum", "mitochondrion"],
    answer: `endoplasmic reticulum`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-30",
    question: `In which part of Nigeria are Mangrove swamps found?`,
    options: ["Chad Basin", "Niger Delta", "Benue Valley", "Mambilla Plateau"],
    answer: `Mambilla Plateau`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-31",
    question: `The breeding methods that are useful in selective breeding of animals and plants are`,
    options: [
      "inbreeding and cross - breeding",
      "inbreeding and hetero -breeding",
      "inbreeding and out-breeding",
      "inbreeding and self-breeding",
    ],
    answer: `inbreeding and hetero -breeding`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-32",
    question: `In a small unicellular organism, diffusion is sufficient for transport because`,
    options: [
      "the surface area to volume ratio is small",
      "they have lungs for diffusion",
      "materials have to move over long distance",
      "the surface area to volume ratio is large",
    ],
    answer: `materials have to move over long distance`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-33",
    question: `The function of the spinal cord is to`,
    options: [
      "stand the body structure erect",
      "control involuntary actions",
      "transmit impulses to the brain",
      "regulates developmental changes",
    ],
    answer: `regulates developmental changes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-34",
    question: `The first vertebrates to ventures out of water and lives on land are the`,
    options: ["Pisces", "Amphibians", "Reptiles", "Aves"],
    answer: `Reptiles`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-35",
    question: `Which of the following factors mostly determine the major biomes of the world.`,
    options: [
      "pressure and wind speed",
      "temperature and wind speed",
      "pressure and rainfall",
      "Temperature and rainfall",
    ],
    answer: `temperature and wind speed`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-36",
    question: `I. Strong winds II. high temperature III. Dry and porous soils. Which group of plants are specially adapted to grow under environmental conditions stated above?`,
    options: [
      "Thallophytic",
      "Mesophytes",
      "Xerophytes",
      "Hydrophytes Page 41",
    ],
    answer: `Hydrophytes Page 41`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-37",
    question: `The lowest unit of a biogeographical plant species is`,
    options: ["micro flora", "macro fauna", "micro fauna", "macro flora"],
    answer: `micro fauna`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-38",
    question: `Which of the following is rich source of vitamin K?`,
    options: ["Tomato", "Guava", "Milk", "Onion"],
    answer: `Tomato`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-39",
    question: `Severe diarrhea, dehydration and weakness are symptoms of`,
    options: ["cholera", "chickenpox", "malaria", "yellow fever"],
    answer: `yellow fever`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-40",
    question: `A common characteristic found among the crustaceans is the possession of`,
    options: [
      "a pair of antennae",
      "a pair of walking legs on each segment",
      "four pairs of walking legs on the cephalothorax",
      "two pairs of antennae",
    ],
    answer: `a pair of antennae`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-41",
    question: `In which of the following groups of invertebrates are flagella and cilia found`,
    options: ["annelids", "protists", "coelenterates", "Anthropods"],
    answer: `Anthropods`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-42",
    question: `Physiological variation in human population is evidence in the`,
    options: [
      "difference in the fingerprints",
      "physical appearance of individuals",
      "differences in height and weight",
      "ability to roll the tongue",
    ],
    answer: `physical appearance of individuals`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-43",
    question: `In photosynthesis, oxygen is liberated during`,
    options: [
      "conversion of energy",
      "photolysis",
      "splitting of carbon (IV)oxide",
      "glycolysis",
    ],
    answer: `glycolysis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-44",
    question: `Use the information below to answer the question that follows What is the total height of rice that grew within the years of cultivation?`,
    options: ["240 cm", "239 cm", "340 cm", "339 cm"],
    answer: `239 cm`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-45",
    question: `Use the information below to answer the question that follows What is the average of the heights of rice within the period of cultivation?`,
    options: ["68cm", ""],
    answer: ``,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-47",
    question: `8cm C. 48cm D.`,
    options: ["48cm", ""],
    answer: ``,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
  }),

  createQuestion({
    id: "biology-2016-46",
    question: `Use the diagram below to answer the question that follows The type vertebra represented in the diagram is`,
    options: ["Atlas", "Lumbar", "Axis", "Sacrum"],
    answer: `Lumbar`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
    image: "../images/biology_2016_46.svg",
  }),

  createQuestion({
    id: "biology-2016-47",
    question: `Use the diagram below to answer the question that follows The structure labeled I is`,
    options: [
      "Centrum",
      "neural canal",
      "neural spins",
      "transverse process Page 43",
    ],
    answer: `neural canal`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2016,
    image: "../images/biology_2016_47.svg",
  }),

  createQuestion({
    id: "biology-2017-1",
    question: `The piercing and sucking mouth parts are found in`,
    options: ["grasshoppers", "mosquitoes", "termites", "cockroaches"],
    answer: `grasshoppers`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-2",
    question: `The hormones that regulate plant growth are`,
    options: [
      "ethylene and auxins",
      "auxin and gibberellins",
      "cytokinin and abscisic acid",
      "ethylene and gibberellins",
    ],
    answer: `ethylene and auxins`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-3",
    question: `Which of the following pair of organisms exhibit parasitic association?`,
    options: [
      "insect and plant",
      "cattle and egret",
      "shark and remora",
      "tsetse -fly and cattle",
    ],
    answer: `insect and plant`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-4",
    question: `Which of the following group of animals can withstand the rigour of the arid land?`,
    options: [
      "locust, camel, lizard and snakes",
      "monkeys, chameleon, earthworm and grasshopper",
      "monkeys, grasshopper, snail and snakes",
      "lungfish, duck, butterfly and lizards",
    ],
    answer: `locust, camel, lizard and snakes`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-5",
    question: `Suture joint is found in the`,
    options: ["hip", "ankle", "skull", "elbow"],
    answer: `hip`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-6",
    question: `The organelle responsible for osmoregulation in Paramecium is`,
    options: [
      "flame cell",
      "nephridia",
      "contractile vacuole",
      "Malpighian tubule",
    ],
    answer: `flame cell`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-7",
    question: `Use the diagram to answer the question that follow The excretory organ of an earthworm is represented by`,
    options: ["IV", "I", "III", "II"],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
    image: "../images/biology_2017_7.svg",
  }),

  createQuestion({
    id: "biology-2017-8",
    question: `The platelets in mammalian blood are responsible for`,
    options: [
      "transporting oxygen",
      "initiating clotting",
      "removing carbon (IV) oxide",
      "destroying micro -organisms",
    ],
    answer: `transporting oxygen`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-9",
    question: `The most important factor that determines the different types of vegetation is`,
    options: ["light", "wind", "temperature", "rainfall"],
    answer: `light`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-10",
    question: `When testing for the presence of starch in a leaf, the reason for dipping the decolourised leaf in hot water is to`,
    options: [
      "detect the starch",
      "kill the leaf",
      "soften the leaf",
      "remove the chlorophyll",
    ],
    answer: `detect the starch`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-11",
    question: `The relationship between remora and shark can best be descr ibed as`,
    options: ["parasitism", "amensalism", "mutualism", "commensalism"],
    answer: `parasitism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-12",
    question: `The major characteristic of a fresh water habitat is the possession of`,
    options: ["high turbidity", "high density", "low salinity", "high current"],
    answer: `high turbidity`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-13",
    question: `The causative organism of cholera is`,
    options: [
      "Clostridium sp",
      "shigella sp",
      "vibrio sp",
      "salmonella typhi Page 45",
    ],
    answer: `Clostridium sp`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-14",
    question: `The process that takes place in the dark stage of photosynthesis is`,
    options: [
      "oxidation of water",
      "photolysis of water",
      "oxidation of carbon (IV) oxide",
      "reduction of carbon (IV) oxide",
    ],
    answer: `oxidation of water`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-15",
    question: `Chlorofluorocarbons are air pollutants that originates from`,
    options: [
      "crude oil refining",
      "coal mining",
      "motor vehicle exhaust",
      "cooling system",
    ],
    answer: `crude oil refining`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-16",
    question: `Which of the following is organ level of organisation?`,
    options: [
      "Volvox sp",
      "paramecium caudatum",
      "hydra viridis",
      "onion bulb",
    ],
    answer: `Volvox sp`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-17",
    question: `The simplest form of reproduction is`,
    options: ["conjugation", "budding", "spore formation", "binary fission"],
    answer: `conjugation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-18",
    question: `Which of the following is a characteristic of wind -pollinated flower?`,
    options: [
      "flowers lack nectar",
      "flowers are conspicuous",
      "flowers have perianths",
      "flowers are bisexual",
    ],
    answer: `flowers lack nectar`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-19",
    question: `Use the diagram to answer the question that follow The most eminent unit in terms or water conservation is represented by`,
    options: ["IV", "I", "III", "II"],
    answer: `IV`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
    image: "../images/biology_2017_19.svg",
  }),

  createQuestion({
    id: "biology-2017-20",
    question: `The process required for formation of gamete in sexual reproduction is`,
    options: ["implantation", "fertilisation", "mitosis", "meiosis"],
    answer: `implantation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-22",
    question: `The presence of termites and earthworms in soil promote`,
    options: [
      "porosity and fertility",
      "porosity and aeration",
      "aeration and fertility",
      "acidity and aeration",
    ],
    answer: `porosity and fertility`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-400",
    question: `What is the Tridax`,
    options: ["12", "16", "8", "5"],
    answer: `12`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-24",
    question: `Which of the following is a sex -link character?`,
    options: ["Dwarfism", "Albinism", "Tongue rolling", "Colour blindness"],
    answer: `Dwarfism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-25",
    question: `The outer -most tissue of the herbaceous roots is the`,
    options: ["cuticle", "pericycle", "epidermis", "endodermis"],
    answer: `cuticle`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-26",
    question: `The respective tissues that transport water and manufactured food in plants are`,
    options: [
      "xylem and phloem",
      "phloem and tracheid Page 46",
      "phloem and xylem",
      "xylem and tracheid",
    ],
    answer: `xylem and phloem`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-27",
    question: `An adaptive feature of plants in the savanna is`,
    options: ["fissured bark", "few grasses", "tall trees", "long lifespan"],
    answer: `fissured bark`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-28",
    question: `A grasshopper's cuticle becomes green during the season and black after fire. The reasons for the change is ---`,
    options: ["obtain food", "predators", "secure mates", "escape detection"],
    answer: `obtain food`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-29",
    question: `Which of the following is the most advance plant?`,
    options: ["merchantia", "Dryopteris", "Chlamydomonas", "Spirogyra"],
    answer: `merchantia`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-30",
    question: `The soil type with the least ability to retain nutrients is`,
    options: ["sandy loam", "clay loam", "loam", "sand"],
    answer: `sandy loam`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-31",
    question: `A humming bird is able to feed on nectar because its beak is`,
    options: [
      "short, slender and ridged",
      "short, strong and conical",
      "long, slender and slightly curved",
      "long, wide and slightly curved Use the diagram to answer the question that follow",
    ],
    answer: `short, slender and ridged`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-32",
    question: `The part labelled III acts as`,
    options: [
      "water outlet",
      "food strainer",
      "exchange surface",
      "blood transporter",
    ],
    answer: `water outlet`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-33",
    question: `The effect of overcrowding is`,
    options: [
      "immigration",
      "reduced competition",
      "emigration",
      "reduced mortality",
    ],
    answer: `immigration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-34",
    question: `The vertebrae that allows the skull to nod and rotate are`,
    options: [
      "axis and cervical",
      "atlas and thoracis",
      "axis and atlas",
      "atlas and cervical",
    ],
    answer: `axis and cervical`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-35",
    question: `The component of the cell that determines paternity resides in the`,
    options: ["centrosome", "ribosome", "nucleus", "mitochondria"],
    answer: `centrosome`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-37",
    question: `Use the diagram to answer the question that follow The part labelled II is the`,
    options: ["arch", "filament", "slit", "raker Page 47"],
    answer: `arch`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
    image: "../images/biology_2017_37.svg",
  }),

  createQuestion({
    id: "biology-2017-38",
    question: `The insect -trapping by the leaves of Venus flytrap is an example of a`,
    options: [
      "adaptive coloration",
      "structural adaptation",
      "environmental adaptation",
      "behaviour adaptation",
    ],
    answer: `adaptive coloration`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-39",
    question: `Morphological variation in humans include`,
    options: [
      "height, skin, colour and tongue rolling",
      "weight, finger prints and body shape",
      "height, weight and blood group",
      "skin colour, blood and height",
    ],
    answer: `height, skin, colour and tongue rolling`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2017-40",
    question: `Which of the following is correct about blood transfusion?`,
    options: [
      "Group AB can only receive from groups A and B and not from group O",
      "Group O can receive from groups A and B and from AB",
      "Group B can only donate to blood group B and not to AB and O",
      "Group O can donate to groups A, B and AB but cannot receive Page 48 ANSWERS",
    ],
    answer: `Group AB can only receive from groups A and B and not from group O`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2017,
  }),

  createQuestion({
    id: "biology-2018-1",
    question: `A group of closely related organisms capable of interbreeding to produce fertile offspring are known as members of a`,
    options: ["kingdom", "class", "family", "species"],
    answer: `kingdom`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-2",
    question: `A beaker of pond water containing few specimens of Euglena was placed in a dark room for two weeks. At the end of this period, the specimens of Euglena were still alive because they were`,
    options: [
      "able to carry out holozoic nutrition",
      "able to carry out photosynthesis using carbon dioxide in the pond water",
      "better adapted to life in darkness than to life in light",
      "not overcrowded",
    ],
    answer: `able to carry out holozoic nutrition`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-3",
    question: `The cytoplasm of the cell is considered a very important component because it`,
    options: [
      "regulates the amount of energy in the cell",
      "suspends all cell organelles",
      "is the outermost part of the cell",
      "is solely responsible for cell division Use the diagram below to answer question 4 to 6",
    ],
    answer: `regulates the amount of energy in the cell`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-4",
    question: `After an hour, the level of water in the thistle funnel will`,
    options: ["rise", "fall", "remain the same", "double"],
    answer: `rise`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-5",
    question: `The experiment is used to demonstrate the process of`,
    options: ["transportation", "water culture", "diffusion", "Osmosis"],
    answer: `transportation`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-6",
    question: `In a plant cells, the role of the membrane is played by the`,
    options: ["nucleolus", "cell wall", "cytoplasm", "mitochondrion"],
    answer: `nucleolus`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-7",
    question: `Red blood cells were found to have burst open after being placed in distil for an hour. This phenomenon is known as`,
    options: ["plasmolysis", "diffusion", "haemolysis", "wilting"],
    answer: `plasmolysis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-8",
    question: `The curvature movement of plants in response to the stimulus of water is called`,
    options: ["hydrotropism", "geotropism", "Phototropism", "thigmotropism"],
    answer: `hydrotropism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-9",
    question: `The overall reaction in glycolysis can be summarised as`,
    options: [
      "C 6111205 --K31-1403 + 4H + ATP",
      "C6H1206 ----- 2;11403+ 4H + 2ATP",
      "C61 -1,206 ---.> 2;1 -1403 + 4H + ADP",
      "C6F11206 2C31 -1403+ 4h + 2ADP",
    ],
    answer: `C 6111205 --K31-1403 + 4H + ATP`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-10",
    question: `The longest bone in the body is the`,
    options: ["humerous", "femur", "scapula", "tibia"],
    answer: `humerous`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-11",
    question: `Which of the following structures is not a skeletal material?`,
    options: ["Chitin", "Cartilage", "Bone", "Muscle"],
    answer: `Chitin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-12",
    question: `The reason why the flow of blood through the capillaries is very slow is Page 50`,
    options: [
      "because the walls of capillaries are very thin",
      "to avoid high — blood pressure",
      "to ensure that the individual does not get dizzy",
      "to allow adequate time for exchange of materials",
    ],
    answer: `because the walls of capillaries are very thin`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-13",
    question: `Which of the following groups of organisms has kidney as their excretory organ?`,
    options: [
      "Fishes, amphibians, birds, man",
      "Fishes, amphibians, annelids, insects",
      "Fishes, reptiles, birds, tapeworms",
      "Fishes protozoans, amphibians, man",
    ],
    answer: `Fishes, amphibians, birds, man`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-14",
    question: `Which of the following features is not a characteristic of arteries? Arteries`,
    options: [
      "possess values at internals throughout their length.",
      "have thick muscular and elastic walls",
      "carry blood away from the heart",
      "transport oxygenated blood with the exception of the pulmonary artery. The graph below shows the results of a laboratory investigation whic h measured the body temperatures of a lizard and a bird under changing artificial conditions. Use to answer questions 15 and",
    ],
    answer: `possess values at internals throughout their length.`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-15",
    question: `Which of the statements below is valid?`,
    options: [
      "The bird's blood was always warmer than that of the lizard.",
      "The body temperature of the bird varied less than that of the lizard during changes in environmental temperature.",
      "The body temperature of the bird remained constant despite changes in environmental temperature.",
      "The body temperature of the lizard was always close to that of the environmental temperature.",
    ],
    answer: `The bird's blood was always warmer than that of the lizard.`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-16",
    question: `What physiological term can be used to describe the regulation of the body temperature of the lizard?`,
    options: ["Homeostasis", "Homeothermy", "Poikilothermy", "Osmoregulation"],
    answer: `Homeostasis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-17",
    question: `The reason why hospitals use saline solutions as drip instead of water is`,
    options: [
      "because salt is a preservative",
      "to prevent contamination of the body",
      "to maintain the composition of body fluids",
      "to increase the number of blood cells",
    ],
    answer: `because salt is a preservative`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-18",
    question: `The part of the ear which contains nerve cells sensitive to sound vi brations is the`,
    options: ["cochlea", "ampulla", "tympanum", "malleus"],
    answer: `cochlea`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-19",
    question: `Spectacles with convex lenses correct long-sightedness by`,
    options: [
      "converging the Light rays before they enter the eye",
      "diverging the light rays before they enter the eye",
      "reducing light intensity before it enters the eye",
      "increasing light intensity before it enters the eye",
    ],
    answer: `converging the Light rays before they enter the eye`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-20",
    question: `A seed of a flowering plant can best be described as`,
    options: [
      "radicle and plumule",
      "the developed ovule",
      "the embryo and endosperm",
      "developed ovary",
    ],
    answer: `radicle and plumule`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-21",
    question: `Which of the following processes removes carbon from the atmosphere?`,
    options: [
      "Putrefaction Page 51",
      "Photosynthesis",
      "volcanic eruption",
      "Burning fuels",
    ],
    answer: `Putrefaction Page 51`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-22",
    question: `Which of the following cycles involves the process of precipitation and transpiration?`,
    options: ["Water cycles", "Carbon cycle", "Nitrogen cycle", "oxygen cycle"],
    answer: `Water cycles`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-23",
    question: `What is the critical limiting factor for plants below the photic zone in an aquatic ecosystem?`,
    options: [
      "Availability of nutrients",
      "Availability of water",
      "intensity of light",
      "Carbon dioxide concentration",
    ],
    answer: `Availability of nutrients`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-24",
    question: `Which of the following instruments is used to estimate the number o, plants in a habitat?`,
    options: ["Pooter", "Pitfall trap", "Quadrat", "Sweep net"],
    answer: `Pooter`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-25",
    question: `Which of the following statements is true about sandy soil? It`,
    options: [
      "has limited air space",
      "is light and easy to dig",
      "drains slowly",
      "is heavy and poorly aerated",
    ],
    answer: `has limited air space`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-26",
    question: `Which of the following organisms is a primary consumer?`,
    options: [
      "Dog",
      "Sheep",
      "Grass",
      "Fungus Study the diagram of a food chain shown below and use it to answer question 27 and",
    ],
    answer: `Dog`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-27",
    question: `The organism designated P in the food chain above is normally sustained by energy from`,
    options: ["sunlight", "carbohydrates", "green plants", "mineral salts"],
    answer: `sunlight`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-28",
    question: `Which of the following statements best describes the organism designated R? It`,
    options: [
      "feeds on S.",
      "is a primary consumer.",
      "is a producer as well as a consumer",
      "is a secondary consumer",
    ],
    answer: `feeds on S.`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-29",
    question: `Which of the following diseases is not hereditary?`,
    options: ["Albinism", "Scabies", "Haemophilia", "Colour blindness"],
    answer: `Albinism`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-30",
    question: `The immediate product of meiosis in flowering plants is the`,
    options: ["sporophyte", "gametophyte", "zygote", "pollen grains"],
    answer: `sporophyte`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-31",
    question: `DNA in eukaryotic cells is contained in the`,
    options: ["central vacuole", "nucleus", "lysosome", "golgi body"],
    answer: `central vacuole`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-32",
    question: `A man who is heterozygous for the disease haemophilia marries a woman who is double recessive for haemophilia. What percentage of their offspring would have the disease?`,
    options: ["0%", "25%", "50%", "75%"],
    answer: `0%`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-33",
    question: `Cytokinesis of mitosis is a process tha t ensures that`,
    options: [
      "each daughter cell gets the necessary organelle",
      "there is distribution of a complete set of genes into each daughter cell.",
      "daughter cells inherit new genetic combinations.",
      "worn out organelles are excluded from daughter cells Page 52",
    ],
    answer: `each daughter cell gets the necessary organelle`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-34",
    question: `An animal which is active during the day is known as a`,
    options: [
      "nocturnal animal",
      "diurnal animal",
      "terrestrial animal",
      "homoatomic animal",
    ],
    answer: `nocturnal animal`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-35",
    question: `Evidence of evolution include the following except`,
    options: [
      "fossil records",
      "comparative anatomy",
      "mutation of genes",
      "geographical distribution of organisms Use the diagram below to answer question 36 and 37 .",
    ],
    answer: `fossil records`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-36",
    question: `The diagram shows that the organisms are`,
    options: ["hermaphrodite", "viviparous", "oviparous", "ovoviparous"],
    answer: `hermaphrodite`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
    image: "../images/biology_2018_36.svg",
  }),

  createQuestion({
    id: "biology-2018-37",
    question: `The breeding posture illustrated in the diagram is known as`,
    options: [
      "mating",
      "amplexus",
      "courtship display",
      "reproductive swimming",
    ],
    answer: `mating`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
    image: "../images/biology_2018_37.svg",
  }),

  createQuestion({
    id: "biology-2018-38",
    question: `An accurate identification of a rapist can be carried out by it conducting a`,
    options: [
      "RNA analysis",
      "DNA analysis",
      "blood group test",
      "behavioural traits test",
    ],
    answer: `RNA analysis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-39",
    question: `A boy who is fond of swimming in a pond finds himself passing urine with traces of blood. He is likely to have contracted`,
    options: [
      "schistosomiasis",
      "onchocerciasis",
      "poliomyelitis",
      "salmonellosis",
    ],
    answer: `schistosomiasis`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),

  createQuestion({
    id: "biology-2018-40",
    question: `The flippers of a whale and the fins of a fish are examples of`,
    options: [
      "divergent evolution",
      "coevolution",
      "continuous variation",
      "convergent evolution",
    ],
    answer: `divergent evolution`,
    topic: "General Biology",
    difficulty: "medium",
    year: 2018,
  }),
];

/* =========================================================
GOVERNMENT
========================================================= */
const government = [
  createQuestion({
    id: generateId("government", 1),

    question: "Government can best be defined as?",

    options: [
      "A group of traders",
      "The machinery through which a state is governed",
      "A social gathering",
      "A religious institution",
    ],

    answer: 1,

    topic: "Meaning of Government",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 2),

    question: "The primary purpose of government is to?",

    options: [
      "Promote disorder",
      "Maintain law and order",
      "Encourage conflicts",
      "Control religion",
    ],

    answer: 1,

    topic: "Functions of Government",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 3),

    question: "Democracy is a system of government in which power belongs to?",

    options: ["The military", "The king", "The people", "The judiciary"],

    answer: 2,

    topic: "Democracy",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 4),

    question:
      "The organ of government responsible for interpreting laws is the?",

    options: ["Executive", "Legislature", "Judiciary", "Civil service"],

    answer: 2,

    topic: "Organs of Government",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 5),

    question: "A constitution is best described as?",

    options: [
      "A military decree",
      "A body of fundamental laws guiding a state",
      "A political speech",
      "A court judgment",
    ],

    answer: 1,

    topic: "Constitution",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 6),

    question:
      "The system of government in which powers are divided between central and state governments is?",

    options: ["Unitary", "Federal", "Confederal", "Parliamentary"],

    answer: 1,

    topic: "Forms of Government",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 7),

    question: "The principle of separation of powers was propounded by?",

    options: ["John Locke", "Karl Marx", "Montesquieu", "Aristotle"],

    answer: 2,

    topic: "Separation of Powers",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 8),

    question: "The head of government in a parliamentary system is the?",

    options: ["President", "Prime Minister", "Chief Judge", "Governor"],

    answer: 1,

    topic: "Parliamentary System",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 9),

    question: "Universal adult suffrage means?",

    options: [
      "Only men can vote",
      "Only educated citizens can vote",
      "All qualified adults can vote",
      "Only civil servants can vote",
    ],

    answer: 2,

    topic: "Electoral System",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 10),

    question: "The law-making body in Nigeria is called the?",

    options: [
      "Executive Council",
      "National Assembly",
      "Federal Court",
      "Cabinet",
    ],

    answer: 1,

    topic: "Legislature",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 11),

    question: "Which of the following is a feature of democracy?",

    options: [
      "One-party rule",
      "Military dictatorship",
      "Periodic elections",
      "Suspension of constitution",
    ],

    answer: 2,

    topic: "Democracy",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 12),

    question: "The highest court in Nigeria is the?",

    options: [
      "Federal High Court",
      "Court of Appeal",
      "Supreme Court",
      "Magistrate Court",
    ],

    answer: 2,

    topic: "Judiciary",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 13),

    question: "An unwritten constitution is one that is?",

    options: [
      "Not documented at all",
      "Entirely oral",
      "Contained in several documents and conventions",
      "Destroyed by government",
    ],

    answer: 2,

    topic: "Constitution",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 14),

    question: "Political parties are formed mainly to?",

    options: [
      "Promote sports",
      "Contest elections and control government",
      "Organize entertainment",
      "Control religious groups",
    ],

    answer: 1,

    topic: "Political Parties",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 15),

    question:
      "The process through which leaders are selected by voting is known as?",

    options: ["Impeachment", "Election", "Lobbying", "Referendum"],

    answer: 1,

    topic: "Electoral Process",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 16),

    question: "A state with only one central government is practicing?",

    options: [
      "Federalism",
      "Confederation",
      "Unitary system",
      "Presidentialism",
    ],

    answer: 2,

    topic: "Forms of Government",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 17),

    question: "The tenure of office of the President of Nigeria is?",

    options: ["3 years", "4 years", "5 years", "6 years"],

    answer: 1,

    topic: "Nigerian Constitution",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 18),

    question: "The rule of law implies that?",

    options: [
      "The law applies equally to all citizens",
      "Only leaders obey the law",
      "Judges are above the law",
      "The military controls the law",
    ],

    answer: 0,

    topic: "Rule of Law",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 19),

    question: "A pressure group seeks to?",

    options: [
      "Capture political power",
      "Influence government policies",
      "Conduct elections",
      "Interpret laws",
    ],

    answer: 1,

    topic: "Pressure Groups",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 20),

    question:
      "The chairman of the Independent National Electoral Commission in Nigeria is appointed by the?",

    options: [
      "Chief Justice",
      "Senate President",
      "President",
      "Speaker of the House",
    ],

    answer: 2,

    topic: "Electoral Commission",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 21),

    question: "The concept of checks and balances is meant to?",

    options: [
      "Promote dictatorship",
      "Prevent abuse of power",
      "Encourage corruption",
      "Abolish the judiciary",
    ],

    answer: 1,

    topic: "Checks and Balances",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 22),

    question: "The Nigerian legislature is divided into?",

    options: [
      "Upper and lower chambers",
      "Executive and judiciary",
      "Federal and local councils",
      "Cabinet and senate",
    ],

    answer: 0,

    topic: "Legislature",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 23),

    question: "A referendum is used to?",

    options: [
      "Elect lawmakers",
      "Remove judges",
      "Allow citizens vote directly on important issues",
      "Appoint ministers",
    ],

    answer: 2,

    topic: "Direct Democracy",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 24),

    question: "The rights enjoyed by citizens of a state are known as?",

    options: [
      "Privileges",
      "Directives",
      "Fundamental human rights",
      "Customs",
    ],

    answer: 2,

    topic: "Citizenship",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 25),

    question: "The arm of government that implements laws is the?",

    options: ["Judiciary", "Executive", "Legislature", "Tribunal"],

    answer: 1,

    topic: "Executive",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 26),

    question: "One major feature of a confederal system is?",

    options: [
      "Strong central government",
      "Weak component units",
      "Independent member states",
      "Absence of constitution",
    ],

    answer: 2,

    topic: "Confederation",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 27),

    question:
      "The process of removing an elected official from office is called?",

    options: ["Election", "Recall", "Referendum", "Lobbying"],

    answer: 1,

    topic: "Political Processes",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 28),

    question: "Which of the following is a function of the civil service?",

    options: [
      "Interpreting laws",
      "Implementing government policies",
      "Conducting elections",
      "Making constitutions",
    ],

    answer: 1,

    topic: "Civil Service",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 29),

    question: "The doctrine of judicial precedent means that?",

    options: [
      "Judges ignore previous cases",
      "Courts follow earlier decisions",
      "Legislature controls courts",
      "Executives appoint judges directly",
    ],

    answer: 1,

    topic: "Judiciary",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 30),

    question: "Study the diagram below showing separation of powers.",

    options: [
      "Federalism",
      "Delegated legislation",
      "Separation of powers",
      "Rule of law",
    ],

    answer: 2,

    image: governmentSeparationOfPowers,

    topic: "Separation of Powers",

    difficulty: "medium",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 31),

    question:
      "The body responsible for making laws in a presidential system is the?",

    options: ["Executive", "Legislature", "Judiciary", "Cabinet"],

    answer: 1,

    topic: "Legislature",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 32),

    question:
      "The principle of fundamental human rights is mainly aimed at protecting citizens from?",

    options: [
      "Foreign influence",
      "Abuse of power",
      "Natural disasters",
      "Political campaigns",
    ],

    answer: 1,

    topic: "Human Rights",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 33),

    question: "Which of the following is a merit of federalism?",

    options: [
      "Concentration of power",
      "Promotion of local autonomy",
      "Weak opposition parties",
      "Single legislative chamber",
    ],

    answer: 1,

    topic: "Federalism",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 34),

    question: "A cabinet in a parliamentary system is usually headed by the?",

    options: ["President", "Chief Justice", "Prime Minister", "Speaker"],

    answer: 2,

    topic: "Parliamentary System",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 35),

    question: "The process of acquiring citizenship by birth is called?",

    options: ["Naturalization", "Registration", "Jus soli", "Immigration"],

    answer: 2,

    topic: "Citizenship",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 36),

    question: "Public corporations are established mainly to?",

    options: [
      "Promote private interests",
      "Provide essential services",
      "Control political parties",
      "Conduct elections",
    ],

    answer: 1,

    topic: "Public Corporations",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 37),

    question: "The tenure of members of the Nigerian Senate is?",

    options: ["2 years", "3 years", "4 years", "5 years"],

    answer: 2,

    topic: "Legislature",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 38),

    question: "The term bicameral legislature means?",

    options: [
      "A legislature with two chambers",
      "A legislature with one chamber",
      "Military administration",
      "A judicial panel",
    ],

    answer: 0,

    topic: "Legislature",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 39),

    question:
      "An electoral system in which the candidate with the highest votes wins is called?",

    options: [
      "Proportional representation",
      "Absolute majority",
      "First-past-the-post",
      "Indirect election",
    ],

    answer: 2,

    topic: "Electoral Systems",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 40),

    question:
      "The institution responsible for defending the territorial integrity of a state is the?",

    options: ["Police", "Customs", "Military", "Legislature"],

    answer: 2,

    topic: "Defense and Security",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 41),

    question: "Which of the following is a source of a constitution?",

    options: ["Conventions", "Manifestoes", "Editorials", "Pamphlets"],

    answer: 0,

    topic: "Constitution",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 42),

    question:
      "The process of questioning government officials about their actions in parliament is known as?",

    options: [
      "Judicial review",
      "Question time",
      "Referendum",
      "Filibustering",
    ],

    answer: 1,

    topic: "Legislative Control",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 43),

    question:
      "The exclusive list in a federal system contains matters handled by the?",

    options: [
      "Local governments",
      "Traditional rulers",
      "Federal government",
      "State governments",
    ],

    answer: 2,

    topic: "Federalism",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 44),

    question: "The judiciary ensures justice through?",

    options: [
      "Law making",
      "Policy formulation",
      "Interpretation of laws",
      "Election monitoring",
    ],

    answer: 2,

    topic: "Judiciary",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 45),

    question: "One major feature of military rule is the?",

    options: [
      "Supremacy of the constitution",
      "Existence of political parties",
      "Suspension of democratic institutions",
      "Conduct of periodic elections",
    ],

    answer: 2,

    topic: "Military Rule",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 46),

    question: "The head of the judiciary in Nigeria is the?",

    options: [
      "Attorney General",
      "Speaker",
      "Chief Justice of Nigeria",
      "Senate President",
    ],

    answer: 2,

    topic: "Judiciary",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 47),

    question: "The process of changing the constitution is known as?",

    options: ["Delegation", "Amendment", "Ratification", "Impeachment"],

    answer: 1,

    topic: "Constitution",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 48),

    question:
      "Which of the following promotes political awareness among citizens?",

    options: ["Mass media", "Military regime", "Judiciary", "Customary courts"],

    answer: 0,

    topic: "Political Participation",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 49),

    question: "The official opposition in parliament is important because it?",

    options: [
      "Controls the judiciary",
      "Checks the government in power",
      "Conducts elections",
      "Appoints ministers",
    ],

    answer: 1,

    topic: "Party System",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 50),

    question:
      "The conduct of free and fair elections is mainly the responsibility of?",

    options: [
      "Political parties",
      "The judiciary",
      "Electoral commission",
      "Traditional rulers",
    ],

    answer: 2,

    topic: "Electoral Commission",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 51),

    question: "The upper chamber of the Nigerian National Assembly is the?",

    options: [
      "House of Representatives",
      "Federal Executive Council",
      "Senate",
      "Cabinet",
    ],

    answer: 2,

    topic: "Legislature",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 52),

    question: "The concept of sovereignty refers to the?",

    options: [
      "Right to protest",
      "Supreme power of the state",
      "Power of political parties",
      "Activities of pressure groups",
    ],

    answer: 1,

    topic: "Political Concepts",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 53),

    question: "Which of the following is a demerit of a one-party system?",

    options: [
      "Political stability",
      "Lack of opposition",
      "Rapid decision making",
      "Unity of purpose",
    ],

    answer: 1,

    topic: "Party Systems",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 54),

    question: "The rule of law is closely associated with?",

    options: ["Dictatorship", "Military rule", "Democracy", "Autocracy"],

    answer: 2,

    topic: "Rule of Law",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 55),

    question: "A delegated legislation is law made by?",

    options: [
      "Judges",
      "The executive under authority granted by parliament",
      "Traditional rulers",
      "Pressure groups",
    ],

    answer: 1,

    topic: "Legislation",

    year: 2021,
  }),

  createQuestion({
    id: generateId("government", 56),

    question: "The main purpose of local government is to?",

    options: [
      "Conduct foreign affairs",
      "Bring government closer to the people",
      "Interpret laws",
      "Control political parties",
    ],

    answer: 1,

    topic: "Local Government",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 57),

    question: "The doctrine of separation of powers prevents?",

    options: [
      "Political participation",
      "Abuse of power",
      "Judicial review",
      "Constitutional amendment",
    ],

    answer: 1,

    topic: "Separation of Powers",

    year: 2020,
  }),

  createQuestion({
    id: generateId("government", 58),

    question: "The tenure of a governor in Nigeria is?",

    options: ["3 years", "4 years", "5 years", "6 years"],

    answer: 1,

    topic: "State Government",

    year: 2023,
  }),

  createQuestion({
    id: generateId("government", 59),

    question: "Which of the following is an agent of political socialization?",

    options: ["Family", "Judiciary", "Cabinet", "Civil service"],

    answer: 0,

    topic: "Political Socialization",

    year: 2022,
  }),

  createQuestion({
    id: generateId("government", 60),

    question: "Study the electoral process diagram below.",

    options: ["Recall", "Election", "Referendum", "Impeachment"],

    answer: 1,

    image: governmentElectionProcess,

    topic: "Electoral Process",

    difficulty: "medium",

    year: 2021,
  }),
];

/* =========================================================
ECONOMICS
========================================================= */
const economics = [
  createQuestion({
    id: generateId("economics", 1),
    question: "Economics is primarily concerned with the study of",
    options: [
      "unlimited human wants",
      "scarce resources and choice",
      "population growth",
      "government policies",
    ],
    answer: 1,
    explanation:
      "Economics studies how scarce resources are allocated among competing wants.",
  }),

  createQuestion({
    id: generateId("economics", 2),
    question: "The reward for entrepreneurship is known as",
    options: ["rent", "interest", "wages", "profit"],
    answer: 3,
    explanation: "Entrepreneurs are rewarded with profit.",
  }),

  createQuestion({
    id: generateId("economics", 3),
    question: "Which of the following is a basic economic problem?",
    options: ["Inflation", "Scarcity", "Taxation", "Corruption"],
    answer: 1,
    explanation: "Scarcity is the central economic problem.",
  }),

  createQuestion({
    id: generateId("economics", 4),
    question: "Opportunity cost refers to",
    options: [
      "money spent on production",
      "the next best alternative forgone",
      "cost of raw materials",
      "government expenditure",
    ],
    answer: 1,
    explanation:
      "Opportunity cost is the value of the next best alternative forgone.",
  }),

  createQuestion({
    id: generateId("economics", 5),
    question: "A market economy is characterized by",
    options: [
      "government ownership",
      "price control",
      "private ownership",
      "central planning",
    ],
    answer: 2,
    explanation: "Private ownership is a major feature of a market economy.",
  }),

  createQuestion({
    id: generateId("economics", 6),
    question: "Demand is best defined as",
    options: [
      "all human wants",
      "desire backed with ability to pay",
      "goods supplied to the market",
      "consumer preference",
    ],
    answer: 1,
    explanation: "Demand is desire backed by willingness and ability to pay.",
  }),

  createQuestion({
    id: generateId("economics", 7),
    question: "An increase in price generally leads to",
    options: [
      "increase in demand",
      "decrease in supply",
      "decrease in quantity demanded",
      "increase in production cost",
    ],
    answer: 2,
    explanation:
      "Higher prices reduce quantity demanded according to the law of demand.",
  }),

  createQuestion({
    id: generateId("economics", 8),
    question: "The law of supply states that",
    options: [
      "higher price leads to higher quantity supplied",
      "price and demand move together",
      "supply is always constant",
      "consumers buy more at higher prices",
    ],
    answer: 0,
    explanation: "Suppliers offer more goods at higher prices.",
  }),

  createQuestion({
    id: generateId("economics", 9),
    question: "Equilibrium price is determined by",
    options: [
      "government policy",
      "consumer income",
      "interaction of demand and supply",
      "producer preference",
    ],
    answer: 2,
    explanation: "Equilibrium occurs where demand equals supply.",
  }),

  createQuestion({
    id: generateId("economics", 10),
    question: "Price elasticity of demand measures",
    options: [
      "response of demand to price changes",
      "changes in supply",
      "government taxation",
      "cost of production",
    ],
    answer: 0,
    explanation:
      "Elasticity measures responsiveness of demand to price changes.",
  }),

  createQuestion({
    id: generateId("economics", 11),
    question: "A commodity with many substitutes tends to have",
    options: [
      "inelastic demand",
      "perfect supply",
      "elastic demand",
      "joint demand",
    ],
    answer: 2,
    explanation: "Availability of substitutes makes demand elastic.",
  }),

  createQuestion({
    id: generateId("economics", 12),
    question: "Fixed cost is a cost that",
    options: [
      "changes with output",
      "remains constant in the short run",
      "depends on sales",
      "is controlled by consumers",
    ],
    answer: 1,
    explanation: "Fixed costs do not vary with output in the short run.",
  }),

  createQuestion({
    id: generateId("economics", 13),
    question: "Average cost is obtained by dividing total cost by",
    options: ["price", "profit", "quantity produced", "revenue"],
    answer: 2,
    explanation: "Average cost equals total cost divided by output.",
  }),

  createQuestion({
    id: generateId("economics", 14),
    question: "A monopolist is a seller who",
    options: [
      "faces many competitors",
      "sells differentiated products",
      "controls the entire market",
      "buys in bulk",
    ],
    answer: 2,
    explanation: "A monopolist is the sole producer in the market.",
  }),

  createQuestion({
    id: generateId("economics", 15),
    question: "Perfect competition is characterized by",
    options: [
      "few sellers",
      "product differentiation",
      "many buyers and sellers",
      "price discrimination",
    ],
    answer: 2,
    explanation: "Perfect competition has many buyers and sellers.",
  }),

  createQuestion({
    id: generateId("economics", 16),
    question: "Money is best defined as",
    options: [
      "gold only",
      "anything generally acceptable in exchange",
      "government revenue",
      "paper currency only",
    ],
    answer: 1,
    explanation: "Money is anything widely accepted for payment.",
  }),

  createQuestion({
    id: generateId("economics", 17),
    question: "Which of the following is a function of money?",
    options: [
      "store of value",
      "increase inflation",
      "reduce imports",
      "control population",
    ],
    answer: 0,
    explanation: "Money serves as a store of value.",
  }),

  createQuestion({
    id: generateId("economics", 18),
    question: "Inflation refers to",
    options: [
      "persistent rise in general price level",
      "fall in government revenue",
      "increase in exports",
      "decline in production",
    ],
    answer: 0,
    explanation: "Inflation is a continuous rise in prices.",
  }),

  createQuestion({
    id: generateId("economics", 19),
    question: "Commercial banks mainly create money through",
    options: [
      "printing notes",
      "granting loans",
      "collecting taxes",
      "buying imports",
    ],
    answer: 1,
    explanation: "Banks create credit by giving loans.",
  }),

  createQuestion({
    id: generateId("economics", 20),
    question: "The apex bank in Nigeria is the",
    options: [
      "Union Bank",
      "First Bank",
      "Central Bank of Nigeria",
      "World Bank",
    ],
    answer: 2,
    explanation: "CBN is Nigeria's central bank.",
  }),
  createQuestion({
    id: generateId("economics", 21),

    question: "Gross Domestic Product (GDP) measures the",

    options: [
      "total value of goods imported",
      "total value of goods and services produced within a country",
      "government expenditure only",
      "income earned abroad",
    ],

    answer: 1,

    explanation:
      "GDP is the total value of goods and services produced within a country in a given period.",
  }),

  createQuestion({
    id: generateId("economics", 22),

    question: "Division of labour leads to",

    options: [
      "decrease in efficiency",
      "specialization",
      "higher unemployment",
      "lower production",
    ],

    answer: 1,

    explanation: "Division of labour encourages specialization and efficiency.",
  }),

  createQuestion({
    id: generateId("economics", 23),

    question:
      "The population census is important for economic planning because it provides data on",

    options: [
      "weather conditions",
      "religious activities",
      "human population",
      "tourism",
    ],

    answer: 2,

    explanation:
      "Population census gives information about the size and structure of the population.",
  }),

  createQuestion({
    id: generateId("economics", 24),

    question: "Which of the following is a direct tax?",

    options: ["Custom duty", "Value Added Tax", "Income tax", "Excise duty"],

    answer: 2,

    explanation:
      "Income tax is paid directly to the government by individuals and firms.",
  }),

  createQuestion({
    id: generateId("economics", 25),

    question: "A decrease in demand while supply remains constant will lead to",

    options: [
      "increase in price",
      "decrease in price",
      "constant price",
      "scarcity",
    ],

    answer: 1,

    explanation: "Lower demand causes equilibrium price to fall.",
  }),

  createQuestion({
    id: generateId("economics", 26),

    question: "Public corporations are owned by",

    options: [
      "private individuals",
      "shareholders",
      "government",
      "foreign investors",
    ],

    answer: 2,

    explanation:
      "Public corporations are established and owned by the government.",
  }),

  createQuestion({
    id: generateId("economics", 27),

    question: "Which of the following is a feature of capitalism?",

    options: [
      "central planning",
      "private ownership",
      "government monopoly",
      "collective farming",
    ],

    answer: 1,

    explanation: "Capitalism allows private ownership of resources.",
  }),

  createQuestion({
    id: generateId("economics", 28),

    question: "The cost that changes directly with output is known as",

    options: [
      "fixed cost",
      "average cost",
      "variable cost",
      "marginal revenue",
    ],

    answer: 2,

    explanation: "Variable cost changes as output changes.",
  }),

  createQuestion({
    id: generateId("economics", 29),

    question: "Which of the following is a function of the entrepreneur?",

    options: ["consumption", "risk bearing", "price fixing", "tax collection"],

    answer: 1,

    explanation: "Entrepreneurs bear business risks.",
  }),

  createQuestion({
    id: generateId("economics", 30),

    question: "The factor payment for land is",

    options: ["interest", "profit", "rent", "wages"],

    answer: 2,

    explanation: "Land earns rent as a reward.",
  }),

  createQuestion({
    id: generateId("economics", 31),

    question: "Consumer sovereignty means that",

    options: [
      "consumers determine what is produced",
      "government controls consumers",
      "producers dominate the market",
      "prices are fixed by law",
    ],

    answer: 0,

    explanation: "Consumer demand influences production decisions.",
  }),

  createQuestion({
    id: generateId("economics", 32),

    question: "Which of the following is NOT a function of money?",

    options: [
      "medium of exchange",
      "measure of value",
      "store of value",
      "weather forecasting",
    ],

    answer: 3,

    explanation: "Money does not perform weather forecasting functions.",
  }),

  createQuestion({
    id: generateId("economics", 33),

    question:
      "A rise in the supply of a commodity while demand remains constant will cause",

    options: ["price to rise", "price to fall", "scarcity", "inflation"],

    answer: 1,

    explanation:
      "An increase in supply reduces price if demand remains unchanged.",
  }),

  createQuestion({
    id: generateId("economics", 34),

    question: "The study of individual economic units is known as",

    options: [
      "macroeconomics",
      "microeconomics",
      "econometrics",
      "fiscal economics",
    ],

    answer: 1,

    explanation: "Microeconomics studies individual consumers and firms.",
  }),

  createQuestion({
    id: generateId("economics", 35),

    question: "A budget surplus occurs when",

    options: [
      "government expenditure exceeds revenue",
      "revenue equals expenditure",
      "revenue exceeds expenditure",
      "imports exceed exports",
    ],

    answer: 2,

    explanation:
      "Budget surplus occurs when government earns more than it spends.",
  }),

  createQuestion({
    id: generateId("economics", 36),

    question: "Which of the following causes inflation?",

    options: [
      "low money supply",
      "increase in money supply",
      "high unemployment",
      "decrease in demand",
    ],

    answer: 1,

    explanation: "Too much money in circulation can lead to inflation.",
  }),

  createQuestion({
    id: generateId("economics", 37),

    question: "Balance of trade refers to the",

    options: [
      "relationship between exports and imports",
      "government revenue",
      "bank reserves",
      "population size",
    ],

    answer: 0,

    explanation: "Balance of trade compares exports and imports.",
  }),

  createQuestion({
    id: generateId("economics", 38),

    question: "A regressive tax takes",

    options: [
      "higher percentage from low-income earners",
      "equal percentage from everyone",
      "higher percentage from rich people",
      "tax from companies only",
    ],

    answer: 0,

    explanation: "Regressive tax affects low-income earners more heavily.",
  }),

  createQuestion({
    id: generateId("economics", 39),

    question: "The demand curve normally slopes downward because of",

    options: [
      "scarcity",
      "law of demand",
      "government policy",
      "high production",
    ],

    answer: 1,

    explanation:
      "The law of demand states that quantity demanded falls as price rises.",
  }),

  createQuestion({
    id: generateId("economics", 40),

    question: "Which of the following is an example of capital goods?",

    options: ["Bread", "Television", "Factory machines", "Clothing"],

    answer: 2,

    explanation: "Capital goods are used for producing other goods.",
  }),
  createQuestion({
    id: generateId("economics", 41),

    question: "The central problem of economics arises because",

    options: [
      "human wants are limited",
      "resources are scarce",
      "producers are few",
      "government policies fail",
    ],

    answer: 1,

    explanation:
      "Scarcity of resources compared to unlimited wants creates economic problems.",
  }),

  createQuestion({
    id: generateId("economics", 42),

    question: "Marginal utility refers to the",

    options: [
      "total satisfaction from consumption",
      "additional satisfaction from consuming one more unit",
      "cost of production",
      "average satisfaction",
    ],

    answer: 1,

    explanation:
      "Marginal utility is the extra satisfaction from consuming an additional unit.",
  }),

  createQuestion({
    id: generateId("economics", 43),

    question: "The law of diminishing returns operates in the",

    options: ["short run", "long run", "money market", "capital market"],

    answer: 0,

    explanation: "The law of diminishing returns applies in the short run.",
  }),

  createQuestion({
    id: generateId("economics", 44),

    question: "A trade union is formed mainly to",

    options: [
      "protect workers' interests",
      "control government",
      "import goods",
      "collect taxes",
    ],

    answer: 0,

    explanation: "Trade unions protect and promote workers' welfare.",
  }),

  createQuestion({
    id: generateId("economics", 45),

    question: "Which of the following is a merit good?",

    options: ["Cigarette", "Alcohol", "Education", "Luxury cars"],

    answer: 2,

    explanation:
      "Education is socially beneficial and classified as a merit good.",
  }),

  createQuestion({
    id: generateId("economics", 46),

    question:
      "The process by which government sells public enterprises is called",

    options: [
      "commercialization",
      "nationalization",
      "privatization",
      "liberalization",
    ],

    answer: 2,

    explanation:
      "Privatization involves transfer of ownership to private individuals.",
  }),

  createQuestion({
    id: generateId("economics", 47),

    question: "Inflation reduces the",

    options: [
      "purchasing power of money",
      "supply of goods",
      "size of population",
      "value of exports",
    ],

    answer: 0,

    explanation: "Inflation decreases the purchasing power of money.",
  }),

  createQuestion({
    id: generateId("economics", 48),

    question: "Which of the following is a source of government revenue?",

    options: ["Taxation", "Charity", "Donations only", "Population census"],

    answer: 0,

    explanation: "Taxes are a major source of government revenue.",
  }),

  createQuestion({
    id: generateId("economics", 49),

    question: "The quantity of goods available for sale is known as",

    options: ["demand", "distribution", "supply", "consumption"],

    answer: 2,

    explanation: "Supply refers to goods offered for sale.",
  }),

  createQuestion({
    id: generateId("economics", 50),

    question: "An increase in workers' wages may lead to",

    options: [
      "lower cost of production",
      "higher production cost",
      "fall in prices",
      "decrease in population",
    ],

    answer: 1,

    explanation: "Higher wages increase production costs.",
  }),

  createQuestion({
    id: generateId("economics", 51),

    question: "The stock exchange market deals mainly in",

    options: [
      "agricultural goods",
      "foreign currencies",
      "shares and securities",
      "consumer products",
    ],

    answer: 2,

    explanation: "Stock exchanges facilitate trading of shares and securities.",
  }),

  createQuestion({
    id: generateId("economics", 52),

    question: "Which of the following is NOT a factor of production?",

    options: ["Land", "Labour", "Capital", "Money"],

    answer: 3,

    explanation: "Money itself is not a factor of production.",
  }),

  createQuestion({
    id: generateId("economics", 53),

    question: "Demand becomes elastic when",

    options: [
      "there are no substitutes",
      "the commodity is a necessity",
      "many substitutes exist",
      "price remains constant",
    ],

    answer: 2,

    explanation: "Availability of substitutes makes demand elastic.",
  }),

  createQuestion({
    id: generateId("economics", 54),

    question: "The market structure with only one seller is",

    options: ["oligopoly", "perfect competition", "monopoly", "duopoly"],

    answer: 2,

    explanation: "Monopoly exists when there is only one seller.",
  }),

  createQuestion({
    id: generateId("economics", 55),

    question: "Fiscal policy is concerned with",

    options: [
      "government revenue and expenditure",
      "bank lending",
      "population control",
      "foreign exchange only",
    ],

    answer: 0,

    explanation: "Fiscal policy involves taxation and government spending.",
  }),

  createQuestion({
    id: generateId("economics", 56),

    question: "A decrease in unemployment generally indicates",

    options: [
      "economic growth",
      "economic depression",
      "low production",
      "poor education",
    ],

    answer: 0,

    explanation: "Economic growth creates employment opportunities.",
  }),

  createQuestion({
    id: generateId("economics", 57),

    question: "Which of the following is a feature of money?",

    options: ["Portability", "Perishability", "Immobility", "Elasticity"],

    answer: 0,

    explanation: "Money should be portable for easy movement.",
  }),

  createQuestion({
    id: generateId("economics", 58),

    question: "The demand for labour is called",

    options: [
      "joint demand",
      "derived demand",
      "composite demand",
      "competitive demand",
    ],

    answer: 1,

    explanation: "Labour demand depends on demand for goods produced.",
  }),

  createQuestion({
    id: generateId("economics", 59),

    question: "Which of the following can reduce inflation?",

    options: [
      "increase in money supply",
      "reduction in taxation",
      "higher interest rates",
      "increase in wages",
    ],

    answer: 2,

    explanation: "Higher interest rates reduce excess money circulation.",
  }),

  createQuestion({
    id: generateId("economics", 60),

    question: "National income refers to the",

    options: [
      "income of government officials",
      "total income earned in a country",
      "revenue from exports only",
      "profits made by firms",
    ],

    answer: 1,

    explanation:
      "National income is the total income earned within an economy.",
  }),
  createQuestion({
    id: generateId("economics", 61),

    question: "Which of the following is an example of an indirect tax?",

    options: ["Income tax", "Company tax", "Value Added Tax", "Poll tax"],

    answer: 2,

    explanation: "VAT is an indirect tax paid on goods and services.",
  }),

  createQuestion({
    id: generateId("economics", 62),

    question: "A country experiences favourable balance of trade when",

    options: [
      "imports exceed exports",
      "exports exceed imports",
      "imports equal exports",
      "exports are banned",
    ],

    answer: 1,

    explanation:
      "Favourable balance of trade occurs when exports are greater than imports.",
  }),

  createQuestion({
    id: generateId("economics", 63),

    question: "Which of the following is a characteristic of labour?",

    options: [
      "It is mobile",
      "It cannot be improved",
      "It is fixed in supply",
      "It is indestructible",
    ],

    answer: 0,

    explanation: "Labour can move from one occupation or location to another.",
  }),

  createQuestion({
    id: generateId("economics", 64),

    question: "The desire to own goods and services backed by money is called",

    options: ["need", "want", "demand", "supply"],

    answer: 2,

    explanation:
      "Demand is desire supported with ability and willingness to pay.",
  }),

  createQuestion({
    id: generateId("economics", 65),

    question: "The term 'utility' in economics means",

    options: [
      "profit gained",
      "usefulness or satisfaction",
      "government service",
      "production output",
    ],

    answer: 1,

    explanation: "Utility refers to satisfaction derived from consumption.",
  }),

  createQuestion({
    id: generateId("economics", 66),

    question:
      "An increase in supply is represented graphically by a shift of the supply curve to the",

    options: ["left", "right", "downward only", "upward only"],

    answer: 1,

    explanation: "Increase in supply shifts the curve to the right.",
  }),

  createQuestion({
    id: generateId("economics", 67),

    question: "Which of the following is a consequence of inflation?",

    options: [
      "increase in purchasing power",
      "fall in cost of living",
      "reduction in value of money",
      "increase in exports only",
    ],

    answer: 2,

    explanation: "Inflation reduces the value and purchasing power of money.",
  }),

  createQuestion({
    id: generateId("economics", 68),

    question: "The law of demand states that quantity demanded rises when",

    options: ["price rises", "price falls", "income falls", "supply falls"],

    answer: 1,

    explanation: "Consumers buy more when prices fall.",
  }),

  createQuestion({
    id: generateId("economics", 69),

    question: "A situation where a few firms dominate the market is known as",

    options: ["monopoly", "perfect competition", "oligopoly", "monopsony"],

    answer: 2,

    explanation: "Oligopoly is a market dominated by few firms.",
  }),

  createQuestion({
    id: generateId("economics", 70),

    question: "The reward for labour is",

    options: ["profit", "rent", "interest", "wages"],

    answer: 3,

    explanation: "Labour earns wages or salaries.",
  }),

  createQuestion({
    id: generateId("economics", 71),

    question: "Which of the following is a function of commercial banks?",

    options: [
      "Issuing currency",
      "Accepting deposits",
      "Printing money",
      "Making laws",
    ],

    answer: 1,

    explanation: "Commercial banks accept deposits from customers.",
  }),

  createQuestion({
    id: generateId("economics", 72),

    question: "The movement from rural to urban areas is called",

    options: [
      "urban drift",
      "rural migration",
      "urbanization",
      "industrialization",
    ],

    answer: 2,

    explanation: "Urbanization involves growth and movement into urban areas.",
  }),

  createQuestion({
    id: generateId("economics", 73),

    question: "Which of the following is NOT a function of the Central Bank?",

    options: [
      "Banker to government",
      "Issuing currency",
      "Accepting deposits from the public",
      "Control of money supply",
    ],

    answer: 2,

    explanation:
      "Commercial banks accept deposits from the public, not the central bank.",
  }),

  createQuestion({
    id: generateId("economics", 74),

    question: "The production possibility curve illustrates",

    options: [
      "scarcity and choice",
      "government spending",
      "market equilibrium",
      "consumer demand",
    ],

    answer: 0,

    explanation: "The PPC demonstrates scarcity, choice, and opportunity cost.",
  }),

  createQuestion({
    id: generateId("economics", 75),

    question: "Economic recession is characterized by",

    options: [
      "increase in employment",
      "decline in economic activities",
      "rise in exports only",
      "stable prices",
    ],

    answer: 1,

    explanation:
      "Recession involves decline in economic growth and activities.",
  }),

  createQuestion({
    id: generateId("economics", 76),

    question: "The minimum wage is fixed by",

    options: ["consumers", "government", "retailers", "manufacturers"],

    answer: 1,

    explanation: "Governments set minimum wage regulations.",
  }),

  createQuestion({
    id: generateId("economics", 77),

    question:
      "The quantity of money in circulation is controlled mainly by the",

    options: [
      "commercial banks",
      "stock exchange",
      "central bank",
      "finance ministry",
    ],

    answer: 2,

    explanation: "The central bank regulates money supply.",
  }),

  createQuestion({
    id: generateId("economics", 78),

    question: "A rise in population without increase in output may lead to",

    options: [
      "higher standard of living",
      "inflation",
      "economic boom",
      "surplus production",
    ],

    answer: 1,

    explanation: "Higher population with low output can increase prices.",
  }),

  createQuestion({
    id: generateId("economics", 79),

    question: "Which of the following is a feature of perfect competition?",

    options: [
      "single seller",
      "product differentiation",
      "free entry and exit",
      "price discrimination",
    ],

    answer: 2,

    explanation: "Perfect competition allows free entry and exit of firms.",
  }),

  createQuestion({
    id: generateId("economics", 80),

    question: "When demand equals supply, the market is said to be in",

    options: ["inflation", "equilibrium", "depression", "recession"],

    answer: 1,

    explanation: "Equilibrium occurs where demand and supply are equal.",
  }),
];

/* =========================================================
LITERATURE
========================================================= */
const literature = [
  createQuestion({
    id: generateId("literature", 1),

    year: 2018,

    question: "In literature, a story that teaches a moral lesson is known as",

    options: ["Parody", "Allegory", "Satire", "Farce"],

    answer: 1,

    explanation:
      "An allegory is a story with both literal and deeper moral meanings.",
  }),

  createQuestion({
    id: generateId("literature", 2),

    year: 2019,

    question:
      "A poem that expresses sorrow, especially for the dead, is called",

    options: ["Ode", "Sonnet", "Elegy", "Ballad"],

    answer: 2,

    explanation:
      "An elegy is a mournful poem usually written in remembrance of the dead.",
  }),

  createQuestion({
    id: generateId("literature", 3),

    year: 2020,

    question: "The major aim of satire in literature is to",

    options: [
      "Praise society",
      "Ridicule human weaknesses",
      "Promote romance",
      "Describe nature",
    ],

    answer: 1,

    explanation:
      "Satire uses humor, irony, or ridicule to expose and criticize flaws.",
  }),

  createQuestion({
    id: generateId("literature", 4),

    year: 2017,

    question: "A narrative poem that tells a story is known as",

    options: ["Epic", "Lyric", "Ode", "Sonnet"],

    answer: 0,

    explanation:
      "An epic is a long narrative poem centered on heroic actions and events.",
  }),

  createQuestion({
    id: generateId("literature", 5),

    year: 2021,

    question: "The protagonist in a literary work refers to the",

    options: ["Villain", "Narrator", "Main character", "Minor character"],

    answer: 2,

    explanation:
      "The protagonist is the central or leading character in a literary work.",
  }),

  createQuestion({
    id: generateId("literature", 6),

    year: 2016,

    question:
      "A figure of speech that compares two things using 'like' or 'as' is",

    options: ["Metaphor", "Irony", "Simile", "Hyperbole"],

    answer: 2,

    explanation:
      "A simile directly compares two unlike things using 'like' or 'as'.",
  }),

  createQuestion({
    id: generateId("literature", 7),

    year: 2022,

    question:
      "The atmosphere or emotional feeling created in a literary work is called",

    options: ["Tone", "Mood", "Theme", "Style"],

    answer: 1,

    explanation:
      "Mood refers to the emotional atmosphere experienced by the reader.",
  }),

  createQuestion({
    id: generateId("literature", 8),

    year: 2015,

    question: "A play that ends sadly is referred to as",

    options: ["Comedy", "Farce", "Tragedy", "Satire"],

    answer: 2,

    explanation:
      "A tragedy is a dramatic work that ends in suffering or disaster.",
  }),

  createQuestion({
    id: generateId("literature", 9),

    year: 2023,

    question:
      "The repetition of consonant sounds at the beginning of words is known as",

    options: ["Assonance", "Alliteration", "Onomatopoeia", "Pun"],

    answer: 1,

    explanation:
      "Alliteration involves repeating consonant sounds at the start of nearby words.",
  }),

  createQuestion({
    id: generateId("literature", 10),

    year: 2018,

    question: "The central idea or message of a literary work is called the",

    options: ["Plot", "Theme", "Setting", "Conflict"],

    answer: 1,

    explanation:
      "Theme is the main idea or underlying meaning of a literary work.",
  }),

  createQuestion({
    id: generateId("literature", 11),

    year: 2019,

    question:
      "A literary device in which an object represents a deeper meaning is called",

    options: ["Symbolism", "Irony", "Flashback", "Suspense"],

    answer: 0,

    explanation:
      "Symbolism uses objects, characters, or events to represent deeper ideas.",
  }),

  createQuestion({
    id: generateId("literature", 12),

    year: 2020,

    question: "The sequence of events in a literary work is known as the",

    options: ["Theme", "Setting", "Plot", "Tone"],

    answer: 2,

    explanation:
      "Plot refers to the arrangement of events in a story or drama.",
  }),

  createQuestion({
    id: generateId("literature", 13),

    year: 2017,

    question: "A literary work written to be performed on stage is called",

    options: ["Novel", "Poem", "Drama", "Essay"],

    answer: 2,

    explanation:
      "Drama is a literary genre designed for theatrical performance.",
  }),

  createQuestion({
    id: generateId("literature", 14),

    year: 2021,

    question: "The use of exaggerated statements for emphasis is known as",

    options: ["Hyperbole", "Metaphor", "Pun", "Irony"],

    answer: 0,

    explanation:
      "Hyperbole involves deliberate exaggeration for emphasis or effect.",
  }),

  createQuestion({
    id: generateId("literature", 15),

    year: 2016,

    question: "A fourteen-line poem is known as a",

    options: ["Ballad", "Ode", "Sonnet", "Epic"],

    answer: 2,

    explanation:
      "A sonnet is a poem consisting of fourteen lines, often with a fixed rhyme scheme.",
  }),

  createQuestion({
    id: generateId("literature", 16),

    year: 2022,

    question:
      "The time and place in which a literary work occurs is called the",

    options: ["Theme", "Conflict", "Setting", "Climax"],

    answer: 2,

    explanation: "Setting refers to the location and time period of a story.",
  }),

  createQuestion({
    id: generateId("literature", 17),

    year: 2018,

    question: "A humorous play with exaggerated characters is called",

    options: ["Farce", "Epic", "Elegy", "Tragedy"],

    answer: 0,

    explanation:
      "Farce is a comic dramatic work using exaggerated situations and characters.",
  }),

  createQuestion({
    id: generateId("literature", 18),

    year: 2023,

    question: "The conflict between a character and society is classified as",

    options: [
      "Internal conflict",
      "Man versus society",
      "Man versus self",
      "Man versus nature",
    ],

    answer: 1,

    explanation:
      "Man versus society conflict occurs when a character struggles against societal norms.",
  }),

  createQuestion({
    id: generateId("literature", 19),

    year: 2015,

    question: "Words that imitate natural sounds are examples of",

    options: ["Pun", "Alliteration", "Onomatopoeia", "Assonance"],

    answer: 2,

    explanation:
      "Onomatopoeia refers to words that imitate sounds, such as 'buzz' or 'hiss'.",
  }),

  createQuestion({
    id: generateId("literature", 20),

    year: 2020,

    question:
      "A story that is not true to life and often contains magical elements is known as",

    options: ["Biography", "Fantasy", "Autobiography", "Memoir"],

    answer: 1,

    explanation:
      "Fantasy literature contains imaginative and magical elements beyond reality.",
  }),
  createQuestion({
    id: generateId("literature", 21),

    year: 2021,

    question: "The person who tells a story is known as the",

    options: ["Protagonist", "Narrator", "Antagonist", "Playwright"],

    answer: 1,

    explanation: "The narrator is the voice or character that tells the story.",
  }),

  createQuestion({
    id: generateId("literature", 22),

    year: 2019,

    question:
      "A contrast between appearance and reality in literature is called",

    options: ["Irony", "Paradox", "Pun", "Climax"],

    answer: 0,

    explanation:
      "Irony occurs when there is a difference between expectation and reality.",
  }),

  createQuestion({
    id: generateId("literature", 23),

    year: 2017,

    question: "The highest point of tension in a literary work is the",

    options: ["Resolution", "Exposition", "Climax", "Setting"],

    answer: 2,

    explanation:
      "The climax is the turning point or moment of greatest tension in a story.",
  }),

  createQuestion({
    id: generateId("literature", 24),

    year: 2022,

    question: "A poem that celebrates a person or event is called an",

    options: ["Elegy", "Epic", "Ode", "Satire"],

    answer: 2,

    explanation:
      "An ode is a lyrical poem written in praise of a person, object, or event.",
  }),

  createQuestion({
    id: generateId("literature", 25),

    year: 2016,

    question: "The villain or opposing force in a literary work is the",

    options: ["Antagonist", "Narrator", "Protagonist", "Chorus"],

    answer: 0,

    explanation: "The antagonist opposes the protagonist in a literary work.",
  }),

  createQuestion({
    id: generateId("literature", 26),

    year: 2020,

    question:
      "A comparison between two unlike things without using 'like' or 'as' is",

    options: ["Simile", "Irony", "Metaphor", "Pun"],

    answer: 2,

    explanation:
      "A metaphor directly compares two unlike things without using 'like' or 'as'.",
  }),

  createQuestion({
    id: generateId("literature", 27),

    year: 2023,

    question: "A literary work that ridicules human foolishness is known as",

    options: ["Comedy", "Satire", "Epic", "Tragedy"],

    answer: 1,

    explanation:
      "Satire exposes and criticizes foolishness or corruption using humor or irony.",
  }),

  createQuestion({
    id: generateId("literature", 28),

    year: 2018,

    question: "The emotional attitude of a writer toward a subject is called",

    options: ["Tone", "Theme", "Mood", "Style"],

    answer: 0,

    explanation:
      "Tone reflects the writer’s attitude toward the subject or audience.",
  }),

  createQuestion({
    id: generateId("literature", 29),

    year: 2021,

    question: "The use of hints about future events in a story is called",

    options: ["Flashback", "Foreshadowing", "Suspense", "Climax"],

    answer: 1,

    explanation:
      "Foreshadowing gives clues or hints about events that will happen later.",
  }),

  createQuestion({
    id: generateId("literature", 30),

    year: 2015,

    question:
      "A story passed down orally from generation to generation is known as",

    options: ["Myth", "Folktale", "Biography", "Novel"],

    answer: 1,

    explanation:
      "Folktales are traditional stories transmitted orally across generations.",
  }),

  createQuestion({
    id: generateId("literature", 31),

    year: 2019,

    question: "The repeated vowel sound in nearby words is called",

    options: ["Alliteration", "Assonance", "Consonance", "Onomatopoeia"],

    answer: 1,

    explanation:
      "Assonance is the repetition of vowel sounds within nearby words.",
  }),

  createQuestion({
    id: generateId("literature", 32),

    year: 2022,

    question:
      "A written account of a person's life by another person is called",

    options: ["Autobiography", "Memoir", "Biography", "Legend"],

    answer: 2,

    explanation:
      "A biography is a written account of someone's life by another person.",
  }),

  createQuestion({
    id: generateId("literature", 33),

    year: 2017,

    question: "A struggle within a character’s mind is known as",

    options: [
      "External conflict",
      "Man versus society",
      "Internal conflict",
      "Man versus nature",
    ],

    answer: 2,

    explanation:
      "Internal conflict occurs within a character’s thoughts or emotions.",
  }),

  createQuestion({
    id: generateId("literature", 34),

    year: 2020,

    question: "A play intended to make the audience laugh is called",

    options: ["Tragedy", "Comedy", "Epic", "Elegy"],

    answer: 1,

    explanation:
      "Comedy is a dramatic work created mainly for humor and amusement.",
  }),

  createQuestion({
    id: generateId("literature", 35),

    year: 2023,

    question:
      "The arrangement of events in the order they happened is known as",

    options: ["Chronological order", "Foreshadowing", "Flashback", "Suspense"],

    answer: 0,

    explanation:
      "Chronological order presents events according to time sequence.",
  }),

  createQuestion({
    id: generateId("literature", 36),

    year: 2016,

    question: "A poem that tells a heroic story is called an",

    options: ["Ode", "Epic", "Elegy", "Lyric"],

    answer: 1,

    explanation: "An epic is a long narrative poem about heroic deeds.",
  }),

  createQuestion({
    id: generateId("literature", 37),

    year: 2021,

    question:
      "The use of animal characters to teach moral lessons is common in",

    options: ["Fables", "Novels", "Lyrics", "Biographies"],

    answer: 0,

    explanation:
      "Fables are short stories, often with animals, that teach morals.",
  }),

  createQuestion({
    id: generateId("literature", 38),

    year: 2018,

    question: "The part of a plot where conflicts begin to develop is the",

    options: ["Resolution", "Rising action", "Climax", "Falling action"],

    answer: 1,

    explanation: "Rising action develops the story’s conflict and tension.",
  }),

  createQuestion({
    id: generateId("literature", 39),

    year: 2020,

    question:
      "A literary work that imitates another in a humorous way is called",

    options: ["Parody", "Epic", "Satire", "Tragedy"],

    answer: 0,

    explanation: "Parody humorously imitates another work or style.",
  }),

  createQuestion({
    id: generateId("literature", 40),

    year: 2015,

    question: "The final outcome of events in a story is called the",

    options: ["Conflict", "Resolution", "Climax", "Theme"],

    answer: 1,

    explanation: "Resolution is the conclusion where conflicts are settled.",
  }),

  createQuestion({
    id: generateId("literature", 41),

    year: 2022,

    question: "The direct opposite of a protagonist is the",

    options: ["Narrator", "Chorus", "Antagonist", "Minor character"],

    answer: 2,

    explanation: "The antagonist opposes or challenges the protagonist.",
  }),

  createQuestion({
    id: generateId("literature", 42),

    year: 2019,

    question: "A poem expressing personal feelings is known as a",

    options: ["Lyric", "Epic", "Drama", "Novel"],

    answer: 0,

    explanation: "A lyric poem expresses deep personal emotions and feelings.",
  }),

  createQuestion({
    id: generateId("literature", 43),

    year: 2021,

    question:
      "The background information at the beginning of a story is called",

    options: ["Exposition", "Climax", "Conflict", "Suspense"],

    answer: 0,

    explanation:
      "Exposition introduces characters, setting, and background details.",
  }),

  createQuestion({
    id: generateId("literature", 44),

    year: 2017,

    question: "A work written by an author about his or her own life is called",

    options: ["Biography", "Autobiography", "Legend", "Memoir"],

    answer: 1,

    explanation: "An autobiography is a self-written account of one’s life.",
  }),

  createQuestion({
    id: generateId("literature", 45),

    year: 2020,

    question: "The use of clues to maintain readers' interest is known as",

    options: ["Suspense", "Mood", "Tone", "Satire"],

    answer: 0,

    explanation: "Suspense creates anticipation and curiosity in readers.",
  }),

  createQuestion({
    id: generateId("literature", 46),

    year: 2023,

    question: "A traditional story explaining natural events is called a",

    options: ["Biography", "Myth", "Novel", "Comedy"],

    answer: 1,

    explanation:
      "Myths are traditional stories explaining origins or natural phenomena.",
  }),

  createQuestion({
    id: generateId("literature", 47),

    year: 2016,

    question: "A dramatic speech by one actor alone on stage is called a",

    options: ["Dialogue", "Monologue", "Aside", "Chorus"],

    answer: 1,

    explanation: "A monologue is a long speech delivered by one character.",
  }),

  createQuestion({
    id: generateId("literature", 48),

    year: 2022,

    question: "The deliberate use of understatement for emphasis is called",

    options: ["Hyperbole", "Litotes", "Pun", "Metaphor"],

    answer: 1,

    explanation: "Litotes uses understatement to emphasize an idea.",
  }),

  createQuestion({
    id: generateId("literature", 49),

    year: 2018,

    question: "The major divisions of a play are called",

    options: ["Verses", "Acts", "Stanzas", "Chapters"],

    answer: 1,

    explanation: "Plays are divided into acts and scenes.",
  }),

  createQuestion({
    id: generateId("literature", 50),

    year: 2021,

    question: "A group of lines in a poem is known as a",

    options: ["Scene", "Paragraph", "Stanza", "Act"],

    answer: 2,

    explanation: "A stanza is a grouped set of lines in poetry.",
  }),

  createQuestion({
    id: generateId("literature", 51),

    year: 2017,

    question:
      "The use of the same consonant sound within nearby words is called",

    options: ["Consonance", "Assonance", "Alliteration", "Irony"],

    answer: 0,

    explanation:
      "Consonance refers to the repetition of consonant sounds within words.",
  }),

  createQuestion({
    id: generateId("literature", 52),

    year: 2020,

    question:
      "A brief reference to a historical or literary figure is known as",

    options: ["Allusion", "Illusion", "Paradox", "Pun"],

    answer: 0,

    explanation:
      "An allusion is an indirect reference to a person, event, or literary work.",
  }),

  createQuestion({
    id: generateId("literature", 53),

    year: 2023,

    question: "The perspective from which a story is told is known as",

    options: ["Point of view", "Mood", "Tone", "Conflict"],

    answer: 0,

    explanation:
      "Point of view refers to the narrator’s position in telling the story.",
  }),

  createQuestion({
    id: generateId("literature", 54),

    year: 2019,

    question:
      "A literary work in prose form and of considerable length is called a",

    options: ["Play", "Novel", "Lyric", "Ballad"],

    answer: 1,

    explanation: "A novel is a long fictional prose narrative.",
  }),

  createQuestion({
    id: generateId("literature", 55),

    year: 2018,

    question:
      "The repetition of words at the beginning of successive lines is called",

    options: ["Anaphora", "Hyperbole", "Parody", "Pun"],

    answer: 0,

    explanation:
      "Anaphora involves repeating words or phrases at the start of lines or sentences.",
  }),

  createQuestion({
    id: generateId("literature", 56),

    year: 2021,

    question: "A sudden insight experienced by a character is known as",

    options: ["Catharsis", "Epiphany", "Climax", "Conflict"],

    answer: 1,

    explanation:
      "Epiphany is a sudden realization or understanding by a character.",
  }),

  createQuestion({
    id: generateId("literature", 57),

    year: 2016,

    question:
      "A character that changes significantly during a story is described as",

    options: ["Static", "Flat", "Dynamic", "Minor"],

    answer: 2,

    explanation:
      "A dynamic character undergoes important changes throughout the story.",
  }),

  createQuestion({
    id: generateId("literature", 58),

    year: 2022,

    question: "A humorous statement with a double meaning is called a",

    options: ["Pun", "Metaphor", "Elegy", "Paradox"],

    answer: 0,

    explanation: "A pun is a play on words involving multiple meanings.",
  }),

  createQuestion({
    id: generateId("literature", 59),

    year: 2020,

    question:
      "The emotional release experienced by the audience in tragedy is known as",

    options: ["Catharsis", "Foreshadowing", "Irony", "Satire"],

    answer: 0,

    explanation:
      "Catharsis refers to the emotional purification experienced after tragedy.",
  }),

  createQuestion({
    id: generateId("literature", 60),

    year: 2015,

    question: "A character that does not change throughout a story is called",

    options: ["Dynamic", "Round", "Static", "Major"],

    answer: 2,

    explanation:
      "A static character remains the same throughout the narrative.",
  }),

  createQuestion({
    id: generateId("literature", 61),

    year: 2019,

    question:
      "The use of contradictory statements that reveal truth is known as",

    options: ["Pun", "Paradox", "Hyperbole", "Allusion"],

    answer: 1,

    explanation:
      "A paradox combines contradictory ideas that reveal a deeper truth.",
  }),

  createQuestion({
    id: generateId("literature", 62),

    year: 2023,

    question:
      "A short story with animal characters teaching morals is called a",

    options: ["Fable", "Epic", "Legend", "Biography"],

    answer: 0,

    explanation: "Fables often use animals to teach moral lessons.",
  }),

  createQuestion({
    id: generateId("literature", 63),

    year: 2017,

    question: "The rhythm pattern in poetry is determined by",

    options: ["Meter", "Conflict", "Theme", "Suspense"],

    answer: 0,

    explanation:
      "Meter refers to the rhythmic arrangement of stressed and unstressed syllables.",
  }),

  createQuestion({
    id: generateId("literature", 64),

    year: 2021,

    question:
      "A long speech revealing a character’s thoughts alone on stage is called",

    options: ["Dialogue", "Soliloquy", "Aside", "Monologue"],

    answer: 1,

    explanation: "A soliloquy expresses a character’s private thoughts aloud.",
  }),

  createQuestion({
    id: generateId("literature", 65),

    year: 2018,

    question:
      "The use of humor to correct societal faults is characteristic of",

    options: ["Satire", "Elegy", "Epic", "Lyric"],

    answer: 0,

    explanation: "Satire criticizes societal issues through humor and irony.",
  }),

  createQuestion({
    id: generateId("literature", 66),

    year: 2020,

    question: "The narrator who uses 'I' while telling a story uses",

    options: [
      "First person point of view",
      "Third person point of view",
      "Omniscient narration",
      "Objective narration",
    ],

    answer: 0,

    explanation:
      "First person narration involves the narrator speaking as 'I'.",
  }),

  createQuestion({
    id: generateId("literature", 67),

    year: 2022,

    question:
      "A literary work based on imaginary future scientific developments is",

    options: ["Fantasy", "Science fiction", "Legend", "Myth"],

    answer: 1,

    explanation:
      "Science fiction explores imaginative scientific or futuristic ideas.",
  }),

  createQuestion({
    id: generateId("literature", 68),

    year: 2016,

    question: "The pattern of rhymes in a poem is known as",

    options: ["Rhythm", "Rhyme scheme", "Meter", "Stanza"],

    answer: 1,

    explanation:
      "Rhyme scheme describes the arrangement of rhyming lines in poetry.",
  }),

  createQuestion({
    id: generateId("literature", 69),

    year: 2023,

    question:
      "A story handed down about heroes and historical events is called a",

    options: ["Legend", "Myth", "Satire", "Comedy"],

    answer: 0,

    explanation:
      "Legends are traditional stories about heroic or historical figures.",
  }),

  createQuestion({
    id: generateId("literature", 70),

    year: 2019,

    question: "The use of clues that hint at future events creates",

    options: ["Mood", "Foreshadowing", "Conflict", "Satire"],

    answer: 1,

    explanation: "Foreshadowing hints at future developments in a story.",
  }),

  createQuestion({
    id: generateId("literature", 71),

    year: 2021,

    question: "A short humorous poem of five lines is known as a",

    options: ["Sonnet", "Epic", "Limerick", "Elegy"],

    answer: 2,

    explanation:
      "A limerick is a five-line humorous poem with a specific rhyme scheme.",
  }),

  createQuestion({
    id: generateId("literature", 72),

    year: 2017,

    question: "The language style unique to an author is known as",

    options: ["Mood", "Style", "Theme", "Conflict"],

    answer: 1,

    explanation: "Style refers to an author's distinctive way of writing.",
  }),

  createQuestion({
    id: generateId("literature", 73),

    year: 2020,

    question:
      "A work that tells about gods and supernatural beings is usually a",

    options: ["Myth", "Novel", "Biography", "Comedy"],

    answer: 0,

    explanation: "Myths commonly feature gods and supernatural events.",
  }),

  createQuestion({
    id: generateId("literature", 74),

    year: 2018,

    question: "The use of suspense in literature helps to",

    options: [
      "Confuse readers",
      "Maintain readers’ interest",
      "Shorten the story",
      "Reduce tension",
    ],

    answer: 1,

    explanation: "Suspense keeps readers eager to know what happens next.",
  }),

  createQuestion({
    id: generateId("literature", 75),

    year: 2022,

    question: "A poem written in honor of a dead person is called an",

    options: ["Ode", "Elegy", "Epic", "Ballad"],

    answer: 1,

    explanation: "An elegy mourns or honors the dead.",
  }),

  createQuestion({
    id: generateId("literature", 76),

    year: 2019,

    question:
      "The use of vivid descriptive language appealing to the senses is called",

    options: ["Imagery", "Irony", "Pun", "Satire"],

    answer: 0,

    explanation:
      "Imagery creates mental pictures through descriptive language.",
  }),

  createQuestion({
    id: generateId("literature", 77),

    year: 2021,

    question: "The conversation between characters in a play is known as",

    options: ["Dialogue", "Monologue", "Aside", "Soliloquy"],

    answer: 0,

    explanation: "Dialogue is the spoken interaction between characters.",
  }),

  createQuestion({
    id: generateId("literature", 78),

    year: 2016,

    question: "A literary work intended to instruct morally is called",

    options: ["Didactic literature", "Fantasy", "Satire", "Comedy"],

    answer: 0,

    explanation:
      "Didactic literature is written mainly to teach moral lessons.",
  }),

  createQuestion({
    id: generateId("literature", 79),

    year: 2023,

    question:
      "The events after the climax leading to the conclusion are known as",

    options: ["Rising action", "Exposition", "Falling action", "Conflict"],

    answer: 2,

    explanation:
      "Falling action follows the climax and leads toward resolution.",
  }),

  createQuestion({
    id: generateId("literature", 80),

    year: 2020,

    question: "The use of ridicule and sarcasm to expose vice is known as",

    options: ["Comedy", "Satire", "Elegy", "Epic"],

    answer: 1,

    explanation:
      "Satire criticizes vice or folly through ridicule and sarcasm.",
  }),
];

/* =========================================================
ACCOUNTING
========================================================= */
const accounting = [
  createQuestion({
    id: generateId("accounting", 1),

    year: 2020,

    question: "The accounting equation is expressed as",

    options: [
      "Assets = Liabilities + Capital",
      "Assets = Capital - Liabilities",
      "Capital = Assets + Liabilities",
      "Liabilities = Assets + Capital",
    ],

    answer: 0,

    explanation:
      "The basic accounting equation states that Assets = Liabilities + Capital.",
  }),

  createQuestion({
    id: generateId("accounting", 2),

    year: 2019,

    question:
      "A statement showing the financial position of a business is called",

    options: [
      "Income statement",
      "Balance sheet",
      "Trial balance",
      "Cash book",
    ],

    answer: 1,

    explanation:
      "A balance sheet shows the assets, liabilities, and capital of a business at a point in time.",
  }),

  createQuestion({
    id: generateId("accounting", 3),

    year: 2021,

    question: "Which of the following is a book of original entry?",

    options: ["Ledger", "Trial balance", "Journal", "Balance sheet"],

    answer: 2,

    explanation:
      "The journal is a book of original entry where transactions are first recorded.",
  }),

  createQuestion({
    id: generateId("accounting", 4),

    year: 2018,

    question: "The double entry principle states that",

    options: [
      "Every debit has a corresponding credit",
      "Every asset has a liability",
      "Every income is a liability",
      "Every expense is capital",
    ],

    answer: 0,

    explanation:
      "Double entry means every transaction affects two accounts equally.",
  }),

  createQuestion({
    id: generateId("accounting", 5),

    year: 2022,

    question: "The total of debit and credit in a trial balance should be",

    options: [
      "Unequal",
      "Equal",
      "Greater on debit side",
      "Greater on credit side",
    ],

    answer: 1,

    explanation:
      "In a correct trial balance, total debits must equal total credits.",
  }),

  createQuestion({
    id: generateId("accounting", 6),

    year: 2020,

    question: "Cash discount is recorded in the",

    options: [
      "Cash book",
      "Ledger only",
      "Balance sheet",
      "Trial balance only",
    ],

    answer: 0,

    explanation:
      "Cash discounts are recorded in the cash book as they involve cash transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 7),

    year: 2019,

    question: "An asset that can easily be converted into cash is called",

    options: [
      "Fixed asset",
      "Current asset",
      "Intangible asset",
      "Long-term liability",
    ],

    answer: 1,

    explanation:
      "Current assets include cash and other assets that can be quickly converted into cash.",
  }),

  createQuestion({
    id: generateId("accounting", 8),

    year: 2021,

    question: "Depreciation refers to",

    options: [
      "Increase in asset value",
      "Decrease in asset value",
      "Increase in liabilities",
      "Increase in profit",
    ],

    answer: 1,

    explanation:
      "Depreciation is the gradual reduction in the value of fixed assets over time.",
  }),

  createQuestion({
    id: generateId("accounting", 9),

    year: 2017,

    question: "The purpose of a trial balance is to",

    options: [
      "Determine profit",
      "Check arithmetical accuracy of accounts",
      "Prepare tax returns",
      "Record transactions",
    ],

    answer: 1,

    explanation:
      "A trial balance checks the arithmetic accuracy of ledger postings.",
  }),

  createQuestion({
    id: generateId("accounting", 10),

    year: 2023,

    question: "Capital introduced into the business increases",

    options: [
      "Liabilities and expenses",
      "Assets and capital",
      "Expenses and revenue",
      "Liabilities and income",
    ],

    answer: 1,

    explanation:
      "When capital is introduced, both assets (cash) and capital increase.",
  }),

  createQuestion({
    id: generateId("accounting", 11),

    year: 2020,

    question: "The document used to record daily cash transactions is called",

    options: ["Journal", "Cash book", "Ledger", "Invoice"],

    answer: 1,

    explanation:
      "The cash book is used to record all cash receipts and payments.",
  }),

  createQuestion({
    id: generateId("accounting", 12),

    year: 2018,

    question: "A credit entry increases",

    options: [
      "Assets and expenses",
      "Liabilities and capital",
      "Drawings",
      "Cash only",
    ],

    answer: 1,

    explanation: "Credits increase liabilities, income, and capital accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 13),

    year: 2021,

    question: "The difference between total revenue and total expenses is",

    options: ["Capital", "Profit or loss", "Assets", "Liabilities"],

    answer: 1,

    explanation:
      "Profit or loss is the difference between total revenue and total expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 14),

    year: 2019,

    question: "Which of the following is NOT a liability?",

    options: ["Bank overdraft", "Creditors", "Capital", "Loans"],

    answer: 2,

    explanation:
      "Capital belongs to the owner, not a liability owed to outsiders.",
  }),

  createQuestion({
    id: generateId("accounting", 15),

    year: 2022,

    question: "A debit entry increases",

    options: ["Liabilities", "Income", "Assets", "Capital"],

    answer: 2,

    explanation: "Debits increase assets and expenses in accounting.",
  }),

  createQuestion({
    id: generateId("accounting", 16),

    year: 2020,

    question: "The ledger is used to",

    options: [
      "Record original transactions",
      "Summarize journal entries",
      "Prepare receipts only",
      "Calculate tax",
    ],

    answer: 1,

    explanation:
      "The ledger classifies and summarizes transactions from the journal.",
  }),

  createQuestion({
    id: generateId("accounting", 17),

    year: 2017,

    question:
      "An account showing goods taken by the owner for personal use is called",

    options: [
      "Capital account",
      "Drawings account",
      "Purchases account",
      "Sales account",
    ],

    answer: 1,

    explanation: "Drawings account records goods or cash taken by the owner.",
  }),

  createQuestion({
    id: generateId("accounting", 18),

    year: 2023,

    question: "Which of the following is a source document?",

    options: ["Balance sheet", "Invoice", "Trial balance", "Ledger"],

    answer: 1,

    explanation: "An invoice is a source document used to record transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 19),

    year: 2019,

    question: "The purpose of depreciation is to",

    options: [
      "Increase asset value",
      "Spread cost of asset over its useful life",
      "Increase profit",
      "Reduce liabilities",
    ],

    answer: 1,

    explanation:
      "Depreciation allocates the cost of an asset over its useful life.",
  }),

  createQuestion({
    id: generateId("accounting", 20),

    year: 2021,

    question: "A bank statement is prepared by",

    options: ["Business owner", "Bank", "Customer", "Auditor"],

    answer: 1,

    explanation:
      "A bank statement is issued by the bank showing account transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 21),

    year: 2018,

    question: "The accounting period is usually",

    options: ["1 day", "1 month", "1 year", "5 years"],

    answer: 2,

    explanation: "Financial statements are usually prepared annually.",
  }),

  createQuestion({
    id: generateId("accounting", 22),

    year: 2022,

    question: "Which of the following is a non-current asset?",

    options: ["Stock", "Cash", "Building", "Debtors"],

    answer: 2,

    explanation: "Buildings are long-term assets used in business operations.",
  }),

  createQuestion({
    id: generateId("accounting", 23),

    year: 2020,

    question: "The purpose of posting to the ledger is to",

    options: [
      "Record transactions randomly",
      "Classify transactions",
      "Destroy records",
      "Hide errors",
    ],

    answer: 1,

    explanation: "Ledger posting classifies transactions into accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 24),

    year: 2019,

    question: "A suspense account is used to",

    options: [
      "Hide fraud",
      "Correct errors temporarily",
      "Record sales",
      "Record assets permanently",
    ],

    answer: 1,

    explanation: "Suspense accounts temporarily hold unclassified entries.",
  }),

  createQuestion({
    id: generateId("accounting", 25),

    year: 2021,

    question: "Which of the following is NOT part of double entry system?",

    options: ["Debit entry", "Credit entry", "Single entry", "Ledger posting"],

    answer: 2,

    explanation: "Single entry is not part of the double entry system.",
  }),

  createQuestion({
    id: generateId("accounting", 26),

    year: 2017,

    question: "Accrued expenses are",

    options: [
      "Paid in advance",
      "Owed but not yet paid",
      "Fully paid",
      "Written off",
    ],

    answer: 1,

    explanation: "Accrued expenses are expenses incurred but not yet paid.",
  }),

  createQuestion({
    id: generateId("accounting", 27),

    year: 2023,

    question: "Prepaid income is treated as",

    options: ["Asset", "Expense", "Liability", "Capital"],

    answer: 2,

    explanation:
      "Prepaid income is a liability because service is yet to be provided.",
  }),

  createQuestion({
    id: generateId("accounting", 28),

    year: 2018,

    question: "The purchase of a motor vehicle on credit increases",

    options: [
      "Assets and liabilities",
      "Assets only",
      "Expenses only",
      "Capital only",
    ],

    answer: 0,

    explanation: "Both asset (vehicle) and liability (creditor) increase.",
  }),

  createQuestion({
    id: generateId("accounting", 29),

    year: 2020,

    question: "The total of the credit side of a cash book represents",

    options: ["Cash receipts", "Cash payments", "Capital", "Profit"],

    answer: 1,

    explanation: "Credit side of cash book records cash payments.",
  }),

  createQuestion({
    id: generateId("accounting", 30),

    year: 2019,

    question: "Which of the following is used to correct errors in accounts?",

    options: ["Ledger", "Journal proper", "Cash book", "Balance sheet"],

    answer: 1,

    explanation:
      "Journal proper is used for correcting errors in accounting records.",
  }),

  createQuestion({
    id: generateId("accounting", 31),

    year: 2021,

    question: "The term 'drawings' refers to",

    options: [
      "Business expenses",
      "Owner’s withdrawal of assets",
      "Business income",
      "Bank loan",
    ],

    answer: 1,

    explanation:
      "Drawings are withdrawals made by the owner from the business.",
  }),

  createQuestion({
    id: generateId("accounting", 32),

    year: 2018,

    question: "Which of the following is a liability?",

    options: ["Land", "Cash", "Creditors", "Stock"],

    answer: 2,

    explanation: "Creditors are amounts owed to outsiders and are liabilities.",
  }),

  createQuestion({
    id: generateId("accounting", 33),

    year: 2022,

    question: "The matching principle in accounting ensures",

    options: [
      "Expenses match revenue",
      "Assets equal liabilities",
      "Cash equals bank",
      "Profit is ignored",
    ],

    answer: 0,

    explanation:
      "Expenses must be matched with the revenue of the same period.",
  }),

  createQuestion({
    id: generateId("accounting", 34),

    year: 2020,

    question: "A debit balance in a cash book represents",

    options: [
      "Bank overdraft",
      "Cash at bank",
      "Credit sales",
      "Credit purchases",
    ],

    answer: 1,

    explanation: "A debit balance shows cash available in the bank account.",
  }),

  createQuestion({
    id: generateId("accounting", 35),

    year: 2017,

    question: "The main purpose of accounting is to",

    options: [
      "Record and communicate financial information",
      "Increase profit",
      "Avoid taxation",
      "Reduce expenses only",
    ],

    answer: 0,

    explanation:
      "Accounting records and communicates financial information to users.",
  }),

  createQuestion({
    id: generateId("accounting", 36),

    year: 2023,

    question: "Which of the following is NOT a financial statement?",

    options: [
      "Income statement",
      "Balance sheet",
      "Trial balance",
      "Cash book",
    ],

    answer: 3,

    explanation:
      "Cash book is a book of original entry, not a financial statement.",
  }),

  createQuestion({
    id: generateId("accounting", 37),

    year: 2019,

    question: "The posting of transactions to the ledger is done from the",

    options: ["Balance sheet", "Journal", "Trial balance", "Invoice"],

    answer: 1,

    explanation:
      "Transactions are first recorded in the journal before posting to ledger.",
  }),

  createQuestion({
    id: generateId("accounting", 38),

    year: 2021,

    question: "Capital expenditure is expenditure on",

    options: ["Daily expenses", "Long-term assets", "Wages", "Rent"],

    answer: 1,

    explanation:
      "Capital expenditure is spent on acquiring or improving fixed assets.",
  }),

  createQuestion({
    id: generateId("accounting", 39),

    year: 2020,

    question: "Revenue expenditure is expenditure on",

    options: [
      "Fixed assets",
      "Day-to-day running of business",
      "Share capital",
      "Loans",
    ],

    answer: 1,

    explanation: "Revenue expenditure covers daily operational costs.",
  }),

  createQuestion({
    id: generateId("accounting", 40),

    year: 2018,

    question:
      "The accounting concept that assumes a business will continue operating is",

    options: ["Going concern", "Consistency", "Materiality", "Matching"],

    answer: 0,

    explanation:
      "Going concern assumes the business will continue in the foreseeable future.",
  }),

  createQuestion({
    id: generateId("accounting", 41),

    year: 2022,

    question: "Which of the following is used to record credit purchases?",

    options: [
      "Sales book",
      "Purchases journal",
      "Cash book",
      "Petty cash book",
    ],

    answer: 1,

    explanation: "Purchases journal is used to record all credit purchases.",
  }),

  createQuestion({
    id: generateId("accounting", 42),

    year: 2021,

    question: "A debit note is issued by the",

    options: ["Buyer", "Seller", "Bank", "Auditor"],

    answer: 0,

    explanation:
      "A debit note is issued by the buyer to inform the seller of returns or overcharges.",
  }),

  createQuestion({
    id: generateId("accounting", 43),

    year: 2020,

    question:
      "Which of the following errors will not affect the agreement of a trial balance?",

    options: [
      "Error of omission",
      "Wrong addition",
      "Posting to wrong side",
      "Transposition error",
    ],

    answer: 0,

    explanation:
      "Error of omission does not affect totals since the transaction is not recorded at all.",
  }),

  createQuestion({
    id: generateId("accounting", 44),

    year: 2019,

    question: "The main purpose of a control account is to",

    options: [
      "Replace ledger accounts",
      "Check arithmetical accuracy of subsidiary ledgers",
      "Prepare income statement",
      "Record cash transactions",
    ],

    answer: 1,

    explanation:
      "Control accounts help verify the accuracy of subsidiary ledger records.",
  }),

  createQuestion({
    id: generateId("accounting", 45),

    year: 2023,

    question: "A bank reconciliation statement is prepared to",

    options: [
      "Prepare profit and loss account",
      "Match cash book and bank statement balances",
      "Record expenses",
      "Calculate depreciation",
    ],

    answer: 1,

    explanation:
      "Bank reconciliation ensures agreement between cash book and bank statement.",
  }),

  createQuestion({
    id: generateId("accounting", 46),

    year: 2021,

    question: "The purchase of goods for resale is classified as",

    options: [
      "Capital expenditure",
      "Revenue expenditure",
      "Investment",
      "Loan",
    ],

    answer: 1,

    explanation:
      "Goods for resale are part of operating (revenue) expenditure.",
  }),

  createQuestion({
    id: generateId("accounting", 47),

    year: 2020,

    question: "Which of the following is a nominal account?",

    options: [
      "Cash account",
      "Bank account",
      "Rent account",
      "Building account",
    ],

    answer: 2,

    explanation:
      "Rent account is a nominal account as it records expenses and incomes.",
  }),

  createQuestion({
    id: generateId("accounting", 48),

    year: 2018,

    question: "The excess of assets over liabilities is known as",

    options: ["Profit", "Capital", "Loss", "Expense"],

    answer: 1,

    explanation:
      "Capital represents the owner's equity (assets minus liabilities).",
  }),

  createQuestion({
    id: generateId("accounting", 49),

    year: 2022,

    question: "Which of the following is recorded in the sales journal?",

    options: [
      "Cash sales",
      "Credit sales",
      "Credit purchases",
      "Cash purchases",
    ],

    answer: 1,

    explanation: "Sales journal records all credit sales transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 50),

    year: 2020,

    question: "A petty cash book is used to record",

    options: [
      "Large payments",
      "Small routine expenses",
      "Credit sales",
      "Capital expenditure",
    ],

    answer: 1,

    explanation: "Petty cash book records small day-to-day expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 51),

    year: 2019,

    question: "The purpose of balancing an account is to",

    options: [
      "Close the business",
      "Find the difference between debit and credit entries",
      "Record new transactions",
      "Prepare tax returns",
    ],

    answer: 1,

    explanation:
      "Balancing shows the net result of transactions in an account.",
  }),

  createQuestion({
    id: generateId("accounting", 52),

    year: 2021,

    question: "Which of the following increases profit?",

    options: ["Expenses", "Losses", "Revenues", "Drawings"],

    answer: 2,

    explanation: "Revenue increases profit when it exceeds expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 53),

    year: 2017,

    question: "A credit entry in the capital account indicates",

    options: [
      "Withdrawal of capital",
      "Increase in capital",
      "Purchase of goods",
      "Payment of expenses",
    ],

    answer: 1,

    explanation:
      "Capital account is credited when capital is introduced or increased.",
  }),

  createQuestion({
    id: generateId("accounting", 54),

    year: 2023,

    question: "Which of the following is NOT part of accounting principles?",

    options: ["Going concern", "Consistency", "Speculation", "Matching"],

    answer: 2,

    explanation:
      "Speculation is not an accounting principle; it relates to risk-taking.",
  }),

  createQuestion({
    id: generateId("accounting", 55),

    year: 2020,

    question: "The balance brought down (b/d) in an account represents",

    options: ["Opening balance", "Closing balance", "Profit", "Loss"],

    answer: 0,

    explanation:
      "Balance brought down becomes the opening balance for the next period.",
  }),

  createQuestion({
    id: generateId("accounting", 56),

    year: 2019,

    question: "A credit sale of goods increases",

    options: [
      "Cash and liabilities",
      "Debtors and sales",
      "Creditors and cash",
      "Expenses and assets",
    ],

    answer: 1,

    explanation: "Credit sales increase debtors and sales revenue.",
  }),

  createQuestion({
    id: generateId("accounting", 57),

    year: 2022,

    question: "Which of the following is a liability account?",

    options: ["Stock", "Bank loan", "Cash", "Furniture"],

    answer: 1,

    explanation: "Bank loan is money owed and therefore a liability.",
  }),

  createQuestion({
    id: generateId("accounting", 58),

    year: 2021,

    question: "The function of accounting is to provide",

    options: [
      "Financial information for decision making",
      "Only profit figures",
      "Only tax records",
      "Only employee records",
    ],

    answer: 0,

    explanation:
      "Accounting provides financial information for decision-making purposes.",
  }),

  createQuestion({
    id: generateId("accounting", 59),

    year: 2018,

    question:
      "A cheque that cannot be withdrawn in cash but only paid into an account is",

    options: [
      "Bearer cheque",
      "Open cheque",
      "Crossed cheque",
      "Dishonoured cheque",
    ],

    answer: 2,

    explanation: "A crossed cheque must be deposited into a bank account.",
  }),

  createQuestion({
    id: generateId("accounting", 60),

    year: 2023,

    question: "The matching concept requires that",

    options: [
      "Assets equal liabilities",
      "Expenses match revenues of the same period",
      "Cash equals bank balance",
      "Profit equals capital",
    ],

    answer: 1,

    explanation:
      "Matching principle ensures expenses are matched with related revenues.",
  }),

  createQuestion({
    id: generateId("accounting", 61),

    year: 2020,

    question: "Which of the following is NOT a book of original entry?",

    options: ["Journal", "Cash book", "Ledger", "Sales journal"],

    answer: 2,

    explanation:
      "Ledger is not a book of original entry; it is a book of final entry.",
  }),

  createQuestion({
    id: generateId("accounting", 62),

    year: 2019,

    question: "Capital introduced into the business is recorded in the",

    options: [
      "Capital account credit side",
      "Cash account debit side",
      "Expense account",
      "Sales account",
    ],

    answer: 0,

    explanation:
      "Capital introduction increases capital and is recorded on the credit side.",
  }),

  createQuestion({
    id: generateId("accounting", 63),

    year: 2021,

    question: "The financial statement that shows profit or loss is the",

    options: [
      "Balance sheet",
      "Income statement",
      "Cash book",
      "Trial balance",
    ],

    answer: 1,

    explanation: "Income statement shows the profit or loss of a business.",
  }),

  createQuestion({
    id: generateId("accounting", 64),

    year: 2017,

    question: "Which of the following is a real account?",

    options: [
      "Rent account",
      "Cash account",
      "Wages account",
      "Commission account",
    ],

    answer: 1,

    explanation: "Cash account is a real account as it deals with assets.",
  }),

  createQuestion({
    id: generateId("accounting", 65),

    year: 2022,

    question: "A debit balance in the bank column of the cash book means",

    options: [
      "Bank overdraft",
      "Cash at bank",
      "Credit sales",
      "Credit purchases",
    ],

    answer: 1,

    explanation: "A debit balance indicates money available in the bank.",
  }),

  createQuestion({
    id: generateId("accounting", 66),

    year: 2020,

    question: "The process of recording transactions chronologically is called",

    options: ["Posting", "Balancing", "Journalizing", "Summarizing"],

    answer: 2,

    explanation: "Journalizing is the chronological recording of transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 67),

    year: 2018,

    question:
      "The principle that requires consistency in accounting methods is",

    options: ["Matching", "Consistency", "Materiality", "Dual aspect"],

    answer: 1,

    explanation:
      "Consistency ensures the same accounting methods are used over time.",
  }),

  createQuestion({
    id: generateId("accounting", 68),

    year: 2023,

    question: "Which of the following increases liabilities?",

    options: [
      "Payment of loan",
      "Purchase on credit",
      "Cash sales",
      "Depreciation",
    ],

    answer: 1,

    explanation: "Buying on credit increases liabilities (creditors).",
  }),

  createQuestion({
    id: generateId("accounting", 69),

    year: 2021,

    question: "The ledger account that records all income is",

    options: [
      "Nominal account",
      "Real account",
      "Personal account",
      "Capital account",
    ],

    answer: 0,

    explanation: "Nominal accounts record incomes and expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 70),

    year: 2019,

    question: "The main aim of preparing financial statements is to",

    options: [
      "Hide profit",
      "Provide financial information",
      "Avoid tax",
      "Increase expenses",
    ],

    answer: 1,

    explanation: "Financial statements provide useful financial information.",
  }),

  createQuestion({
    id: generateId("accounting", 71),

    year: 2022,

    question: "Which of the following is a non-current liability?",

    options: ["Bank overdraft", "Creditors", "Long-term loan", "Cash"],

    answer: 2,

    explanation: "Long-term loans are payable over a long period.",
  }),

  createQuestion({
    id: generateId("accounting", 72),

    year: 2020,

    question: "A credit purchase of goods increases",

    options: [
      "Cash and sales",
      "Creditors and purchases",
      "Debtors and cash",
      "Capital and revenue",
    ],

    answer: 1,

    explanation: "Credit purchases increase creditors and purchases account.",
  }),

  createQuestion({
    id: generateId("accounting", 73),

    year: 2018,

    question: "The purpose of bookkeeping is to",

    options: [
      "Analyze financial data",
      "Record financial transactions",
      "Interpret results",
      "Plan budgets",
    ],

    answer: 1,

    explanation: "Bookkeeping is the recording of financial transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 74),

    year: 2023,

    question: "Which of the following is NOT a current asset?",

    options: ["Debtors", "Stock", "Building", "Cash"],

    answer: 2,

    explanation: "Building is a fixed asset, not a current asset.",
  }),

  createQuestion({
    id: generateId("accounting", 75),

    year: 2021,

    question: "The balance sheet is prepared to show",

    options: [
      "Profit and loss",
      "Financial position",
      "Cash flow",
      "Sales revenue",
    ],

    answer: 1,

    explanation: "The balance sheet shows assets, liabilities, and capital.",
  }),

  createQuestion({
    id: generateId("accounting", 76),

    year: 2019,

    question:
      "Which of the following is recorded on the debit side of cash book?",

    options: ["Cash received", "Cash paid", "Credit sales", "Capital"],

    answer: 0,

    explanation: "Debit side of cash book records cash receipts.",
  }),

  createQuestion({
    id: generateId("accounting", 77),

    year: 2020,

    question: "A bad debt refers to",

    options: [
      "Money received",
      "Money not recoverable from debtors",
      "Capital investment",
      "Cash surplus",
    ],

    answer: 1,

    explanation:
      "Bad debts are amounts owed by debtors that cannot be recovered.",
  }),

  createQuestion({
    id: generateId("accounting", 78),

    year: 2017,

    question: "Which of the following is NOT a feature of double entry system?",

    options: [
      "Every transaction has two effects",
      "Debits equal credits",
      "Only one account is affected",
      "Accounts are balanced",
    ],

    answer: 2,

    explanation: "Double entry affects at least two accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 79),

    year: 2022,

    question: "A liability that is payable within one year is called",

    options: ["Current liability", "Fixed liability", "Capital", "Asset"],

    answer: 0,

    explanation:
      "Current liabilities are payable within a short period (usually one year).",
  }),

  createQuestion({
    id: generateId("accounting", 80),

    year: 2023,

    question: "The main purpose of depreciation is to",

    options: [
      "Increase asset value",
      "Allocate cost of asset over useful life",
      "Increase profit",
      "Reduce liabilities",
    ],

    answer: 1,

    explanation:
      "Depreciation spreads the cost of an asset over its useful life.",
  }),
  createQuestion({
    id: generateId("accounting", 81),

    year: 2020,

    question:
      "Which of the following is used to correct errors that do not affect the trial balance?",

    options: [
      "Suspense account",
      "Trading account",
      "Cash book",
      "Purchase journal",
    ],

    answer: 0,

    explanation:
      "Suspense account is used temporarily to correct errors that do not immediately affect the trial balance.",
  }),

  createQuestion({
    id: generateId("accounting", 82),

    year: 2019,

    question: "The account that records goods withdrawn by the owner is",

    options: [
      "Drawings account",
      "Capital account",
      "Purchases account",
      "Sales account",
    ],

    answer: 0,

    explanation:
      "Drawings account records goods or cash taken by the owner for personal use.",
  }),

  createQuestion({
    id: generateId("accounting", 83),

    year: 2021,

    question: "Which of the following is a source document for credit sales?",

    options: ["Receipt", "Invoice", "Cheque", "Ledger"],

    answer: 1,

    explanation: "An invoice is issued to record credit sales transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 84),

    year: 2018,

    question: "A debit entry in the purchases account represents",

    options: [
      "Goods bought",
      "Goods sold",
      "Cash received",
      "Capital introduced",
    ],

    answer: 0,

    explanation: "Purchases account is debited when goods are bought.",
  }),

  createQuestion({
    id: generateId("accounting", 85),

    year: 2022,

    question: "Which of the following increases capital?",

    options: ["Drawings", "Profit", "Expenses", "Losses"],

    answer: 1,

    explanation: "Profit increases the owner's capital.",
  }),

  createQuestion({
    id: generateId("accounting", 86),

    year: 2020,

    question:
      "The accounting concept that assumes all transactions are expressed in monetary terms is",

    options: ["Going concern", "Money measurement", "Consistency", "Matching"],

    answer: 1,

    explanation:
      "Money measurement concept records only transactions measurable in money.",
  }),

  createQuestion({
    id: generateId("accounting", 87),

    year: 2019,

    question: "Which of the following is NOT recorded in the cash book?",

    options: ["Cash sales", "Cash purchases", "Credit sales", "Cash received"],

    answer: 2,

    explanation: "Credit sales are not recorded in the cash book.",
  }),

  createQuestion({
    id: generateId("accounting", 88),

    year: 2021,

    question: "The purpose of a ledger is to",

    options: [
      "Record original transactions",
      "Classify financial transactions",
      "Prepare invoices",
      "Calculate tax only",
    ],

    answer: 1,

    explanation:
      "Ledger classifies transactions from the journal into accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 89),

    year: 2017,

    question: "A credit balance in capital account indicates",

    options: ["Loss", "Increase in capital", "Decrease in capital", "Expenses"],

    answer: 1,

    explanation: "Capital account is credited when capital increases.",
  }),

  createQuestion({
    id: generateId("accounting", 90),

    year: 2023,

    question: "Which of the following is a liability account?",

    options: ["Debtors", "Cash", "Creditors", "Stock"],

    answer: 2,

    explanation: "Creditors represent amounts owed to external parties.",
  }),

  createQuestion({
    id: generateId("accounting", 91),

    year: 2020,

    question: "The matching concept ensures that",

    options: [
      "Income is ignored",
      "Expenses are matched with revenue",
      "Assets equal liabilities",
      "Cash equals profit",
    ],

    answer: 1,

    explanation: "Matching concept matches expenses with related revenue.",
  }),

  createQuestion({
    id: generateId("accounting", 92),

    year: 2018,

    question: "Which of the following is a current asset?",

    options: ["Land", "Building", "Stock", "Machinery"],

    answer: 2,

    explanation: "Stock is a current asset because it is meant for resale.",
  }),

  createQuestion({
    id: generateId("accounting", 93),

    year: 2022,

    question: "A bank overdraft is classified as",

    options: ["Current liability", "Fixed asset", "Capital", "Revenue"],

    answer: 0,

    explanation: "Bank overdraft is a short-term liability.",
  }),

  createQuestion({
    id: generateId("accounting", 94),

    year: 2021,

    question: "Which of the following is NOT a function of accounting?",

    options: [
      "Recording transactions",
      "Classifying transactions",
      "Destroying records",
      "Interpreting data",
    ],

    answer: 2,

    explanation:
      "Accounting involves recording and analysis, not destroying records.",
  }),

  createQuestion({
    id: generateId("accounting", 95),

    year: 2019,

    question: "The excess of total income over total expenditure is",

    options: ["Loss", "Profit", "Asset", "Liability"],

    answer: 1,

    explanation: "Profit occurs when income exceeds expenditure.",
  }),

  createQuestion({
    id: generateId("accounting", 96),

    year: 2020,

    question: "Which of the following accounts is a nominal account?",

    options: [
      "Cash account",
      "Bank account",
      "Rent account",
      "Building account",
    ],

    answer: 2,

    explanation: "Rent account is a nominal account as it records expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 97),

    year: 2017,

    question: "A credit entry in sales account represents",

    options: [
      "Goods purchased",
      "Goods sold",
      "Cash withdrawn",
      "Capital introduced",
    ],

    answer: 1,

    explanation: "Sales account is credited when goods are sold.",
  }),

  createQuestion({
    id: generateId("accounting", 98),

    year: 2023,

    question: "Which of the following is used to record petty expenses?",

    options: ["Cash book", "Petty cash book", "Ledger", "Journal"],

    answer: 1,

    explanation: "Petty cash book is used for small, routine expenses.",
  }),

  createQuestion({
    id: generateId("accounting", 99),

    year: 2021,

    question: "A debit entry in an asset account means",

    options: [
      "Decrease in asset",
      "Increase in asset",
      "Increase in liability",
      "Decrease in capital",
    ],

    answer: 1,

    explanation: "Assets increase on the debit side.",
  }),

  createQuestion({
    id: generateId("accounting", 100),

    year: 2018,

    question: "Which of the following is NOT a real account?",

    options: [
      "Cash account",
      "Furniture account",
      "Rent account",
      "Building account",
    ],

    answer: 2,

    explanation: "Rent account is a nominal account, not a real account.",
  }),

  createQuestion({
    id: generateId("accounting", 101),

    year: 2022,

    question: "The accounting equation is affected when",

    options: [
      "Only one account changes",
      "Two accounts are affected equally",
      "No transaction occurs",
      "Only expenses increase",
    ],

    answer: 1,

    explanation: "Every transaction affects at least two accounts equally.",
  }),

  createQuestion({
    id: generateId("accounting", 102),

    year: 2020,

    question: "A credit purchase of goods increases",

    options: ["Cash", "Creditors", "Capital", "Revenue"],

    answer: 1,

    explanation: "Credit purchases increase creditors.",
  }),

  createQuestion({
    id: generateId("accounting", 103),

    year: 2019,

    question: "Which of the following is a non-current asset?",

    options: ["Stock", "Debtors", "Machinery", "Cash"],

    answer: 2,

    explanation: "Machinery is a long-term asset used in production.",
  }),

  createQuestion({
    id: generateId("accounting", 104),

    year: 2021,

    question: "The trial balance is prepared to",

    options: [
      "Calculate profit",
      "Check arithmetic accuracy",
      "Record cash",
      "Prepare invoices",
    ],

    answer: 1,

    explanation:
      "Trial balance checks the arithmetic accuracy of ledger accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 105),

    year: 2018,

    question: "A debit balance in a debtor's account represents",

    options: [
      "Money owed to the business",
      "Money owed by the business",
      "Capital",
      "Expenses",
    ],

    answer: 0,

    explanation: "Debtors owe money to the business.",
  }),

  createQuestion({
    id: generateId("accounting", 106),

    year: 2023,

    question: "Which of the following is a feature of double entry system?",

    options: [
      "One account affected",
      "Two accounts affected",
      "No record kept",
      "Only cash recorded",
    ],

    answer: 1,

    explanation: "Double entry requires two accounts for every transaction.",
  }),

  createQuestion({
    id: generateId("accounting", 107),

    year: 2020,

    question: "A liability account is normally",

    options: ["Debited", "Credited", "Balanced", "Ignored"],

    answer: 1,

    explanation: "Liabilities increase on the credit side.",
  }),

  createQuestion({
    id: generateId("accounting", 108),

    year: 2019,

    question: "Which of the following is NOT a current liability?",

    options: [
      "Creditors",
      "Bank overdraft",
      "Long-term loan",
      "Accrued expenses",
    ],

    answer: 2,

    explanation: "Long-term loans are non-current liabilities.",
  }),

  createQuestion({
    id: generateId("accounting", 109),

    year: 2021,

    question: "Capital is increased by",

    options: ["Drawings", "Losses", "Profit", "Expenses"],

    answer: 2,

    explanation: "Profit increases the owner's capital.",
  }),

  createQuestion({
    id: generateId("accounting", 110),

    year: 2020,

    question:
      "Which of the following is used to record all transactions in one account?",

    options: ["Ledger", "Journal", "Cash book", "Trial balance"],

    answer: 0,

    explanation: "Ledger contains all classified accounts.",
  }),

  createQuestion({
    id: generateId("accounting", 111),

    year: 2018,

    question: "A debit entry in expense account means",

    options: [
      "Decrease in expense",
      "Increase in expense",
      "Increase in income",
      "Decrease in liability",
    ],

    answer: 1,

    explanation: "Expenses increase on the debit side.",
  }),

  createQuestion({
    id: generateId("accounting", 112),

    year: 2022,

    question: "Which of the following is NOT a financial statement?",

    options: [
      "Income statement",
      "Balance sheet",
      "Trial balance",
      "Cash book",
    ],

    answer: 3,

    explanation:
      "Cash book is a book of original entry, not a financial statement.",
  }),

  createQuestion({
    id: generateId("accounting", 113),

    year: 2021,

    question: "The purchase of equipment is classified as",

    options: [
      "Revenue expenditure",
      "Capital expenditure",
      "Operating expense",
      "Income",
    ],

    answer: 1,

    explanation: "Equipment purchase is a capital expenditure.",
  }),

  createQuestion({
    id: generateId("accounting", 114),

    year: 2019,

    question: "A credit entry in income account means",

    options: [
      "Increase in income",
      "Decrease in income",
      "Increase in assets",
      "Decrease in liabilities",
    ],

    answer: 0,

    explanation: "Income accounts increase on the credit side.",
  }),

  createQuestion({
    id: generateId("accounting", 115),

    year: 2020,

    question: "Which of the following is a feature of accounting?",

    options: [
      "Subjective recording",
      "Systematic recording",
      "Random recording",
      "Unplanned recording",
    ],

    answer: 1,

    explanation:
      "Accounting involves systematic recording of financial transactions.",
  }),

  createQuestion({
    id: generateId("accounting", 116),

    year: 2023,

    question: "The purpose of a balance sheet is to show",

    options: [
      "Profit and loss",
      "Financial position",
      "Cash receipts",
      "Sales only",
    ],

    answer: 1,

    explanation: "Balance sheet shows the financial position of a business.",
  }),

  createQuestion({
    id: generateId("accounting", 117),

    year: 2018,

    question: "Which of the following increases assets?",

    options: [
      "Credit purchase",
      "Cash payment",
      "Cash receipt",
      "Loan repayment",
    ],

    answer: 2,

    explanation: "Cash receipt increases cash, which is an asset.",
  }),

  createQuestion({
    id: generateId("accounting", 118),

    year: 2022,

    question: "A journal is used to",

    options: [
      "Classify accounts",
      "Record transactions initially",
      "Prepare balance sheet",
      "Calculate profit",
    ],

    answer: 1,

    explanation: "Journal is the book of original entry.",
  }),

  createQuestion({
    id: generateId("accounting", 119),

    year: 2021,

    question: "Which of the following is NOT a purpose of accounting?",

    options: [
      "Providing financial information",
      "Assisting decision making",
      "Recording transactions",
      "Eliminating business risk completely",
    ],

    answer: 3,

    explanation: "Accounting cannot eliminate business risk completely.",
  }),

  createQuestion({
    id: generateId("accounting", 120),

    year: 2019,

    question:
      "The concept that business transactions are recorded in monetary terms is called",

    options: [
      "Money measurement concept",
      "Going concern concept",
      "Consistency concept",
      "Matching concept",
    ],

    answer: 0,

    explanation:
      "Money measurement concept states that only transactions measurable in money are recorded.",
  }),
];
/* =========================================================
AGRICULTURE
========================================================= */
const agricultural = [
  createQuestion({
    id: generateId("agriculture", 1),

    year: 2020,

    question: "Agriculture can best be defined as",

    options: [
      "Buying and selling of goods",
      "Rearing of animals only",
      "Cultivation of crops and rearing of animals",
      "Processing of raw materials",
    ],

    answer: 2,

    explanation:
      "Agriculture involves both crop production and animal rearing.",
  }),

  createQuestion({
    id: generateId("agriculture", 2),

    year: 2019,

    question:
      "Which of the following is a factor of production in agriculture?",

    options: ["Money", "Land", "Profit", "Market"],

    answer: 1,

    explanation: "Land is a major factor of production in agriculture.",
  }),

  createQuestion({
    id: generateId("agriculture", 3),

    year: 2021,

    question:
      "The process of growing crops and rearing animals for food is called",

    options: ["Manufacturing", "Agriculture", "Mining", "Construction"],

    answer: 1,

    explanation:
      "Agriculture is the cultivation of crops and rearing of animals.",
  }),

  createQuestion({
    id: generateId("agriculture", 4),

    year: 2018,

    question: "Which of the following is NOT a branch of agriculture?",

    options: ["Crop production", "Animal husbandry", "Forestry", "Banking"],

    answer: 3,

    explanation: "Banking is not part of agriculture.",
  }),

  createQuestion({
    id: generateId("agriculture", 5),

    year: 2022,

    question: "The study of soil is called",

    options: ["Pomology", "Soil science", "Agronomy", "Horticulture"],

    answer: 1,

    explanation: "Soil science deals with the study of soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 6),

    year: 2020,

    question: "Which of the following is a farm tool?",

    options: ["Hammer", "Cutlass", "Saw", "Chisel"],

    answer: 1,

    explanation: "A cutlass is commonly used in farming.",
  }),

  createQuestion({
    id: generateId("agriculture", 7),

    year: 2019,

    question: "The act of preparing land for planting is called",

    options: ["Harvesting", "Ploughing", "Threshing", "Marketing"],

    answer: 1,

    explanation: "Ploughing prepares the soil for planting.",
  }),

  createQuestion({
    id: generateId("agriculture", 8),

    year: 2021,

    question: "Which of the following is a cash crop?",

    options: ["Rice", "Maize", "Cocoa", "Millet"],

    answer: 2,

    explanation: "Cocoa is grown mainly for sale as a cash crop.",
  }),

  createQuestion({
    id: generateId("agriculture", 9),

    year: 2017,

    question: "The keeping of bees is called",

    options: ["Sericulture", "Apiculture", "Pisciculture", "Horticulture"],

    answer: 1,

    explanation: "Apiculture is the rearing of bees.",
  }),

  createQuestion({
    id: generateId("agriculture", 10),

    year: 2023,

    question: "Which of the following is a livestock animal?",

    options: ["Tomato", "Goat", "Cassava", "Maize"],

    answer: 1,

    explanation: "Goat is a livestock animal.",
  }),

  createQuestion({
    id: generateId("agriculture", 11),

    year: 2020,

    question: "The main source of food for plants is",

    options: ["Water", "Sunlight", "Soil nutrients", "Air only"],

    answer: 1,

    explanation: "Sunlight is essential for photosynthesis.",
  }),

  createQuestion({
    id: generateId("agriculture", 12),

    year: 2019,

    question: "Which of the following is a farm implement?",

    options: ["Plough", "Hoe", "Cutlass", "All of the above"],

    answer: 3,

    explanation: "All listed tools are farm implements.",
  }),

  createQuestion({
    id: generateId("agriculture", 13),

    year: 2021,

    question: "The removal of weeds from farmland is called",

    options: ["Harvesting", "Weeding", "Planting", "Ploughing"],

    answer: 1,

    explanation: "Weeding removes unwanted plants from crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 14),

    year: 2018,

    question: "Which of the following is NOT a livestock product?",

    options: ["Milk", "Eggs", "Cocoa", "Meat"],

    answer: 2,

    explanation: "Cocoa is a crop product, not livestock.",
  }),

  createQuestion({
    id: generateId("agriculture", 15),

    year: 2022,

    question: "The branch of agriculture that deals with crop production is",

    options: ["Animal science", "Agronomy", "Economics", "Engineering"],

    answer: 1,

    explanation: "Agronomy deals with crop production and soil management.",
  }),

  createQuestion({
    id: generateId("agriculture", 16),

    year: 2020,

    question: "Which of the following is a ruminant animal?",

    options: ["Dog", "Goat", "Chicken", "Fish"],

    answer: 1,

    explanation: "Goats are ruminant animals that chew cud.",
  }),

  createQuestion({
    id: generateId("agriculture", 17),

    year: 2019,

    question:
      "The process of removing excess plants to allow proper growth is called",

    options: ["Thinning", "Harvesting", "Ploughing", "Spraying"],

    answer: 0,

    explanation: "Thinning removes excess seedlings.",
  }),

  createQuestion({
    id: generateId("agriculture", 18),

    year: 2021,

    question: "Which of the following is a method of irrigation?",

    options: ["Broadcasting", "Drip irrigation", "Threshing", "Ploughing"],

    answer: 1,

    explanation: "Drip irrigation supplies water directly to plant roots.",
  }),

  createQuestion({
    id: generateId("agriculture", 19),

    year: 2017,

    question: "The keeping of fish is called",

    options: ["Apiculture", "Pisciculture", "Sericulture", "Agronomy"],

    answer: 1,

    explanation: "Pisciculture is fish farming.",
  }),

  createQuestion({
    id: generateId("agriculture", 20),

    year: 2023,

    question: "Which of the following is a method of planting?",

    options: ["Broadcasting", "Weeding", "Harvesting", "Spraying"],

    answer: 0,

    explanation: "Broadcasting is the scattering of seeds on the soil surface.",
  }),

  createQuestion({
    id: generateId("agriculture", 21),

    year: 2020,

    question: "The major occupation of rural dwellers is",

    options: ["Banking", "Agriculture", "Engineering", "Teaching"],

    answer: 1,

    explanation: "Most rural communities engage in agriculture.",
  }),

  createQuestion({
    id: generateId("agriculture", 22),

    year: 2019,

    question: "Which of the following is a disease of crops?",

    options: ["Anthrax", "Rust", "Rinderpest", "Foot and mouth disease"],

    answer: 1,

    explanation: "Rust is a fungal disease affecting crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 23),

    year: 2021,

    question: "Which of the following is a source of farm power?",

    options: ["Sunlight", "Human labour", "Water", "All of the above"],

    answer: 3,

    explanation: "Farm power can come from humans, animals, and machines.",
  }),

  createQuestion({
    id: generateId("agriculture", 24),

    year: 2018,

    question: "The science of raising crops and livestock is called",

    options: ["Agriculture", "Geography", "Economics", "Physics"],

    answer: 0,

    explanation: "Agriculture covers both crop and animal production.",
  }),

  createQuestion({
    id: generateId("agriculture", 25),

    year: 2022,

    question: "Which of the following is NOT a soil type?",

    options: ["Sandy soil", "Loamy soil", "Clay soil", "Metallic soil"],

    answer: 3,

    explanation: "Metallic soil is not a recognized soil type.",
  }),

  createQuestion({
    id: generateId("agriculture", 26),

    year: 2020,

    question: "The process of removing harvested grains from pods is called",

    options: ["Threshing", "Planting", "Weeding", "Spraying"],

    answer: 0,

    explanation: "Threshing separates grains from harvested crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 27),

    year: 2019,

    question: "Which of the following is a form of livestock management?",

    options: ["Crop rotation", "Grazing", "Weeding", "Ploughing"],

    answer: 1,

    explanation: "Grazing is a method of feeding livestock.",
  }),

  createQuestion({
    id: generateId("agriculture", 28),

    year: 2021,

    question: "Which of the following is a use of farm animals?",

    options: ["Food", "Transport", "Manure production", "All of the above"],

    answer: 3,

    explanation: "Farm animals provide food, transport, and manure.",
  }),

  createQuestion({
    id: generateId("agriculture", 29),

    year: 2017,

    question: "The process of applying water to crops is",

    options: ["Irrigation", "Fertilization", "Harvesting", "Spraying"],

    answer: 0,

    explanation: "Irrigation supplies water to crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 30),

    year: 2023,

    question: "Which of the following is a farm input?",

    options: ["Seed", "Market", "Profit", "Demand"],

    answer: 0,

    explanation: "Seeds are inputs used in farming.",
  }),

  createQuestion({
    id: generateId("agriculture", 31),

    year: 2020,

    question: "The keeping of silkworms is called",

    options: ["Sericulture", "Apiculture", "Pisciculture", "Horticulture"],

    answer: 0,

    explanation: "Sericulture is silk farming.",
  }),

  createQuestion({
    id: generateId("agriculture", 32),

    year: 2019,

    question: "Which of the following is a pest of crops?",

    options: ["Locust", "Goat", "Cow", "Fish"],

    answer: 0,

    explanation: "Locusts destroy crops in large quantities.",
  }),

  createQuestion({
    id: generateId("agriculture", 33),

    year: 2021,

    question: "Which of the following improves soil fertility?",

    options: ["Fertilizer", "Weeds", "Pests", "Flooding"],

    answer: 0,

    explanation: "Fertilizers add nutrients to the soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 34),

    year: 2018,

    question: "Which of the following is a method of harvesting?",

    options: ["Cutting", "Ploughing", "Weeding", "Spraying"],

    answer: 0,

    explanation: "Cutting is used to harvest mature crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 35),

    year: 2022,

    question: "The use of machines in farming is called",

    options: ["Mechanization", "Irrigation", "Fertilization", "Rotation"],

    answer: 0,

    explanation: "Mechanization involves using machines in agriculture.",
  }),

  createQuestion({
    id: generateId("agriculture", 36),

    year: 2020,

    question: "Which of the following is NOT a method of soil conservation?",

    options: ["Terracing", "Crop rotation", "Deforestation", "Mulching"],

    answer: 2,

    explanation: "Deforestation destroys soil conservation efforts.",
  }),

  createQuestion({
    id: generateId("agriculture", 37),

    year: 2019,

    question: "Which of the following is a benefit of agriculture?",

    options: ["Food supply", "Pollution", "Deforestation", "Flooding"],

    answer: 0,

    explanation: "Agriculture provides food for human consumption.",
  }),

  createQuestion({
    id: generateId("agriculture", 38),

    year: 2021,

    question: "Which of the following is a method of crop propagation?",

    options: ["Planting", "Grazing", "Weeding", "Spraying"],

    answer: 0,

    explanation: "Planting is a method of crop propagation.",
  }),

  createQuestion({
    id: generateId("agriculture", 39),

    year: 2018,

    question:
      "Which of the following is a climatic factor affecting agriculture?",

    options: ["Rainfall", "Capital", "Labour", "Market"],

    answer: 0,

    explanation: "Rainfall is a key climatic factor affecting crop growth.",
  }),

  createQuestion({
    id: generateId("agriculture", 40),

    year: 2023,

    question: "The science of breeding improved animals is called",

    options: ["Genetics", "Animal husbandry", "Agronomy", "Economics"],

    answer: 1,

    explanation: "Animal husbandry involves breeding and caring for livestock.",
  }),
  createQuestion({
    id: generateId("agriculture", 41),

    year: 2020,

    question:
      "Which of the following is a method of pest control in agriculture?",

    options: ["Irrigation", "Spraying pesticides", "Ploughing", "Harvesting"],

    answer: 1,

    explanation: "Pesticides are used to control pests that destroy crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 42),

    year: 2019,

    question: "The removal of excess water from farmland is called",

    options: ["Irrigation", "Drainage", "Mulching", "Weeding"],

    answer: 1,

    explanation:
      "Drainage removes excess water from soil to prevent waterlogging.",
  }),

  createQuestion({
    id: generateId("agriculture", 43),

    year: 2021,

    question: "Which of the following is a leguminous crop?",

    options: ["Rice", "Maize", "Beans", "Millet"],

    answer: 2,

    explanation: "Beans are legumes that can fix nitrogen in the soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 44),

    year: 2018,

    question:
      "The process of growing crops in different seasons alternately is called",

    options: ["Monocropping", "Crop rotation", "Weeding", "Ploughing"],

    answer: 1,

    explanation:
      "Crop rotation involves changing crops grown on the same land.",
  }),

  createQuestion({
    id: generateId("agriculture", 45),

    year: 2022,

    question: "Which of the following is NOT a benefit of crop rotation?",

    options: [
      "Improves soil fertility",
      "Reduces pests",
      "Increases soil erosion",
      "Prevents disease build-up",
    ],

    answer: 2,

    explanation: "Crop rotation reduces erosion rather than increasing it.",
  }),

  createQuestion({
    id: generateId("agriculture", 46),

    year: 2020,

    question: "Which of the following is a type of soil erosion?",

    options: ["Sheet erosion", "Crop erosion", "Farm erosion", "Plant erosion"],

    answer: 0,

    explanation: "Sheet erosion is the uniform removal of topsoil by water.",
  }),

  createQuestion({
    id: generateId("agriculture", 47),

    year: 2019,

    question: "The use of organic matter to improve soil fertility is called",

    options: ["Fertilization", "Mulching", "Irrigation", "Harvesting"],

    answer: 1,

    explanation: "Mulching adds organic matter and conserves soil moisture.",
  }),

  createQuestion({
    id: generateId("agriculture", 48),

    year: 2021,

    question: "Which of the following is a farm structure?",

    options: ["Cutlass", "Barn", "Hoe", "Sprayer"],

    answer: 1,

    explanation:
      "A barn is a building used for storing farm produce or animals.",
  }),

  createQuestion({
    id: generateId("agriculture", 49),

    year: 2017,

    question: "Which of the following is a source of organic manure?",

    options: ["Plastic", "Animal waste", "Glass", "Metal"],

    answer: 1,

    explanation:
      "Animal waste is used as organic manure to improve soil fertility.",
  }),

  createQuestion({
    id: generateId("agriculture", 50),

    year: 2023,

    question: "The process of removing weeds using chemicals is called",

    options: ["Weeding", "Herbicide application", "Ploughing", "Irrigation"],

    answer: 1,

    explanation:
      "Herbicides are chemicals used to kill unwanted plants (weeds).",
  }),

  createQuestion({
    id: generateId("agriculture", 51),

    year: 2020,

    question: "Which of the following is a post-harvest activity?",

    options: ["Planting", "Weeding", "Storage", "Ploughing"],

    answer: 2,

    explanation: "Storage is done after harvesting crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 52),

    year: 2019,

    question: "The major aim of agriculture is to",

    options: [
      "Produce food",
      "Create pollution",
      "Destroy land",
      "Increase pests",
    ],

    answer: 0,

    explanation: "Agriculture mainly aims to produce food and raw materials.",
  }),

  createQuestion({
    id: generateId("agriculture", 53),

    year: 2021,

    question: "Which of the following is a method of animal identification?",

    options: ["Tagging", "Ploughing", "Weeding", "Spraying"],

    answer: 0,

    explanation: "Tagging is used to identify animals in livestock farming.",
  }),

  createQuestion({
    id: generateId("agriculture", 54),

    year: 2018,

    question: "Which of the following is NOT a characteristic of loamy soil?",

    options: [
      "Good drainage",
      "High fertility",
      "Poor water retention",
      "Suitable for farming",
    ],

    answer: 2,

    explanation: "Loamy soil retains water fairly well, not poorly.",
  }),

  createQuestion({
    id: generateId("agriculture", 55),

    year: 2022,

    question: "The breakdown of organic matter in soil is called",

    options: ["Decomposition", "Photosynthesis", "Erosion", "Irrigation"],

    answer: 0,

    explanation: "Decomposition releases nutrients back into the soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 56),

    year: 2020,

    question: "Which of the following is a benefit of irrigation?",

    options: [
      "Increases drought",
      "Ensures water supply to crops",
      "Reduces fertility",
      "Causes erosion only",
    ],

    answer: 1,

    explanation: "Irrigation supplies water to crops during dry periods.",
  }),

  createQuestion({
    id: generateId("agriculture", 57),

    year: 2019,

    question: "Which of the following is a method of fish farming?",

    options: ["Pisciculture", "Apiculture", "Sericulture", "Agronomy"],

    answer: 0,

    explanation: "Pisciculture is the breeding and rearing of fish.",
  }),

  createQuestion({
    id: generateId("agriculture", 58),

    year: 2021,

    question: "The act of supplying nutrients to crops is called",

    options: ["Fertilization", "Weeding", "Harvesting", "Threshing"],

    answer: 0,

    explanation: "Fertilization improves soil nutrient content.",
  }),

  createQuestion({
    id: generateId("agriculture", 59),

    year: 2017,

    question: "Which of the following is a biological pest control method?",

    options: ["Use of chemicals", "Use of predators", "Burning", "Ploughing"],

    answer: 1,

    explanation: "Biological control uses natural enemies of pests.",
  }),

  createQuestion({
    id: generateId("agriculture", 60),

    year: 2023,

    question:
      "The process of planting trees to replace those cut down is called",

    options: ["Deforestation", "Afforestation", "Reforestation", "Irrigation"],

    answer: 2,

    explanation: "Reforestation is planting trees in deforested areas.",
  }),

  createQuestion({
    id: generateId("agriculture", 61),

    year: 2020,

    question: "Which of the following is a type of farm animal feed?",

    options: ["Concentrates", "Herbicides", "Fertilizers", "Pesticides"],

    answer: 0,

    explanation: "Concentrates are nutrient-rich feeds for livestock.",
  }),

  createQuestion({
    id: generateId("agriculture", 62),

    year: 2019,

    question: "Which of the following is NOT a livestock disease?",

    options: ["Anthrax", "Rinderpest", "Rust", "Foot and mouth disease"],

    answer: 2,

    explanation: "Rust is a plant disease, not a livestock disease.",
  }),

  createQuestion({
    id: generateId("agriculture", 63),

    year: 2021,

    question: "Which of the following improves soil structure?",

    options: ["Organic matter", "Plastic", "Glass", "Sand only"],

    answer: 0,

    explanation: "Organic matter improves soil structure and fertility.",
  }),

  createQuestion({
    id: generateId("agriculture", 64),

    year: 2018,

    question: "Which of the following is a method of conserving soil?",

    options: ["Deforestation", "Terracing", "Burning", "Overgrazing"],

    answer: 1,

    explanation: "Terracing reduces soil erosion on slopes.",
  }),

  createQuestion({
    id: generateId("agriculture", 65),

    year: 2022,

    question:
      "The practice of growing only one type of crop on a farm is called",

    options: ["Monoculture", "Mixed cropping", "Crop rotation", "Agroforestry"],

    answer: 0,

    explanation: "Monoculture is the cultivation of a single crop.",
  }),

  createQuestion({
    id: generateId("agriculture", 66),

    year: 2020,

    question: "Which of the following is a benefit of farm mechanization?",

    options: [
      "Reduces efficiency",
      "Increases productivity",
      "Increases labour only",
      "Reduces output",
    ],

    answer: 1,

    explanation: "Mechanization increases farm productivity and efficiency.",
  }),

  createQuestion({
    id: generateId("agriculture", 67),

    year: 2019,

    question: "Which of the following is a storage pest?",

    options: ["Weevil", "Earthworm", "Grasshopper", "Bee"],

    answer: 0,

    explanation: "Weevils attack stored grains.",
  }),

  createQuestion({
    id: generateId("agriculture", 68),

    year: 2021,

    question: "Which of the following is a method of crop harvesting?",

    options: ["Cutting", "Irrigation", "Ploughing", "Weeding"],

    answer: 0,

    explanation: "Cutting is used to harvest mature crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 69),

    year: 2018,

    question: "Which of the following is a benefit of manure?",

    options: [
      "Reduces fertility",
      "Improves soil nutrients",
      "Kills crops",
      "Causes erosion",
    ],

    answer: 1,

    explanation: "Manure increases soil fertility.",
  }),

  createQuestion({
    id: generateId("agriculture", 70),

    year: 2023,

    question: "Which of the following is a method of farm record keeping?",

    options: ["Budgeting", "Weeding", "Ploughing", "Spraying"],

    answer: 0,

    explanation: "Budgeting helps in planning and recording farm activities.",
  }),

  createQuestion({
    id: generateId("agriculture", 71),

    year: 2020,

    question: "Which of the following is NOT a type of farm animal feed?",

    options: ["Roughages", "Concentrates", "Pesticides", "Supplements"],

    answer: 2,

    explanation: "Pesticides are not animal feed; they are for pest control.",
  }),

  createQuestion({
    id: generateId("agriculture", 72),

    year: 2019,

    question: "Which of the following is a type of irrigation system?",

    options: [
      "Sprinkler system",
      "Ploughing system",
      "Weeding system",
      "Harvesting system",
    ],

    answer: 0,

    explanation: "Sprinkler irrigation distributes water like rainfall.",
  }),

  createQuestion({
    id: generateId("agriculture", 73),

    year: 2021,

    question: "Which of the following is a characteristic of sandy soil?",

    options: [
      "High water retention",
      "Poor drainage",
      "Low nutrient content",
      "Very sticky",
    ],

    answer: 2,

    explanation: "Sandy soil has low nutrient-holding capacity.",
  }),

  createQuestion({
    id: generateId("agriculture", 74),

    year: 2018,

    question: "Which of the following is a method of weed control?",

    options: [
      "Herbicide application",
      "Irrigation",
      "Ploughing only",
      "Harvesting",
    ],

    answer: 0,

    explanation: "Herbicides are used to control weeds.",
  }),

  createQuestion({
    id: generateId("agriculture", 75),

    year: 2022,

    question: "Which of the following is a function of roots in plants?",

    options: [
      "Photosynthesis",
      "Absorption of water",
      "Seed production",
      "Pollination",
    ],

    answer: 1,

    explanation: "Roots absorb water and nutrients from the soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 76),

    year: 2020,

    question: "Which of the following is a type of livestock housing?",

    options: ["Pen", "Field", "Market", "Garden"],

    answer: 0,

    explanation: "Pens are used to house livestock animals.",
  }),

  createQuestion({
    id: generateId("agriculture", 77),

    year: 2019,

    question: "Which of the following is a benefit of irrigation farming?",

    options: [
      "Reduces crop yield",
      "Ensures year-round farming",
      "Causes drought",
      "Increases pests only",
    ],

    answer: 1,

    explanation: "Irrigation allows farming during dry seasons.",
  }),

  createQuestion({
    id: generateId("agriculture", 78),

    year: 2021,

    question: "Which of the following is NOT a method of crop propagation?",

    options: ["Seed planting", "Cutting", "Grafting", "Weeding"],

    answer: 3,

    explanation: "Weeding is not a method of propagation.",
  }),

  createQuestion({
    id: generateId("agriculture", 79),

    year: 2018,

    question: "Which of the following is a factor affecting crop growth?",

    options: ["Soil fertility", "Bank loan", "Market price", "Profit margin"],

    answer: 0,

    explanation: "Soil fertility directly affects plant growth.",
  }),

  createQuestion({
    id: generateId("agriculture", 80),

    year: 2023,

    question: "The process of applying chemicals to control pests is called",

    options: ["Fertilization", "Spraying", "Harvesting", "Ploughing"],

    answer: 1,

    explanation: "Spraying is the application of chemicals to control pests.",
  }),
  createQuestion({
    id: generateId("agriculture", 81),

    year: 2020,

    question:
      "Which of the following is a primary function of chlorophyll in plants?",

    options: [
      "Absorbing water",
      "Photosynthesis",
      "Seed dispersal",
      "Soil formation",
    ],

    answer: 1,

    explanation: "Chlorophyll helps plants trap sunlight for photosynthesis.",
  }),

  createQuestion({
    id: generateId("agriculture", 82),

    year: 2019,

    question: "Which of the following is a method of storing farm produce?",

    options: ["Refrigeration", "Ploughing", "Weeding", "Irrigation"],

    answer: 0,

    explanation: "Refrigeration helps preserve farm produce.",
  }),

  createQuestion({
    id: generateId("agriculture", 83),

    year: 2021,

    question: "Which of the following is a symptom of plant disease?",

    options: ["Wilting", "Germination", "Photosynthesis", "Pollination"],

    answer: 0,

    explanation: "Wilting is a common sign of plant disease or water stress.",
  }),

  createQuestion({
    id: generateId("agriculture", 84),

    year: 2018,

    question: "Which of the following is NOT a method of soil improvement?",

    options: [
      "Fertilizer application",
      "Crop rotation",
      "Overgrazing",
      "Manuring",
    ],

    answer: 2,

    explanation: "Overgrazing reduces soil quality instead of improving it.",
  }),

  createQuestion({
    id: generateId("agriculture", 85),

    year: 2022,

    question: "The removal of topsoil by wind or water is called",

    options: ["Erosion", "Irrigation", "Germination", "Pollination"],

    answer: 0,

    explanation: "Erosion is the removal of topsoil by natural forces.",
  }),

  createQuestion({
    id: generateId("agriculture", 86),

    year: 2020,

    question: "Which of the following is a method of animal feeding?",

    options: ["Grazing", "Ploughing", "Weeding", "Harvesting"],

    answer: 0,

    explanation: "Grazing is when animals feed directly on pasture.",
  }),

  createQuestion({
    id: generateId("agriculture", 87),

    year: 2019,

    question: "Which of the following is a source of farm water supply?",

    options: ["Rainfall", "Sand", "Gravel", "Air pollution"],

    answer: 0,

    explanation: "Rainfall is a natural source of water for agriculture.",
  }),

  createQuestion({
    id: generateId("agriculture", 88),

    year: 2021,

    question: "Which of the following is a type of farm record?",

    options: [
      "Cash record",
      "Weeding record",
      "Ploughing record",
      "Harvesting record",
    ],

    answer: 0,

    explanation: "Cash records track farm income and expenditure.",
  }),

  createQuestion({
    id: generateId("agriculture", 89),

    year: 2017,

    question: "Which of the following is a function of manure?",

    options: [
      "Improves soil fertility",
      "Kills crops",
      "Increases erosion",
      "Reduces rainfall",
    ],

    answer: 0,

    explanation: "Manure adds nutrients to the soil.",
  }),

  createQuestion({
    id: generateId("agriculture", 90),

    year: 2023,

    question: "Which of the following is a method of crop harvesting?",

    options: ["Cutting", "Irrigation", "Ploughing", "Spraying"],

    answer: 0,

    explanation: "Cutting is a common method of harvesting crops.",
  }),

  createQuestion({
    id: generateId("agriculture", 91),

    year: 2020,

    question: "Which of the following is a characteristic of clay soil?",

    options: [
      "Large particles",
      "Good drainage",
      "Sticky when wet",
      "Low fertility always",
    ],

    answer: 2,

    explanation: "Clay soil becomes sticky when wet.",
  }),

  createQuestion({
    id: generateId("agriculture", 92),

    year: 2019,

    question: "Which of the following is a method of crop protection?",

    options: [
      "Spraying pesticides",
      "Ploughing only",
      "Weeding only",
      "Harvesting",
    ],

    answer: 0,

    explanation: "Pesticides protect crops from pests and diseases.",
  }),

  createQuestion({
    id: generateId("agriculture", 93),

    year: 2021,

    question: "Which of the following is a benefit of farm records?",

    options: [
      "Helps decision making",
      "Increases pests",
      "Reduces production",
      "Destroys crops",
    ],

    answer: 0,

    explanation: "Farm records help farmers make better decisions.",
  }),

  createQuestion({
    id: generateId("agriculture", 94),

    year: 2018,

    question:
      "Which of the following is a type of livestock disease control method?",

    options: ["Vaccination", "Irrigation", "Ploughing", "Weeding"],

    answer: 0,

    explanation: "Vaccination prevents livestock diseases.",
  }),

  createQuestion({
    id: generateId("agriculture", 95),

    year: 2022,

    question: "Which of the following is a factor affecting animal production?",

    options: [
      "Feed availability",
      "Market price",
      "Weather forecast",
      "Bank loans",
    ],

    answer: 0,

    explanation: "Feed availability directly affects animal growth.",
  }),

  createQuestion({
    id: generateId("agriculture", 96),

    year: 2020,

    question: "Which of the following is a method of planting crops?",

    options: ["Transplanting", "Weeding", "Harvesting", "Spraying"],

    answer: 0,

    explanation: "Transplanting is moving seedlings to the field.",
  }),

  createQuestion({
    id: generateId("agriculture", 97),

    year: 2019,

    question: "Which of the following is a benefit of agroforestry?",

    options: [
      "Soil protection",
      "Deforestation",
      "Erosion increase",
      "Loss of fertility",
    ],

    answer: 0,

    explanation: "Agroforestry helps conserve soil and improve productivity.",
  }),

  createQuestion({
    id: generateId("agriculture", 98),

    year: 2021,

    question: "Which of the following is a method of harvesting fish?",

    options: ["Netting", "Weeding", "Ploughing", "Spraying"],

    answer: 0,

    explanation: "Netting is used to catch fish from water bodies.",
  }),

  createQuestion({
    id: generateId("agriculture", 99),

    year: 2018,

    question: "Which of the following is a type of farm input?",

    options: ["Fertilizer", "Profit", "Market", "Demand"],

    answer: 0,

    explanation: "Fertilizer is an input used to improve crop yield.",
  }),

  createQuestion({
    id: generateId("agriculture", 100),

    year: 2023,

    question: "The science of plant breeding is called",

    options: ["Genetics", "Economics", "Sociology", "Physics"],

    answer: 0,

    explanation: "Genetics is the study of heredity and plant improvement.",
  }),
];

/* =========================================================
COMMERCE
========================================================= */
const commerce = [
  createQuestion({
    id: generateId("commerce", 1),

    question:
      "Which of the following documents is used when goods are returned by the buyer to the seller?",

    options: ["Invoice", "Debit note", "Credit note", "Receipt"],

    answer: 1,

    explanation:
      "A debit note is sent by the buyer to notify the seller that goods have been returned.",
  }),

  createQuestion({
    id: generateId("commerce", 2),

    question:
      "The process by which a business combines with another business is known as",

    options: ["Liquidation", "Amalgamation", "Warehousing", "Franchising"],

    answer: 1,

    explanation:
      "Amalgamation refers to the merging or combining of two or more businesses.",
  }),

  createQuestion({
    id: generateId("commerce", 3),

    question: "Which of the following is a function of commercial banks?",

    options: [
      "Printing of currency",
      "Accepting deposits",
      "Formulation of government policies",
      "Issuing licenses",
    ],

    answer: 1,

    explanation:
      "Commercial banks accept deposits from customers and provide loans.",
  }),

  createQuestion({
    id: generateId("commerce", 4),

    question: "Trade between two countries is known as",

    options: ["Home trade", "Retail trade", "Foreign trade", "Internal trade"],

    answer: 2,

    explanation:
      "Foreign trade involves the exchange of goods and services between countries.",
  }),

  createQuestion({
    id: generateId("commerce", 5),

    question: "Which of the following is an example of a chain store?",

    options: ["A kiosk", "A hawker", "Shoprite", "A market stall"],

    answer: 2,

    explanation:
      "Chain stores operate multiple branches under the same ownership and management.",
  }),

  createQuestion({
    id: generateId("commerce", 6),

    question: "A business owned by one person is called",

    options: [
      "Partnership",
      "Sole proprietorship",
      "Co-operative society",
      "Limited liability company",
    ],

    answer: 1,

    explanation:
      "A sole proprietorship is owned and controlled by one individual.",
  }),

  createQuestion({
    id: generateId("commerce", 7),

    question: "Which of the following is NOT a function of advertising?",

    options: [
      "Creating awareness",
      "Increasing sales",
      "Storing goods",
      "Persuading consumers",
    ],

    answer: 2,

    explanation:
      "Advertising promotes products and services but does not store goods.",
  }),

  createQuestion({
    id: generateId("commerce", 8),

    question: "The person who takes the greatest risk in a business is the",

    options: ["Employee", "Creditor", "Entrepreneur", "Customer"],

    answer: 2,

    explanation:
      "The entrepreneur bears the major risks and uncertainties of the business.",
  }),

  createQuestion({
    id: generateId("commerce", 9),

    question: "Which of the following aids trade directly?",

    options: ["Transport", "Manufacturing", "Mining", "Construction"],

    answer: 0,

    explanation:
      "Transport is an aid to trade because it facilitates movement of goods and people.",
  }),

  createQuestion({
    id: generateId("commerce", 10),

    question: "A cheque marked with two parallel lines is called",

    options: [
      "Bearer cheque",
      "Dishonoured cheque",
      "Crossed cheque",
      "Open cheque",
    ],

    answer: 2,

    explanation:
      "A crossed cheque can only be paid into a bank account for security purposes.",
  }),
  createQuestion({
    id: generateId("commerce", 11),

    question:
      "Which of the following documents shows details of goods sent to a buyer?",

    options: ["Receipt", "Invoice", "Voucher", "Cheque"],

    answer: 1,

    explanation:
      "An invoice contains details of goods sold, prices, and terms of payment.",
  }),

  createQuestion({
    id: generateId("commerce", 12),

    question:
      "The division of a market into different groups of buyers is known as",

    options: [
      "Market research",
      "Market segmentation",
      "Consumerism",
      "Branding",
    ],

    answer: 1,

    explanation:
      "Market segmentation involves dividing consumers into groups with similar needs.",
  }),

  createQuestion({
    id: generateId("commerce", 13),

    question:
      "An agreement between two or more persons to carry on business is called",

    options: [
      "Joint stock company",
      "Partnership",
      "Co-operative society",
      "Public corporation",
    ],

    answer: 1,

    explanation:
      "A partnership is formed when two or more people agree to run a business together.",
  }),

  createQuestion({
    id: generateId("commerce", 14),

    question: "Which of the following is a source of short-term finance?",

    options: ["Debenture", "Bank overdraft", "Mortgage", "Ordinary shares"],

    answer: 1,

    explanation:
      "Bank overdrafts are commonly used for short-term financing needs.",
  }),

  createQuestion({
    id: generateId("commerce", 15),

    question: "The buying and selling of goods in small quantities is known as",

    options: ["Wholesaling", "Retailing", "Manufacturing", "Importation"],

    answer: 1,

    explanation:
      "Retailing involves selling goods directly to final consumers in small quantities.",
  }),

  createQuestion({
    id: generateId("commerce", 16),

    question: "Which of the following is NOT a feature of money?",

    options: ["Durability", "Portability", "Perishability", "Divisibility"],

    answer: 2,

    explanation:
      "Money should not be perishable; it must last long and remain useful.",
  }),

  createQuestion({
    id: generateId("commerce", 17),

    question: "A public limited company obtains capital mainly through",

    options: [
      "Personal savings",
      "Issuing shares",
      "Borrowing from friends",
      "Hire purchase",
    ],

    answer: 1,

    explanation:
      "Public limited companies raise capital by selling shares to the public.",
  }),

  createQuestion({
    id: generateId("commerce", 18),

    question: "Which of the following is an example of an intangible asset?",

    options: ["Motor vehicle", "Building", "Goodwill", "Furniture"],

    answer: 2,

    explanation:
      "Goodwill is an intangible asset because it cannot be physically touched.",
  }),

  createQuestion({
    id: generateId("commerce", 19),

    question: "The transfer of goods from producer to consumer is known as",

    options: ["Transportation", "Distribution", "Warehousing", "Production"],

    answer: 1,

    explanation:
      "Distribution involves moving goods from producers to consumers.",
  }),

  createQuestion({
    id: generateId("commerce", 20),

    question: "Which of the following is a function of warehousing?",

    options: [
      "Manufacturing goods",
      "Advertising products",
      "Storing goods",
      "Transporting goods",
    ],

    answer: 2,

    explanation:
      "Warehousing provides storage facilities for goods until they are needed.",
  }),

  createQuestion({
    id: generateId("commerce", 21),

    question: "The process of informing consumers about a product is known as",

    options: ["Branding", "Promotion", "Packaging", "Warehousing"],

    answer: 1,

    explanation:
      "Promotion involves creating awareness and informing consumers about products.",
  }),

  createQuestion({
    id: generateId("commerce", 22),

    question:
      "Which of the following is a means of transporting bulky goods over long distances?",

    options: [
      "Air transport",
      "Pipeline transport",
      "Rail transport",
      "Courier service",
    ],

    answer: 2,

    explanation:
      "Rail transport is suitable for carrying bulky goods over long distances.",
  }),

  createQuestion({
    id: generateId("commerce", 23),

    question:
      "A reduction in the price of goods to encourage bulk purchase is called",

    options: ["Trade discount", "Commission", "Dividend", "Premium"],

    answer: 0,

    explanation:
      "Trade discount is given to buyers, especially wholesalers, for buying in large quantities.",
  }),

  createQuestion({
    id: generateId("commerce", 24),

    question: "Which of the following is NOT a type of insurance?",

    options: [
      "Marine insurance",
      "Life assurance",
      "Hire purchase",
      "Fire insurance",
    ],

    answer: 2,

    explanation:
      "Hire purchase is a method of buying goods, not a type of insurance.",
  }),

  createQuestion({
    id: generateId("commerce", 25),

    question: "The reward for capital invested in a business is known as",

    options: ["Wage", "Rent", "Interest", "Salary"],

    answer: 2,

    explanation: "Interest is the reward paid for the use of capital.",
  }),

  createQuestion({
    id: generateId("commerce", 26),

    question: "Which of the following documents acknowledges payment received?",

    options: ["Invoice", "Receipt", "Catalogue", "Indent"],

    answer: 1,

    explanation: "A receipt serves as proof that payment has been received.",
  }),

  createQuestion({
    id: generateId("commerce", 27),

    question: "The act of buying goods from another country is called",

    options: ["Export trade", "Import trade", "Entrepot trade", "Retail trade"],

    answer: 1,

    explanation: "Import trade involves buying goods from foreign countries.",
  }),

  createQuestion({
    id: generateId("commerce", 28),

    question: "Which of the following is an advantage of road transport?",

    options: [
      "Very slow movement",
      "High construction cost",
      "Door-to-door service",
      "Limited flexibility",
    ],

    answer: 2,

    explanation:
      "Road transport offers convenient door-to-door delivery services.",
  }),

  createQuestion({
    id: generateId("commerce", 29),

    question:
      "A person who acts on behalf of another in business transactions is known as",

    options: ["Retailer", "Consumer", "Agent", "Producer"],

    answer: 2,

    explanation:
      "An agent represents another person or business in commercial dealings.",
  }),

  createQuestion({
    id: generateId("commerce", 30),

    question:
      "Which of the following is a characteristic of a sole proprietorship?",

    options: [
      "Separate legal entity",
      "Unlimited liability",
      "Large capital base",
      "Perpetual existence",
    ],

    answer: 1,

    explanation:
      "The owner of a sole proprietorship has unlimited liability for business debts.",
  }),
  createQuestion({
    id: generateId("commerce", 31),

    question:
      "Which of the following encourages customers to buy goods on installment payments?",

    options: [
      "Mail order business",
      "Hire purchase",
      "Self-service",
      "Barter trade",
    ],

    answer: 1,

    explanation:
      "Hire purchase allows buyers to pay for goods in installments while using them.",
  }),

  createQuestion({
    id: generateId("commerce", 32),

    question: "The sharing of business profit among partners is based on",

    options: [
      "Capital employed only",
      "Partnership agreement",
      "Age of partners",
      "Government policy",
    ],

    answer: 1,

    explanation:
      "Partners share profits according to the terms stated in the partnership agreement.",
  }),

  createQuestion({
    id: generateId("commerce", 33),

    question: "Which of the following is a warehouse document?",

    options: ["Dock warrant", "Debit note", "Receipt", "Cheque"],

    answer: 0,

    explanation:
      "A dock warrant is a warehouse document showing ownership of stored goods.",
  }),

  createQuestion({
    id: generateId("commerce", 34),

    question:
      "The use of attractive containers and wrappers for goods is called",

    options: ["Branding", "Packaging", "Advertising", "Promotion"],

    answer: 1,

    explanation:
      "Packaging involves designing and using containers or wrappers for products.",
  }),

  createQuestion({
    id: generateId("commerce", 35),

    question: "Which of the following is NOT an advantage of advertising?",

    options: [
      "Creates awareness",
      "Increases demand",
      "Reduces production completely",
      "Educates consumers",
    ],

    answer: 2,

    explanation:
      "Advertising promotes sales and awareness but does not stop production.",
  }),

  createQuestion({
    id: generateId("commerce", 36),

    question: "A company owned and financed by the government is known as",

    options: [
      "Private company",
      "Public corporation",
      "Partnership",
      "Sole proprietorship",
    ],

    answer: 1,

    explanation:
      "A public corporation is established, owned, and controlled by the government.",
  }),

  createQuestion({
    id: generateId("commerce", 37),

    question:
      "The middleman who buys goods in large quantities from producers is called",

    options: ["Retailer", "Consumer", "Wholesaler", "Agent"],

    answer: 2,

    explanation:
      "Wholesalers buy goods in bulk from producers and sell to retailers.",
  }),

  createQuestion({
    id: generateId("commerce", 38),

    question: "Which of the following is an example of indirect service?",

    options: ["Teaching", "Banking", "Fishing", "Medical practice"],

    answer: 1,

    explanation:
      "Banking provides indirect services that facilitate trade and commerce.",
  }),

  createQuestion({
    id: generateId("commerce", 39),

    question:
      "The amount paid regularly by an insurance policyholder is called",

    options: ["Compensation", "Dividend", "Premium", "Commission"],

    answer: 2,

    explanation:
      "Premium is the regular payment made to keep an insurance policy active.",
  }),

  createQuestion({
    id: generateId("commerce", 40),

    question: "Which of the following is the oldest form of trade?",

    options: ["Retail trade", "Barter trade", "Foreign trade", "E-commerce"],

    answer: 1,

    explanation:
      "Barter trade is the direct exchange of goods and services without money.",
  }),
  createQuestion({
    id: generateId("commerce", 41),

    question: "Which of the following is a function of the retailer?",

    options: [
      "Production of goods",
      "Breaking bulk",
      "Mining raw materials",
      "Manufacturing machines",
    ],

    answer: 1,

    explanation:
      "Retailers break bulk by selling goods in smaller quantities to consumers.",
  }),

  createQuestion({
    id: generateId("commerce", 42),

    question: "An association formed to protect consumers is called",

    options: [
      "Trade union",
      "Consumer association",
      "Pressure group",
      "Chamber of commerce",
    ],

    answer: 1,

    explanation:
      "Consumer associations protect buyers against exploitation and unfair practices.",
  }),

  createQuestion({
    id: generateId("commerce", 43),

    question: "Which of the following is used for sea transport?",

    options: ["Trailer", "Pipeline", "Ship", "Locomotive"],

    answer: 2,

    explanation:
      "Ships are the major means of transporting goods and passengers by sea.",
  }),

  createQuestion({
    id: generateId("commerce", 44),

    question: "The person who receives goods from a consignor is known as the",

    options: ["Consignee", "Carrier", "Retailer", "Broker"],

    answer: 0,

    explanation:
      "A consignee is the person to whom goods are sent in a consignment transaction.",
  }),

  createQuestion({
    id: generateId("commerce", 45),

    question: "Which of the following is a feature of co-operative societies?",

    options: [
      "Profit maximization",
      "Democratic control",
      "Unlimited membership",
      "Government ownership",
    ],

    answer: 1,

    explanation:
      "Co-operative societies are democratically controlled by their members.",
  }),

  createQuestion({
    id: generateId("commerce", 46),

    question:
      "A person who specializes in bringing buyers and sellers together is called",

    options: ["Retailer", "Broker", "Wholesaler", "Importer"],

    answer: 1,

    explanation:
      "A broker connects buyers and sellers and earns commission for the service.",
  }),

  createQuestion({
    id: generateId("commerce", 47),

    question: "Which of the following is an example of a current asset?",

    options: ["Building", "Furniture", "Stock", "Motor vehicle"],

    answer: 2,

    explanation:
      "Stock is a current asset because it can be converted into cash within a short period.",
  }),

  createQuestion({
    id: generateId("commerce", 48),

    question: "The risk covered under marine insurance includes",

    options: [
      "Fire outbreak only",
      "Loss of goods at sea",
      "Theft in warehouses only",
      "Employee accidents",
    ],

    answer: 1,

    explanation:
      "Marine insurance protects against loss or damage to goods during sea transport.",
  }),

  createQuestion({
    id: generateId("commerce", 49),

    question: "Which of the following promotes international trade?",

    options: [
      "Custom duties",
      "Good transport system",
      "Trade barriers",
      "Political instability",
    ],

    answer: 1,

    explanation:
      "Efficient transportation facilitates movement of goods across countries.",
  }),

  createQuestion({
    id: generateId("commerce", 50),

    question: "A reduction granted for prompt payment is called",

    options: ["Trade discount", "Cash discount", "Commission", "Allowance"],

    answer: 1,

    explanation: "Cash discount is given to encourage buyers to pay quickly.",
  }),

  createQuestion({
    id: generateId("commerce", 51),

    question: "The act of selling goods to another country is known as",

    options: ["Import trade", "Retail trade", "Export trade", "Home trade"],

    answer: 2,

    explanation:
      "Export trade involves selling goods and services to foreign countries.",
  }),

  createQuestion({
    id: generateId("commerce", 52),

    question:
      "Which of the following is a method of payment in international trade?",

    options: ["Money order", "Bill of exchange", "Receipt", "Invoice"],

    answer: 1,

    explanation:
      "A bill of exchange is commonly used in settling international trade transactions.",
  }),

  createQuestion({
    id: generateId("commerce", 53),

    question:
      "An organization formed by traders and industrialists to protect their interests is called",

    options: [
      "Consumer association",
      "Trade union",
      "Chamber of commerce",
      "Co-operative society",
    ],

    answer: 2,

    explanation:
      "A chamber of commerce represents and protects business interests.",
  }),

  createQuestion({
    id: generateId("commerce", 54),

    question: "Which of the following is NOT a type of retailer?",

    options: ["Hawker", "Wholesaler", "Kiosk owner", "Supermarket operator"],

    answer: 1,

    explanation:
      "A wholesaler sells in bulk to retailers and is not a retailer.",
  }),

  createQuestion({
    id: generateId("commerce", 55),

    question: "The coming together of firms to control prices is known as",

    options: ["Cartel", "Retailing", "Branding", "Advertising"],

    answer: 0,

    explanation:
      "A cartel is formed when firms cooperate to control prices and output.",
  }),

  createQuestion({
    id: generateId("commerce", 56),

    question: "Which of the following is an advantage of air transport?",

    options: ["Slow movement", "Cheap cost", "Speed", "Limited coverage"],

    answer: 2,

    explanation:
      "Air transport is valued for its speed, especially for urgent deliveries.",
  }),

  createQuestion({
    id: generateId("commerce", 57),

    question:
      "The transfer of ownership from seller to buyer is achieved through",

    options: ["Exchange", "Warehousing", "Production", "Transportation"],

    answer: 0,

    explanation:
      "Exchange enables ownership of goods and services to pass from seller to buyer.",
  }),

  createQuestion({
    id: generateId("commerce", 58),

    question: "Which of the following is a document of title to goods?",

    options: ["Bill of lading", "Receipt", "Invoice", "Voucher"],

    answer: 0,

    explanation:
      "A bill of lading serves as evidence of ownership of goods in transit.",
  }),

  createQuestion({
    id: generateId("commerce", 59),

    question:
      "The business unit that combines all factors of production is the",

    options: ["Consumer", "Entrepreneur", "Retailer", "Government"],

    answer: 1,

    explanation:
      "The entrepreneur organizes and coordinates all factors of production.",
  }),

  createQuestion({
    id: generateId("commerce", 60),

    question: "Which of the following is NOT a function of wholesalers?",

    options: [
      "Storage of goods",
      "Breaking bulk",
      "Production of raw materials",
      "Financing retailers",
    ],

    answer: 2,

    explanation:
      "Wholesalers distribute goods but do not produce raw materials.",
  }),

  createQuestion({
    id: generateId("commerce", 61),

    question: "The amount of money used to start a business is known as",

    options: ["Capital", "Profit", "Turnover", "Discount"],

    answer: 0,

    explanation:
      "Capital refers to the funds invested in starting and running a business.",
  }),

  createQuestion({
    id: generateId("commerce", 62),

    question: "Which of the following is an example of indirect trade?",

    options: ["Retail trade", "Wholesaling", "Advertising", "Manufacturing"],

    answer: 2,

    explanation:
      "Advertising indirectly supports trade by promoting goods and services.",
  }),

  createQuestion({
    id: generateId("commerce", 63),

    question: "A person who underwrites shares agrees to",

    options: [
      "Buy unsold shares",
      "Manage the company",
      "Pay dividends",
      "Audit accounts",
    ],

    answer: 0,

    explanation:
      "Underwriters guarantee the purchase of shares not bought by the public.",
  }),

  createQuestion({
    id: generateId("commerce", 64),

    question: "Which of the following is a medium of advertising?",

    options: ["Warehouse", "Television", "Cheque", "Pipeline"],

    answer: 1,

    explanation:
      "Television is widely used to advertise products and services.",
  }),

  createQuestion({
    id: generateId("commerce", 65),

    question:
      "The insurance principle that requires full disclosure of facts is called",

    options: ["Indemnity", "Contribution", "Utmost good faith", "Subrogation"],

    answer: 2,

    explanation:
      "Utmost good faith requires both parties to disclose all material facts honestly.",
  }),

  createQuestion({
    id: generateId("commerce", 66),

    question:
      "Which of the following is a disadvantage of sole proprietorship?",

    options: [
      "Quick decision making",
      "Limited capital",
      "Close customer contact",
      "Business secrecy",
    ],

    answer: 1,

    explanation: "Sole proprietorships often suffer from inadequate capital.",
  }),

  createQuestion({
    id: generateId("commerce", 67),

    question:
      "The movement of goods from areas of surplus to areas of scarcity is known as",

    options: ["Distribution", "Transportation", "Communication", "Production"],

    answer: 1,

    explanation:
      "Transportation helps move goods from one location to another.",
  }),

  createQuestion({
    id: generateId("commerce", 68),

    question: "Which of the following is a function of insurance?",

    options: [
      "Elimination of risks",
      "Sharing of risks",
      "Increasing risks",
      "Preventing all accidents",
    ],

    answer: 1,

    explanation: "Insurance spreads risks among many policyholders.",
  }),

  createQuestion({
    id: generateId("commerce", 69),

    question: "A trademark helps a producer to",

    options: [
      "Avoid taxes",
      "Identify products",
      "Reduce wages",
      "Increase imports",
    ],

    answer: 1,

    explanation: "A trademark distinguishes a producer’s products from others.",
  }),

  createQuestion({
    id: generateId("commerce", 70),

    question: "The exchange of goods for goods without money is called",

    options: ["Credit trade", "Barter trade", "Foreign trade", "Retailing"],

    answer: 1,

    explanation:
      "Barter trade involves direct exchange without the use of money.",
  }),

  createQuestion({
    id: generateId("commerce", 71),

    question: "Which of the following is an aid to trade?",

    options: ["Manufacturing", "Commerce", "Extraction", "Construction"],

    answer: 1,

    explanation:
      "Commerce includes services that facilitate trade such as banking and transport.",
  }),

  createQuestion({
    id: generateId("commerce", 72),

    question: "The person who buys goods for final use is known as the",

    options: ["Wholesaler", "Consumer", "Agent", "Producer"],

    answer: 1,

    explanation: "Consumers purchase goods and services for personal use.",
  }),

  createQuestion({
    id: generateId("commerce", 73),

    question: "Which of the following is a source of long-term finance?",

    options: ["Bank overdraft", "Trade credit", "Debenture", "Cash discount"],

    answer: 2,

    explanation:
      "Debentures provide businesses with long-term borrowed capital.",
  }),

  createQuestion({
    id: generateId("commerce", 74),

    question: "The process of making goods known to consumers is called",

    options: ["Advertising", "Production", "Warehousing", "Transportation"],

    answer: 0,

    explanation: "Advertising informs consumers about products and services.",
  }),

  createQuestion({
    id: generateId("commerce", 75),

    question: "Which of the following is NOT a characteristic of money?",

    options: ["Scarcity", "Portability", "Divisibility", "Durability"],

    answer: 0,

    explanation:
      "Money should be generally available and acceptable, not scarce.",
  }),

  createQuestion({
    id: generateId("commerce", 76),

    question: "The reward paid to workers for their services is called",

    options: ["Interest", "Rent", "Wages", "Profit"],

    answer: 2,

    explanation: "Wages are payments made to labor for work done.",
  }),

  createQuestion({
    id: generateId("commerce", 77),

    question: "Which of the following is used in transporting crude oil?",

    options: ["Railway", "Pipeline", "Aircraft", "Ship"],

    answer: 1,

    explanation:
      "Pipelines are specially designed for transporting liquids like crude oil.",
  }),

  createQuestion({
    id: generateId("commerce", 78),

    question:
      "The relationship between a bank and its customer is mainly that of",

    options: [
      "Employer and employee",
      "Debtor and creditor",
      "Producer and consumer",
      "Landlord and tenant",
    ],

    answer: 1,

    explanation:
      "Banks and customers relate as debtor and creditor depending on deposits and loans.",
  }),

  createQuestion({
    id: generateId("commerce", 79),

    question:
      "Which of the following is a disadvantage of partnership business?",

    options: [
      "Pooling of resources",
      "Shared responsibility",
      "Possibility of disagreement",
      "Specialization",
    ],

    answer: 2,

    explanation:
      "Disagreements among partners can negatively affect the business.",
  }),

  createQuestion({
    id: generateId("commerce", 80),

    question:
      "The modern means of buying and selling goods through the internet is known as",

    options: ["Barter trade", "E-commerce", "Hire purchase", "Mail order"],

    answer: 1,

    explanation: "E-commerce involves conducting business transactions online.",
  }),
];
/* =========================================================
CRK
========================================================= */
const crs = [
  createQuestion({
    id: generateId("crs", 1),

    year: 2020,

    question: "The first book of the New Testament is",

    options: ["Mark", "Matthew", "Luke", "John"],

    answer: 1,

    explanation: "Matthew is the first book of the New Testament.",
  }),

  createQuestion({
    id: generateId("crs", 2),

    year: 2019,

    question: "God created the world in how many days according to Genesis?",

    options: ["Five days", "Six days", "Seven days", "Eight days"],

    answer: 1,

    explanation: "God created the world in six days and rested on the seventh.",
  }),

  createQuestion({
    id: generateId("crs", 3),

    year: 2021,

    question: "The father of faith in the Bible is",

    options: ["Moses", "Abraham", "David", "Noah"],

    answer: 1,

    explanation: "Abraham is regarded as the father of faith.",
  }),

  createQuestion({
    id: generateId("crs", 4),

    year: 2018,

    question: "The Ten Commandments were given to",

    options: ["Abraham", "Moses", "Joshua", "David"],

    answer: 1,

    explanation: "God gave the Ten Commandments to Moses on Mount Sinai.",
  }),

  createQuestion({
    id: generateId("crs", 5),

    year: 2022,

    question: "The place where Jesus was born is",

    options: ["Nazareth", "Jerusalem", "Bethlehem", "Galilee"],

    answer: 2,

    explanation: "Jesus was born in Bethlehem.",
  }),

  createQuestion({
    id: generateId("crs", 6),

    year: 2020,

    question: "Who betrayed Jesus?",

    options: ["Peter", "John", "Judas Iscariot", "James"],

    answer: 2,

    explanation: "Judas Iscariot betrayed Jesus.",
  }),

  createQuestion({
    id: generateId("crs", 7),

    year: 2019,

    question: "The book of Psalms is mainly written by",

    options: ["Moses", "David", "Solomon", "Isaiah"],

    answer: 1,

    explanation: "King David wrote most of the Psalms.",
  }),

  createQuestion({
    id: generateId("crs", 8),

    year: 2021,

    question: "The first man created by God was",

    options: ["Adam", "Noah", "Abel", "Cain"],

    answer: 0,

    explanation: "Adam was the first man created by God.",
  }),

  createQuestion({
    id: generateId("crs", 9),

    year: 2017,

    question: "Jesus was baptized by",

    options: ["Peter", "John the Baptist", "Paul", "James"],

    answer: 1,

    explanation: "John the Baptist baptized Jesus.",
  }),

  createQuestion({
    id: generateId("crs", 10),

    year: 2023,

    question: "The Holy Spirit descended on the disciples during",

    options: ["Passover", "Pentecost", "Easter", "Christmas"],

    answer: 1,

    explanation: "The Holy Spirit came at Pentecost.",
  }),

  createQuestion({
    id: generateId("crs", 11),

    year: 2020,

    question: "Noah built the ark because of",

    options: ["Drought", "Flood", "War", "Famine"],

    answer: 1,

    explanation: "God instructed Noah to build the ark for the flood.",
  }),

  createQuestion({
    id: generateId("crs", 12),

    year: 2019,

    question: "The Bible contains how many Testaments?",

    options: ["One", "Two", "Three", "Four"],

    answer: 1,

    explanation: "The Bible has the Old and New Testaments.",
  }),

  createQuestion({
    id: generateId("crs", 13),

    year: 2021,

    question: "Jesus fed 5000 people with",

    options: [
      "Five loaves and two fish",
      "Seven loaves and three fish",
      "Bread only",
      "Fruits only",
    ],

    answer: 0,

    explanation: "Jesus multiplied five loaves and two fish.",
  }),

  createQuestion({
    id: generateId("crs", 14),

    year: 2018,

    question: "The disciple known as the 'beloved disciple' is",

    options: ["Peter", "John", "Andrew", "Thomas"],

    answer: 1,

    explanation: "John is referred to as the beloved disciple.",
  }),

  createQuestion({
    id: generateId("crs", 15),

    year: 2022,

    question: "The last book of the Bible is",

    options: ["Revelation", "Jude", "Acts", "Romans"],

    answer: 0,

    explanation: "Revelation is the final book of the Bible.",
  }),

  createQuestion({
    id: generateId("crs", 16),

    year: 2020,

    question: "Jesus died on the cross at",

    options: ["Bethlehem", "Nazareth", "Calvary", "Jericho"],

    answer: 2,

    explanation: "Jesus was crucified at Calvary.",
  }),

  createQuestion({
    id: generateId("crs", 17),

    year: 2019,

    question: "The first miracle of Jesus was turning water into",

    options: ["Oil", "Wine", "Milk", "Honey"],

    answer: 1,

    explanation: "Jesus turned water into wine at Cana.",
  }),

  createQuestion({
    id: generateId("crs", 18),

    year: 2021,

    question: "Moses led the Israelites out of",

    options: ["Canaan", "Egypt", "Assyria", "Babylon"],

    answer: 1,

    explanation: "Moses led Israel out of Egypt.",
  }),

  createQuestion({
    id: generateId("crs", 19),

    year: 2017,

    question: "The ark of Noah landed on Mount",

    options: ["Sinai", "Carmel", "Ararat", "Zion"],

    answer: 2,

    explanation: "The ark rested on Mount Ararat.",
  }),

  createQuestion({
    id: generateId("crs", 20),

    year: 2023,

    question: "Saul was the first king of",

    options: ["Egypt", "Israel", "Judah", "Rome"],

    answer: 1,

    explanation: "Saul was the first king of Israel.",
  }),

  createQuestion({
    id: generateId("crs", 21),

    year: 2020,

    question: "The Great Commission was given by",

    options: ["Moses", "Jesus Christ", "Paul", "Peter"],

    answer: 1,

    explanation: "Jesus commanded His disciples to preach the gospel.",
  }),

  createQuestion({
    id: generateId("crs", 22),

    year: 2019,

    question: "David defeated Goliath with a",

    options: ["Sword", "Stone", "Arrow", "Spear"],

    answer: 1,

    explanation: "David used a sling and stone.",
  }),

  createQuestion({
    id: generateId("crs", 23),

    year: 2021,

    question: "The apostle who denied Jesus three times was",

    options: ["John", "Peter", "James", "Andrew"],

    answer: 1,

    explanation: "Peter denied Jesus three times.",
  }),

  createQuestion({
    id: generateId("crs", 24),

    year: 2018,

    question: "The Bible teaches that the wages of sin is",

    options: ["Life", "Death", "Peace", "Wealth"],

    answer: 1,

    explanation: "The Bible says the wages of sin is death.",
  }),

  createQuestion({
    id: generateId("crs", 25),

    year: 2022,

    question: "The fruit of the Spirit includes",

    options: ["Hatred", "Love", "Violence", "Envy"],

    answer: 1,

    explanation: "Love is one of the fruits of the Spirit.",
  }),

  createQuestion({
    id: generateId("crs", 26),

    year: 2020,

    question: "Jesus rose from the dead on the",

    options: ["First day", "Second day", "Third day", "Fourth day"],

    answer: 2,

    explanation: "Jesus rose on the third day.",
  }),

  createQuestion({
    id: generateId("crs", 27),

    year: 2019,

    question: "The father of John the Baptist is",

    options: ["Zachariah", "Joseph", "Elijah", "Samuel"],

    answer: 0,

    explanation: "Zachariah was John the Baptist’s father.",
  }),

  createQuestion({
    id: generateId("crs", 28),

    year: 2021,

    question: "The Sermon on the Mount is found in",

    options: ["Matthew", "Genesis", "Exodus", "Acts"],

    answer: 0,

    explanation: "The Sermon on the Mount is in Matthew chapters 5–7.",
  }),

  createQuestion({
    id: generateId("crs", 29),

    year: 2017,

    question: "The first murder in the Bible was committed by",

    options: ["Abel", "Cain", "Adam", "Noah"],

    answer: 1,

    explanation: "Cain killed his brother Abel.",
  }),

  createQuestion({
    id: generateId("crs", 30),

    year: 2023,

    question: "Paul was formerly known as",

    options: ["Saul", "Peter", "Barnabas", "Luke"],

    answer: 0,

    explanation: "Apostle Paul was formerly Saul.",
  }),

  createQuestion({
    id: generateId("crs", 31),

    year: 2020,

    question: "The Bible teaches that God is",

    options: ["Weak", "Love", "Angry only", "Unjust"],

    answer: 1,

    explanation: "1 John 4:8 says God is love.",
  }),

  createQuestion({
    id: generateId("crs", 32),

    year: 2019,

    question: "The tribe of Israel divided into how many kingdoms?",

    options: ["One", "Two", "Three", "Four"],

    answer: 1,

    explanation: "Israel split into Judah and Israel.",
  }),

  createQuestion({
    id: generateId("crs", 33),

    year: 2021,

    question: "The commandment 'Thou shalt not steal' is number",

    options: ["Sixth", "Seventh", "Eighth", "Ninth"],

    answer: 2,

    explanation: "It is the eighth commandment.",
  }),

  createQuestion({
    id: generateId("crs", 34),

    year: 2018,

    question: "Jesus called Himself the",

    options: [
      "Son of Pharaoh",
      "Son of God",
      "Son of man",
      "Son of David only",
    ],

    answer: 2,

    explanation: "Jesus often referred to Himself as the Son of Man.",
  }),

  createQuestion({
    id: generateId("crs", 35),

    year: 2022,

    question: "The disciple who doubted Jesus’ resurrection was",

    options: ["Thomas", "Peter", "John", "James"],

    answer: 0,

    explanation: "Thomas doubted until he saw Jesus.",
  }),

  createQuestion({
    id: generateId("crs", 36),

    year: 2020,

    question: "The Bible teaches that faith comes by",

    options: ["Seeing", "Hearing", "Touching", "Dreaming"],

    answer: 1,

    explanation: "Faith comes by hearing the word of God.",
  }),

  createQuestion({
    id: generateId("crs", 37),

    year: 2019,

    question: "The Book of Acts records",

    options: [
      "Creation",
      "Life of Jesus only",
      "Acts of the apostles",
      "Prophecies",
    ],

    answer: 2,

    explanation: "Acts records the early church and apostles.",
  }),

  createQuestion({
    id: generateId("crs", 38),

    year: 2021,

    question: "The Holy Spirit is also called",

    options: ["Comforter", "Destroyer", "Judge only", "King only"],

    answer: 0,

    explanation: "The Holy Spirit is called the Comforter.",
  }),

  createQuestion({
    id: generateId("crs", 39),

    year: 2018,

    question: "The Israelites crossed the Red Sea under the leadership of",

    options: ["Joshua", "Moses", "David", "Samuel"],

    answer: 1,

    explanation: "Moses led the crossing of the Red Sea.",
  }),

  createQuestion({
    id: generateId("crs", 40),

    year: 2023,

    question: "The Bible teaches that the greatest commandment is to love",

    options: ["Money", "Enemies only", "God and neighbor", "Self only"],

    answer: 2,

    explanation:
      "Jesus taught love for God and neighbor as greatest commandment.",
  }),

  createQuestion({
    id: generateId("crs", 41),

    year: 2020,

    question: "The book of Genesis begins with",

    options: ["The flood", "Creation", "The law", "Kingship"],

    answer: 1,

    explanation: "Genesis begins with the creation story.",
  }),

  createQuestion({
    id: generateId("crs", 42),

    year: 2019,

    question: "Jesus taught the parable of the Good Samaritan to show",

    options: ["Wealth", "Love for neighbor", "War", "Power"],

    answer: 1,

    explanation: "The parable teaches love and compassion.",
  }),

  createQuestion({
    id: generateId("crs", 43),

    year: 2021,

    question: "The Bible is divided into",

    options: ["One book", "Two major sections", "Three books", "Four books"],

    answer: 1,

    explanation: "The Bible has Old and New Testaments.",
  }),

  createQuestion({
    id: generateId("crs", 44),

    year: 2018,

    question: "The apostle to the Gentiles was",

    options: ["Peter", "Paul", "John", "James"],

    answer: 1,

    explanation: "Paul preached mainly to the Gentiles.",
  }),

  createQuestion({
    id: generateId("crs", 45),

    year: 2022,

    question: "The first book of the Old Testament is",

    options: ["Exodus", "Genesis", "Leviticus", "Numbers"],

    answer: 1,

    explanation: "Genesis is the first book of the Old Testament.",
  }),

  createQuestion({
    id: generateId("crs", 46),

    year: 2020,

    question: "The Bible teaches that man is created in the image of",

    options: ["Angels", "God", "Animals", "Nature"],

    answer: 1,

    explanation: "Humans are created in the image of God.",
  }),

  createQuestion({
    id: generateId("crs", 47),

    year: 2019,

    question: "The Book of Revelation was written by",

    options: ["Paul", "John", "Peter", "Luke"],

    answer: 1,

    explanation: "John wrote the Book of Revelation.",
  }),

  createQuestion({
    id: generateId("crs", 48),

    year: 2021,

    question: "The Israelites received manna in",

    options: ["Egypt", "Wilderness", "Canaan", "Rome"],

    answer: 1,

    explanation: "God provided manna in the wilderness.",
  }),

  createQuestion({
    id: generateId("crs", 49),

    year: 2017,

    question: "The Bible teaches that prayer should be done",

    options: [
      "Only in church",
      "Without ceasing",
      "Only at night",
      "Only on Sundays",
    ],

    answer: 1,

    explanation: "Believers are encouraged to pray continually.",
  }),

  createQuestion({
    id: generateId("crs", 50),

    year: 2023,

    question: "Jesus referred to Himself as the",

    options: [
      "Bread of life",
      "King of Egypt",
      "Son of Pharaoh",
      "Prophet only",
    ],

    answer: 0,

    explanation: "Jesus called Himself the Bread of Life.",
  }),

  createQuestion({
    id: generateId("crs", 51),

    year: 2020,

    question: "The Bible teaches forgiveness is",

    options: ["Optional", "Mandatory", "Impossible", "Unnecessary"],

    answer: 1,

    explanation: "Christians are commanded to forgive others.",
  }),

  createQuestion({
    id: generateId("crs", 52),

    year: 2019,

    question: "The early Christians were first called Christians in",

    options: ["Jerusalem", "Antioch", "Rome", "Bethlehem"],

    answer: 1,

    explanation: "Believers were first called Christians in Antioch.",
  }),

  createQuestion({
    id: generateId("crs", 53),

    year: 2021,

    question: "The Bible teaches that the fear of the Lord is the beginning of",

    options: ["Wealth", "Wisdom", "Power", "Strength"],

    answer: 1,

    explanation: "Proverbs teaches fear of God is beginning of wisdom.",
  }),

  createQuestion({
    id: generateId("crs", 54),

    year: 2018,

    question: "The disciple who replaced Judas was",

    options: ["Matthias", "Barnabas", "Silas", "Timothy"],

    answer: 0,

    explanation: "Matthias was chosen to replace Judas.",
  }),

  createQuestion({
    id: generateId("crs", 55),

    year: 2022,

    question: "The Bible teaches that love is",

    options: ["Harmful", "Patient and kind", "Selfish", "Angry"],

    answer: 1,

    explanation: "1 Corinthians 13 describes love as patient and kind.",
  }),

  createQuestion({
    id: generateId("crs", 56),

    year: 2020,

    question: "The Israelites were led into Canaan by",

    options: ["Moses", "Joshua", "Aaron", "Samuel"],

    answer: 1,

    explanation: "Joshua led Israel into the Promised Land.",
  }),

  createQuestion({
    id: generateId("crs", 57),

    year: 2019,

    question: "The Bible teaches that salvation is through",

    options: ["Works only", "Faith in Christ", "Money", "Sacrifice of animals"],

    answer: 1,

    explanation: "Salvation comes through faith in Jesus Christ.",
  }),

  createQuestion({
    id: generateId("crs", 58),

    year: 2021,

    question: "The number of disciples chosen by Jesus was",

    options: ["10", "12", "14", "7"],

    answer: 1,

    explanation: "Jesus selected 12 disciples.",
  }),

  createQuestion({
    id: generateId("crs", 59),

    year: 2018,

    question: "The Bible teaches that the Lord is my",

    options: ["Shepherd", "King only", "Enemy", "Judge only"],

    answer: 0,

    explanation: "Psalm 23 says, 'The Lord is my shepherd.'",
  }),

  createQuestion({
    id: generateId("crs", 60),

    year: 2022,

    question: "The first miracle recorded in the Old Testament was",

    options: ["Parting of the Red Sea", "Creation", "Flood", "Burning bush"],

    answer: 3,

    explanation: "God spoke to Moses through the burning bush.",
  }),

  createQuestion({
    id: generateId("crs", 61),

    year: 2020,

    question: "The Bible teaches that God created man from",

    options: ["Water", "Dust", "Stone", "Air"],

    answer: 1,

    explanation: "God formed man from the dust of the ground.",
  }),

  createQuestion({
    id: generateId("crs", 62),

    year: 2019,

    question: "The book of Proverbs is known for",

    options: ["Laws", "Wisdom sayings", "History", "Prophecies"],

    answer: 1,

    explanation: "Proverbs contains wise sayings.",
  }),

  createQuestion({
    id: generateId("crs", 63),

    year: 2021,

    question: "The Israelites wandered in the wilderness for",

    options: ["10 years", "20 years", "40 years", "50 years"],

    answer: 2,

    explanation: "Israel wandered for 40 years.",
  }),

  createQuestion({
    id: generateId("crs", 64),

    year: 2018,

    question: "The Bible teaches that blessed are the",

    options: ["Rich", "Meek", "Strong", "Powerful"],

    answer: 1,

    explanation: "Jesus said, 'Blessed are the meek.'",
  }),

  createQuestion({
    id: generateId("crs", 65),

    year: 2022,

    question: "The apostle who wrote most of the New Testament letters is",

    options: ["Peter", "Paul", "John", "James"],

    answer: 1,

    explanation: "Paul wrote many epistles in the New Testament.",
  }),

  createQuestion({
    id: generateId("crs", 66),

    year: 2020,

    question: "The Bible teaches that God is",

    options: ["Unchanging", "Weak", "Limited", "Unjust"],

    answer: 0,

    explanation: "God is unchanging according to scripture.",
  }),

  createQuestion({
    id: generateId("crs", 67),

    year: 2019,

    question: "The first plague in Egypt was",

    options: ["Darkness", "Water turned to blood", "Locusts", "Frogs"],

    answer: 1,

    explanation: "The first plague turned water into blood.",
  }),

  createQuestion({
    id: generateId("crs", 68),

    year: 2021,

    question: "The Bible teaches that the greatest among you must be",

    options: ["Servant", "King", "Ruler", "Judge"],

    answer: 0,

    explanation: "Jesus taught that greatness is in service.",
  }),

  createQuestion({
    id: generateId("crs", 69),

    year: 2018,

    question: "The book of Isaiah is found in the",

    options: ["New Testament", "Old Testament", "Gospels", "Epistles"],

    answer: 1,

    explanation: "Isaiah is one of the major prophets in the Old Testament.",
  }),

  createQuestion({
    id: generateId("crs", 70),

    year: 2022,

    question: "The Bible teaches that the fruit of the Spirit includes",

    options: ["Anger", "Joy", "Hatred", "Jealousy"],

    answer: 1,

    explanation: "Joy is part of the fruit of the Spirit.",
  }),

  createQuestion({
    id: generateId("crs", 71),

    year: 2020,

    question: "The disciples received the Holy Spirit in the",

    options: ["Upper room", "Temple", "Synagogue", "Mount Sinai"],

    answer: 0,

    explanation: "The Holy Spirit came upon them in the upper room.",
  }),

  createQuestion({
    id: generateId("crs", 72),

    year: 2019,

    question: "The Bible teaches that Jesus is the",

    options: ["Son of God", "Son of Pharaoh", "Son of Caesar", "Son of Moses"],

    answer: 0,

    explanation: "Jesus is the Son of God.",
  }),

  createQuestion({
    id: generateId("crs", 73),

    year: 2021,

    question: "The Bible teaches that those who mourn will",

    options: ["Be forgotten", "Be comforted", "Be punished", "Be rejected"],

    answer: 1,

    explanation: "Jesus said mourners shall be comforted.",
  }),

  createQuestion({
    id: generateId("crs", 74),

    year: 2018,

    question: "The Bible teaches that man shall not live by",

    options: ["Bread alone", "Water alone", "Money alone", "Work alone"],

    answer: 0,

    explanation: "Man lives by every word of God.",
  }),

  createQuestion({
    id: generateId("crs", 75),

    year: 2022,

    question: "The Bible teaches that God is a",

    options: ["Spirit", "Stone", "Man", "Tree"],

    answer: 0,

    explanation: "God is Spirit.",
  }),

  createQuestion({
    id: generateId("crs", 76),

    year: 2020,

    question: "The Bible teaches that Jesus is the",

    options: [
      "Light of the world",
      "King of Egypt",
      "Prince of Persia",
      "Prophet of Rome",
    ],

    answer: 0,

    explanation: "Jesus called Himself the light of the world.",
  }),

  createQuestion({
    id: generateId("crs", 77),

    year: 2019,

    question: "The Bible teaches that David was a",

    options: ["Prophet", "Shepherd boy", "King only", "Priest"],

    answer: 1,

    explanation: "David was a shepherd before becoming king.",
  }),

  createQuestion({
    id: generateId("crs", 78),

    year: 2021,

    question: "The Bible teaches that the wages of sin is",

    options: ["Life", "Death", "Wealth", "Peace"],

    answer: 1,

    explanation: "The wages of sin is death.",
  }),

  createQuestion({
    id: generateId("crs", 79),

    year: 2018,

    question: "The Bible teaches that God created",

    options: ["Only humans", "Only animals", "Heaven and earth", "Only plants"],

    answer: 2,

    explanation: "God created heaven and earth.",
  }),

  createQuestion({
    id: generateId("crs", 80),

    year: 2023,

    question: "The Bible teaches that love is the",

    options: [
      "Least commandment",
      "Greatest commandment",
      "Optional commandment",
      "Old law only",
    ],

    answer: 1,

    explanation: "Love is the greatest commandment.",
  }),
]; /* =========================================================
IRK
========================================================= */
const irs = [
  createQuestion({
    id: generateId("irs", 1),
    year: 2020,

    question: "The first pillar of Islam is",

    options: ["Zakat", "Shahada", "Salah", "Sawm"],

    answer: 1,

    explanation: "Shahada (faith declaration) is the first pillar of Islam.",
  }),

  createQuestion({
    id: generateId("irs", 2),
    year: 2019,

    question: "The holy book of Islam is",

    options: ["Bible", "Torah", "Qur'an", "Zabur"],

    answer: 2,

    explanation:
      "The Qur'an is the holy book revealed to Prophet Muhammad (SAW).",
  }),

  createQuestion({
    id: generateId("irs", 3),
    year: 2021,

    question: "Prophet Muhammad (SAW) was born in",

    options: ["Madinah", "Makkah", "Jerusalem", "Taif"],

    answer: 1,

    explanation: "He was born in Makkah.",
  }),

  createQuestion({
    id: generateId("irs", 4),
    year: 2018,

    question: "The night the Qur'an was first revealed is called",

    options: ["Laylatul Qadr", "Eid al-Fitr", "Hijrah", "Arafat"],

    answer: 0,

    explanation: "Laylatul Qadr is the Night of Power.",
  }),

  createQuestion({
    id: generateId("irs", 5),
    year: 2022,

    question: "Muslims pray how many times daily?",

    options: ["Three", "Four", "Five", "Six"],

    answer: 2,

    explanation: "Muslims perform five daily prayers (Salah).",
  }),

  createQuestion({
    id: generateId("irs", 6),
    year: 2020,

    question: "The migration of Prophet Muhammad (SAW) is called",

    options: ["Hijrah", "Hajj", "Zakat", "Sawm"],

    answer: 0,

    explanation: "Hijrah refers to migration from Makkah to Madinah.",
  }),

  createQuestion({
    id: generateId("irs", 7),
    year: 2019,

    question: "The first caliph of Islam was",

    options: ["Umar", "Uthman", "Abu Bakr", "Ali"],

    answer: 2,

    explanation: "Abu Bakr was the first caliph after the Prophet.",
  }),

  createQuestion({
    id: generateId("irs", 8),
    year: 2021,

    question: "Zakat means",

    options: ["Prayer", "Charity", "Fasting", "Pilgrimage"],

    answer: 1,

    explanation: "Zakat is obligatory charity.",
  }),

  createQuestion({
    id: generateId("irs", 9),
    year: 2017,

    question: "The month of fasting in Islam is",

    options: ["Shawwal", "Ramadan", "Muharram", "Rajab"],

    answer: 1,

    explanation: "Muslims fast during Ramadan.",
  }),

  createQuestion({
    id: generateId("irs", 10),
    year: 2023,

    question: "The Kaaba is located in",

    options: ["Madinah", "Makkah", "Jerusalem", "Cairo"],

    answer: 1,

    explanation: "The Kaaba is in Makkah.",
  }),

  createQuestion({
    id: generateId("irs", 11),
    year: 2020,

    question: "Sawm refers to",

    options: ["Fasting", "Prayer", "Charity", "Pilgrimage"],

    answer: 0,

    explanation: "Sawm means fasting.",
  }),

  createQuestion({
    id: generateId("irs", 12),
    year: 2019,

    question: "The angel that brought revelation to Prophet Muhammad is",

    options: ["Jibril", "Mika'il", "Israfil", "Malik"],

    answer: 0,

    explanation: "Angel Jibril delivered revelation.",
  }),

  createQuestion({
    id: generateId("irs", 13),
    year: 2021,

    question: "Hajj is performed in",

    options: ["Ramadan", "Dhul-Hijjah", "Muharram", "Safar"],

    answer: 1,

    explanation: "Hajj takes place in Dhul-Hijjah.",
  }),

  createQuestion({
    id: generateId("irs", 14),
    year: 2018,

    question: "The last Prophet in Islam is",

    options: ["Musa", "Isa", "Muhammad", "Ibrahim"],

    answer: 2,

    explanation: "Muhammad (SAW) is the final Prophet.",
  }),

  createQuestion({
    id: generateId("irs", 15),
    year: 2022,

    question: "The holy city of Muslims is",

    options: ["Cairo", "Makkah", "Istanbul", "Baghdad"],

    answer: 1,

    explanation: "Makkah is the holiest city in Islam.",
  }),

  createQuestion({
    id: generateId("irs", 16),
    year: 2020,

    question: "The second pillar of Islam is",

    options: ["Salah", "Shahada", "Zakat", "Hajj"],

    answer: 0,

    explanation: "Salah (prayer) is the second pillar.",
  }),

  createQuestion({
    id: generateId("irs", 17),
    year: 2019,

    question: "The Qur'an was revealed over a period of",

    options: ["10 years", "20 years", "23 years", "30 years"],

    answer: 2,

    explanation: "It was revealed over 23 years.",
  }),

  createQuestion({
    id: generateId("irs", 18),
    year: 2021,

    question: "The direction Muslims face during prayer is",

    options: ["East", "West", "Qiblah", "North"],

    answer: 2,

    explanation: "Muslims face the Qiblah (Kaaba).",
  }),

  createQuestion({
    id: generateId("irs", 19),
    year: 2017,

    question: "The Arabic word for God is",

    options: ["Rasul", "Allah", "Imam", "Nabi"],

    answer: 1,

    explanation: "Allah means God in Arabic.",
  }),

  createQuestion({
    id: generateId("irs", 20),
    year: 2023,

    question: "The prophet who built the Kaaba with his son is",

    options: ["Musa", "Ibrahim", "Isa", "Nuh"],

    answer: 1,

    explanation: "Prophet Ibrahim built the Kaaba with Ismail.",
  }),

  createQuestion({
    id: generateId("irs", 21),
    year: 2020,

    question: "The fasting is broken at sunset with",

    options: ["Suhur", "Iftar", "Zakat", "Hajj"],

    answer: 1,

    explanation: "Iftar is the evening meal to break fast.",
  }),

  createQuestion({
    id: generateId("irs", 22),
    year: 2019,

    question: "The angel of death is",

    options: ["Jibril", "Mika'il", "Azra'il", "Israfil"],

    answer: 2,

    explanation: "Azra'il is the angel of death.",
  }),

  createQuestion({
    id: generateId("irs", 23),
    year: 2021,

    question: "The Friday congregational prayer is called",

    options: ["Jumu'ah", "Eid", "Taraweeh", "Hajj"],

    answer: 0,

    explanation: "Jumu'ah is the Friday prayer.",
  }),

  createQuestion({
    id: generateId("irs", 24),
    year: 2018,

    question: "The companions of Prophet Muhammad are called",

    options: ["Imams", "Sahabah", "Prophets", "Caliphs"],

    answer: 1,

    explanation: "Sahabah are the companions of the Prophet.",
  }),

  createQuestion({
    id: generateId("irs", 25),
    year: 2022,

    question: "The first revelation began in",

    options: ["Cave Hira", "Cave Uhud", "Mount Sinai", "Madinah"],

    answer: 0,

    explanation: "Revelation began in Cave Hira.",
  }),

  createQuestion({
    id: generateId("irs", 26),
    year: 2020,

    question: "The fasting ends with the festival of",

    options: ["Eid al-Fitr", "Eid al-Adha", "Mawlid", "Hijrah"],

    answer: 0,

    explanation: "Eid al-Fitr marks the end of Ramadan fasting.",
  }),

  createQuestion({
    id: generateId("irs", 27),
    year: 2019,

    question: "The Qur'an is divided into how many Surahs?",

    options: ["100", "114", "120", "99"],

    answer: 1,

    explanation: "The Qur'an has 114 Surahs.",
  }),

  createQuestion({
    id: generateId("irs", 28),
    year: 2021,

    question: "The father of Prophet Muhammad (SAW) was",

    options: ["Abdullah", "Abu Talib", "Hamza", "Abbas"],

    answer: 0,

    explanation: "His father was Abdullah.",
  }),

  createQuestion({
    id: generateId("irs", 29),
    year: 2017,

    question: "The angel who will blow the trumpet is",

    options: ["Jibril", "Mika'il", "Israfil", "Malik"],

    answer: 2,

    explanation: "Israfil will blow the trumpet.",
  }),

  createQuestion({
    id: generateId("irs", 30),
    year: 2023,

    question: "The Islamic calendar begins with",

    options: ["Ramadan", "Hijrah", "Hajj", "Eid"],

    answer: 1,

    explanation: "It begins from the Hijrah event.",
  }),

  createQuestion({
    id: generateId("irs", 31),
    year: 2020,

    question: "The Prophet who was swallowed by a fish is",

    options: ["Musa", "Yunus", "Isa", "Ibrahim"],

    answer: 1,

    explanation: "Prophet Yunus (Jonah) was swallowed by a fish.",
  }),

  createQuestion({
    id: generateId("irs", 32),
    year: 2019,

    question: "The battle fought by Muslims at Badr was against",

    options: ["Romans", "Quraysh", "Persians", "Abysinnians"],

    answer: 1,

    explanation: "The Battle of Badr was against the Quraysh.",
  }),

  createQuestion({
    id: generateId("irs", 33),
    year: 2021,

    question: "The father of mankind in Islam is",

    options: ["Adam", "Nuh", "Ibrahim", "Musa"],

    answer: 0,

    explanation: "Prophet Adam is the first man and father of mankind.",
  }),

  createQuestion({
    id: generateId("irs", 34),
    year: 2018,

    question: "The night journey of the Prophet is called",

    options: ["Hijrah", "Isra and Mi'raj", "Hajj", "Jihad"],

    answer: 1,

    explanation: "Isra and Mi'raj is the night journey and ascension.",
  }),

  createQuestion({
    id: generateId("irs", 35),
    year: 2022,

    question: "The Qur'an is written in",

    options: ["English", "Arabic", "Urdu", "French"],

    answer: 1,

    explanation: "The Qur'an was revealed in Arabic.",
  }),

  createQuestion({
    id: generateId("irs", 36),
    year: 2020,

    question: "The fasting period in Ramadan is from dawn to",

    options: ["Midnight", "Sunrise", "Sunset", "Noon"],

    answer: 2,

    explanation: "Muslims fast from dawn to sunset.",
  }),

  createQuestion({
    id: generateId("irs", 37),
    year: 2019,

    question: "The Prophet known as the friend of Allah is",

    options: ["Musa", "Ibrahim", "Isa", "Yunus"],

    answer: 1,

    explanation: "Prophet Ibrahim is called Khalilullah (friend of Allah).",
  }),

  createQuestion({
    id: generateId("irs", 38),
    year: 2021,

    question: "The Qur'an was revealed to Prophet Muhammad through",

    options: ["Dreams", "Angel Jibril", "Other prophets", "Books"],

    answer: 1,

    explanation: "Angel Jibril delivered the revelation.",
  }),

  createQuestion({
    id: generateId("irs", 39),
    year: 2017,

    question: "The Islamic greeting is",

    options: ["Shalom", "Salam Alaikum", "Hello", "Namaste"],

    answer: 1,

    explanation: "Muslims greet with 'Assalamu Alaikum'.",
  }),

  createQuestion({
    id: generateId("irs", 40),
    year: 2023,

    question: "The Prophet who split the sea by Allah’s command is",

    options: ["Ibrahim", "Musa", "Isa", "Yunus"],

    answer: 1,

    explanation: "Prophet Musa led the splitting of the Red Sea.",
  }),

  createQuestion({
    id: generateId("irs", 41),
    year: 2020,

    question: "The third pillar of Islam is",

    options: ["Salah", "Zakat", "Sawm", "Hajj"],

    answer: 1,

    explanation: "Zakat is the third pillar of Islam.",
  }),

  createQuestion({
    id: generateId("irs", 42),
    year: 2019,

    question: "The book given to Prophet Musa is",

    options: ["Injil", "Taurat", "Zabur", "Qur'an"],

    answer: 1,

    explanation: "Taurat (Torah) was revealed to Musa.",
  }),

  createQuestion({
    id: generateId("irs", 43),
    year: 2021,

    question: "The Prophet Isa is known as",

    options: ["Jesus Christ", "John the Baptist", "Moses", "David"],

    answer: 0,

    explanation: "Isa is Jesus in Islam.",
  }),

  createQuestion({
    id: generateId("irs", 44),
    year: 2018,

    question: "The battle of Uhud was fought in",

    options: ["Makkah", "Madinah", "Taif", "Jerusalem"],

    answer: 1,

    explanation: "Battle of Uhud took place near Madinah.",
  }),

  createQuestion({
    id: generateId("irs", 45),
    year: 2022,

    question: "The Qur'an consists of",

    options: ["Books", "Surahs", "Chapters only", "Parables only"],

    answer: 1,

    explanation: "The Qur'an is divided into Surahs.",
  }),

  createQuestion({
    id: generateId("irs", 46),
    year: 2020,

    question: "The prophet who built the Ark is",

    options: ["Nuh", "Ibrahim", "Musa", "Isa"],

    answer: 0,

    explanation: "Prophet Nuh built the Ark.",
  }),

  createQuestion({
    id: generateId("irs", 47),
    year: 2019,

    question: "The last sermon of Prophet Muhammad was delivered at",

    options: ["Mount Uhud", "Arafat", "Cave Hira", "Madinah"],

    answer: 1,

    explanation: "The Farewell Sermon was at Mount Arafat.",
  }),

  createQuestion({
    id: generateId("irs", 48),
    year: 2021,

    question: "The Islamic fasting month is",

    options: ["Shawwal", "Ramadan", "Dhul-Hijjah", "Safar"],

    answer: 1,

    explanation: "Ramadan is the fasting month.",
  }),

  createQuestion({
    id: generateId("irs", 49),
    year: 2017,

    question: "The Prophet who built the Kaaba was assisted by",

    options: ["Ismail", "Isa", "Yusuf", "Yunus"],

    answer: 0,

    explanation: "Ibrahim built the Kaaba with Ismail.",
  }),

  createQuestion({
    id: generateId("irs", 50),
    year: 2023,

    question: "The Qur'an is primarily a book of",

    options: ["History only", "Guidance", "Science only", "Poetry only"],

    answer: 1,

    explanation: "The Qur'an serves as guidance for mankind.",
  }),

  createQuestion({
    id: generateId("irs", 51),
    year: 2020,

    question: "The angel responsible for rain is",

    options: ["Jibril", "Mika'il", "Israfil", "Azra'il"],

    answer: 1,

    explanation: "Mika'il is responsible for provision and rain.",
  }),

  createQuestion({
    id: generateId("irs", 52),
    year: 2019,

    question: "The Qur'an was revealed in",

    options: ["One day", "Stages", "One year", "One month only"],

    answer: 1,

    explanation: "It was revealed gradually over 23 years.",
  }),

  createQuestion({
    id: generateId("irs", 53),
    year: 2021,

    question: "The Islamic pilgrimage is called",

    options: ["Sawm", "Hajj", "Salah", "Zakat"],

    answer: 1,

    explanation: "Hajj is the pilgrimage to Makkah.",
  }),

  createQuestion({
    id: generateId("irs", 54),
    year: 2018,

    question: "The Prophet who was saved from fire is",

    options: ["Ibrahim", "Musa", "Isa", "Yunus"],

    answer: 0,

    explanation: "Prophet Ibrahim was saved from fire.",
  }),

  createQuestion({
    id: generateId("irs", 55),
    year: 2022,

    question: "The Qur'an was revealed during",

    options: ["Peace only", "War only", "Both peace and hardship", "No events"],

    answer: 2,

    explanation: "Revelation came in different situations.",
  }),

  createQuestion({
    id: generateId("irs", 56),
    year: 2020,

    question: "The Prophet who spoke in the cradle was",

    options: ["Isa", "Musa", "Yunus", "Ibrahim"],

    answer: 0,

    explanation: "Prophet Isa spoke as a baby.",
  }),

  createQuestion({
    id: generateId("irs", 57),
    year: 2019,

    question: "The Qur'an is divided into how many Juz?",

    options: ["20", "25", "30", "40"],

    answer: 2,

    explanation: "The Qur'an has 30 Juz.",
  }),

  createQuestion({
    id: generateId("irs", 58),
    year: 2021,

    question: "The first pillar of Islam begins with",

    options: ["Salat", "Shahada", "Zakat", "Hajj"],

    answer: 1,

    explanation: "Shahada is the declaration of faith.",
  }),

  createQuestion({
    id: generateId("irs", 59),
    year: 2017,

    question: "The Prophet known for patience is",

    options: ["Ayyub", "Musa", "Isa", "Ibrahim"],

    answer: 0,

    explanation: "Prophet Ayyub is known for patience.",
  }),

  createQuestion({
    id: generateId("irs", 60),
    year: 2023,

    question: "The Qur'an teaches that Allah is",

    options: ["One", "Many", "Two", "Three"],

    answer: 0,

    explanation: "Islam emphasizes the oneness of Allah.",
  }),

  createQuestion({
    id: generateId("irs", 61),
    year: 2020,

    question: "The Prophet who was thrown into a well was",

    options: ["Yusuf", "Musa", "Isa", "Nuh"],

    answer: 0,

    explanation: "Prophet Yusuf was thrown into a well by his brothers.",
  }),

  createQuestion({
    id: generateId("irs", 62),
    year: 2019,

    question: "The Qur'an was revealed to guide",

    options: ["Only Arabs", "All mankind", "Only prophets", "Only kings"],

    answer: 1,

    explanation: "The Qur'an is guidance for all mankind.",
  }),

  createQuestion({
    id: generateId("irs", 63),
    year: 2021,

    question: "The Prophet who built a ship is",

    options: ["Nuh", "Musa", "Ibrahim", "Isa"],

    answer: 0,

    explanation: "Prophet Nuh built the Ark.",
  }),

  createQuestion({
    id: generateId("irs", 64),
    year: 2018,

    question: "The Qur'an teaches that prayer is",

    options: ["Optional", "Compulsory", "Forbidden", "Rare"],

    answer: 1,

    explanation: "Salah is compulsory in Islam.",
  }),

  createQuestion({
    id: generateId("irs", 65),
    year: 2022,

    question: "The Prophet who was taken up to heaven is",

    options: ["Musa", "Isa", "Ibrahim", "Yunus"],

    answer: 1,

    explanation: "Prophet Isa was raised to Allah.",
  }),

  createQuestion({
    id: generateId("irs", 66),
    year: 2020,

    question: "The Qur'an teaches that believers should",

    options: ["Lie", "Be honest", "Steal", "Fight unjustly"],

    answer: 1,

    explanation: "Honesty is strongly encouraged in Islam.",
  }),

  createQuestion({
    id: generateId("irs", 67),
    year: 2019,

    question: "The Prophet who spoke to Allah directly was",

    options: ["Musa", "Isa", "Ibrahim", "Yunus"],

    answer: 0,

    explanation: "Prophet Musa spoke to Allah.",
  }),

  createQuestion({
    id: generateId("irs", 68),
    year: 2021,

    question: "The Qur'an teaches that charity is",

    options: ["Zakat", "Salah", "Hajj", "Sawm"],

    answer: 0,

    explanation: "Zakat is obligatory charity.",
  }),

  createQuestion({
    id: generateId("irs", 69),
    year: 2018,

    question: "The Prophet who was saved from the sea is",

    options: ["Musa", "Isa", "Ibrahim", "Yunus"],

    answer: 0,

    explanation: "Musa was saved when Allah parted the sea.",
  }),

  createQuestion({
    id: generateId("irs", 70),
    year: 2022,

    question: "The Qur'an teaches that fasting is",

    options: ["Optional", "Compulsory", "Forbidden", "Rare"],

    answer: 1,

    explanation: "Fasting in Ramadan is compulsory.",
  }),

  createQuestion({
    id: generateId("irs", 71),
    year: 2020,

    question: "The Prophet who is called 'Friend of Allah' is",

    options: ["Ibrahim", "Musa", "Isa", "Yunus"],

    answer: 0,

    explanation: "Ibrahim is Khalilullah.",
  }),

  createQuestion({
    id: generateId("irs", 72),
    year: 2019,

    question: "The Qur'an was revealed to Prophet Muhammad in",

    options: ["Madinah", "Makkah and Madinah", "Only Makkah", "Only Taif"],

    answer: 1,

    explanation: "Revelation occurred in both Makkah and Madinah.",
  }),

  createQuestion({
    id: generateId("irs", 73),
    year: 2021,

    question: "The Prophet who was born without a father is",

    options: ["Isa", "Musa", "Ibrahim", "Yunus"],

    answer: 0,

    explanation: "Prophet Isa was born miraculously.",
  }),

  createQuestion({
    id: generateId("irs", 74),
    year: 2018,

    question: "The Qur'an teaches that Allah is",

    options: ["Merciful", "Weak", "Limited", "Human"],

    answer: 0,

    explanation: "Allah is Most Merciful.",
  }),

  createQuestion({
    id: generateId("irs", 75),
    year: 2022,

    question: "The Prophet who was swallowed by a whale is",

    options: ["Yunus", "Musa", "Isa", "Ibrahim"],

    answer: 0,

    explanation: "Prophet Yunus was swallowed by a fish.",
  }),

  createQuestion({
    id: generateId("irs", 76),
    year: 2020,

    question: "The Qur'an teaches that Muslims should",

    options: [
      "Pray only sometimes",
      "Pray regularly",
      "Never pray",
      "Pray once a year",
    ],

    answer: 1,

    explanation: "Muslims are required to pray regularly.",
  }),

  createQuestion({
    id: generateId("irs", 77),
    year: 2019,

    question: "The Prophet who was saved from Pharaoh is",

    options: ["Musa", "Isa", "Ibrahim", "Yunus"],

    answer: 0,

    explanation: "Musa was saved from Pharaoh.",
  }),

  createQuestion({
    id: generateId("irs", 78),
    year: 2021,

    question: "The Qur'an teaches that belief in Allah is",

    options: ["Optional", "Fundamental", "Unnecessary", "Rare"],

    answer: 1,

    explanation: "Faith in Allah is fundamental in Islam.",
  }),

  createQuestion({
    id: generateId("irs", 79),
    year: 2018,

    question: "The Prophet who built the Kaaba is",

    options: ["Ibrahim", "Musa", "Isa", "Yunus"],

    answer: 0,

    explanation: "Ibrahim built the Kaaba with Ismail.",
  }),

  createQuestion({
    id: generateId("irs", 80),
    year: 2023,

    question: "The Qur'an teaches that Allah is the",

    options: ["Creator", "Destroyer only", "Human", "Angel"],

    answer: 0,

    explanation: "Allah is the Creator of everything.",
  }),
];

/* =========================================================
QUESTION BANK EXPORT
========================================================= */
const geography = [
  createQuestion({
    id: generateId("geography", 1),
    year: 2020,

    question: "The study of the earth and its features is called",

    options: ["Geology", "Geography", "Ecology", "Cartography"],

    answer: 1,

    explanation:
      "Geography is the study of the earth, people, and environment.",
  }),

  createQuestion({
    id: generateId("geography", 2),
    year: 2019,

    question:
      "The imaginary line that divides the earth into two equal halves is",

    options: [
      "Prime Meridian",
      "Equator",
      "Tropic of Cancer",
      "International Date Line",
    ],

    answer: 1,

    explanation:
      "The Equator divides the earth into Northern and Southern Hemispheres.",
  }),

  createQuestion({
    id: generateId("geography", 3),
    year: 2021,

    question: "Lines of latitude are also known as",

    options: ["Meridians", "Parallels", "Contours", "Grids"],

    answer: 1,

    explanation: "Latitudes are parallel lines running east-west.",
  }),

  createQuestion({
    id: generateId("geography", 4),
    year: 2018,

    question: "The instrument used to measure rainfall is",

    options: ["Barometer", "Rain gauge", "Thermometer", "Seismograph"],

    answer: 1,

    explanation: "A rain gauge measures the amount of rainfall.",
  }),

  createQuestion({
    id: generateId("geography", 5),
    year: 2022,

    question: "The largest continent in the world is",

    options: ["Africa", "Asia", "Europe", "Australia"],

    answer: 1,

    explanation: "Asia is the largest continent by land area.",
  }),

  createQuestion({
    id: generateId("geography", 6),
    year: 2020,

    question: "The longest river in the world is",

    options: ["Amazon", "Nile", "Mississippi", "Yangtze"],

    answer: 1,

    explanation: "The Nile is traditionally regarded as the longest river.",
  }),

  createQuestion({
    id: generateId("geography", 7),
    year: 2019,

    question: "The imaginary line passing through Greenwich is called",

    options: [
      "Equator",
      "Prime Meridian",
      "International Date Line",
      "Tropic of Capricorn",
    ],

    answer: 1,

    explanation: "The Prime Meridian is at 0° longitude.",
  }),

  createQuestion({
    id: generateId("geography", 8),
    year: 2021,

    question: "The study of weather conditions is called",

    options: ["Climatology", "Meteorology", "Geology", "Hydrology"],

    answer: 1,

    explanation: "Meteorology deals with weather and atmospheric conditions.",
  }),

  createQuestion({
    id: generateId("geography", 9),
    year: 2017,

    question: "The layer of the earth we live on is the",

    options: ["Core", "Mantle", "Crust", "Outer core"],

    answer: 2,

    explanation: "The crust is the outermost layer of the earth.",
  }),

  createQuestion({
    id: generateId("geography", 10),
    year: 2023,

    question: "The process of wearing away of rocks is called",

    options: ["Deposition", "Erosion", "Condensation", "Evaporation"],

    answer: 1,

    explanation: "Erosion is the removal of soil and rock.",
  }),

  createQuestion({
    id: generateId("geography", 11),
    year: 2020,

    question: "The capital of Nigeria is",

    options: ["Lagos", "Abuja", "Kano", "Ibadan"],

    answer: 1,

    explanation: "Abuja is the capital of Nigeria.",
  }),

  createQuestion({
    id: generateId("geography", 12),
    year: 2019,

    question: "The largest ocean in the world is",

    options: [
      "Atlantic Ocean",
      "Indian Ocean",
      "Pacific Ocean",
      "Arctic Ocean",
    ],

    answer: 2,

    explanation: "The Pacific Ocean is the largest ocean.",
  }),

  createQuestion({
    id: generateId("geography", 13),
    year: 2021,

    question: "The instrument used to measure temperature is",

    options: ["Barometer", "Thermometer", "Anemometer", "Hygrometer"],

    answer: 1,

    explanation: "A thermometer measures temperature.",
  }),

  createQuestion({
    id: generateId("geography", 14),
    year: 2018,

    question: "The wind vane is used to measure",

    options: ["Wind speed", "Wind direction", "Rainfall", "Temperature"],

    answer: 1,

    explanation: "A wind vane shows wind direction.",
  }),

  createQuestion({
    id: generateId("geography", 15),
    year: 2022,

    question: "The capital of France is",

    options: ["Berlin", "Madrid", "Paris", "Rome"],

    answer: 2,

    explanation: "Paris is the capital of France.",
  }),

  createQuestion({
    id: generateId("geography", 16),
    year: 2020,

    question: "The process by which water changes into vapour is",

    options: ["Condensation", "Evaporation", "Precipitation", "Transpiration"],

    answer: 1,

    explanation: "Evaporation is water turning into vapour.",
  }),

  createQuestion({
    id: generateId("geography", 17),
    year: 2019,

    question: "The study of maps is called",

    options: ["Cartography", "Geology", "Meteorology", "Ecology"],

    answer: 0,

    explanation: "Cartography is map-making.",
  }),

  createQuestion({
    id: generateId("geography", 18),
    year: 2021,

    question: "The equator is measured in",

    options: ["Degrees latitude", "Degrees longitude", "Meters", "Kilometers"],

    answer: 0,

    explanation: "Latitude is measured in degrees.",
  }),

  createQuestion({
    id: generateId("geography", 19),
    year: 2017,

    question: "The hottest continent in the world is",

    options: ["Asia", "Africa", "Europe", "Antarctica"],

    answer: 1,

    explanation: "Africa is the hottest continent.",
  }),

  createQuestion({
    id: generateId("geography", 20),
    year: 2023,

    question: "The coldest continent is",

    options: ["Europe", "Antarctica", "Asia", "Africa"],

    answer: 1,

    explanation: "Antarctica is the coldest continent.",
  }),

  createQuestion({
    id: generateId("geography", 21),
    year: 2020,

    question: "A map scale is used to show",

    options: ["Time", "Distance", "Population", "Weather"],

    answer: 1,

    explanation: "Scale shows distance on maps.",
  }),

  createQuestion({
    id: generateId("geography", 22),
    year: 2019,

    question: "The movement of the earth around the sun is called",

    options: ["Rotation", "Revolution", "Erosion", "Condensation"],

    answer: 1,

    explanation: "Revolution is the earth orbiting the sun.",
  }),

  createQuestion({
    id: generateId("geography", 23),
    year: 2021,

    question: "The movement of the earth on its axis is called",

    options: ["Revolution", "Rotation", "Erosion", "Deposition"],

    answer: 1,

    explanation: "Rotation causes day and night.",
  }),

  createQuestion({
    id: generateId("geography", 24),
    year: 2018,

    question: "The main gas in the atmosphere is",

    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],

    answer: 2,

    explanation: "Nitrogen makes up most of the atmosphere.",
  }),

  createQuestion({
    id: generateId("geography", 25),
    year: 2022,

    question: "The instrument for measuring air pressure is",

    options: ["Barometer", "Thermometer", "Rain gauge", "Wind vane"],

    answer: 0,

    explanation: "A barometer measures air pressure.",
  }),

  createQuestion({
    id: generateId("geography", 26),
    year: 2020,

    question: "The tropical rainforest is found near the",

    options: ["Poles", "Equator", "Deserts", "Mountains"],

    answer: 1,

    explanation: "Rainforests are near the equator.",
  }),

  createQuestion({
    id: generateId("geography", 27),
    year: 2019,

    question: "The Sahara is an example of a",

    options: ["Forest", "Desert", "River", "Lake"],

    answer: 1,

    explanation: "Sahara is the largest hot desert.",
  }),

  createQuestion({
    id: generateId("geography", 28),
    year: 2021,

    question: "The capital of Ghana is",

    options: ["Accra", "Lagos", "Abuja", "Kumasi"],

    answer: 0,

    explanation: "Accra is the capital of Ghana.",
  }),

  createQuestion({
    id: generateId("geography", 29),
    year: 2017,

    question: "The earth rotates from",

    options: [
      "West to East",
      "East to West",
      "North to South",
      "South to North",
    ],

    answer: 0,

    explanation: "Earth rotates west to east.",
  }),

  createQuestion({
    id: generateId("geography", 30),
    year: 2023,

    question: "The imaginary line that divides day and night is",

    options: ["Equator", "Terminator", "Prime Meridian", "Latitude"],

    answer: 1,

    explanation: "The terminator line divides day and night.",
  }),
  createQuestion({
    id: generateId("geography", 31),
    year: 2020,

    question: "The instrument used to measure wind speed is",

    options: ["Wind vane", "Anemometer", "Barometer", "Thermometer"],

    answer: 1,

    explanation: "An anemometer measures wind speed.",
  }),

  createQuestion({
    id: generateId("geography", 32),
    year: 2019,

    question: "The process by which water vapor turns into liquid is",

    options: ["Evaporation", "Condensation", "Precipitation", "Transpiration"],

    answer: 1,

    explanation: "Condensation is gas turning into liquid.",
  }),

  createQuestion({
    id: generateId("geography", 33),
    year: 2021,

    question: "The largest desert in the world is",

    options: ["Sahara", "Gobi", "Kalahari", "Antarctic Desert"],

    answer: 3,

    explanation: "The Antarctic Desert is the largest desert.",
  }),

  createQuestion({
    id: generateId("geography", 34),
    year: 2018,

    question: "The capital of the United Kingdom is",

    options: ["Paris", "London", "Berlin", "Rome"],

    answer: 1,

    explanation: "London is the capital of the UK.",
  }),

  createQuestion({
    id: generateId("geography", 35),
    year: 2022,

    question: "The layer of gases surrounding the earth is called",

    options: ["Lithosphere", "Hydrosphere", "Atmosphere", "Biosphere"],

    answer: 2,

    explanation: "The atmosphere surrounds the earth.",
  }),

  createQuestion({
    id: generateId("geography", 36),
    year: 2020,

    question: "The main source of energy for the earth is",

    options: ["Moon", "Sun", "Wind", "Water"],

    answer: 1,

    explanation: "The sun is the primary energy source.",
  }),

  createQuestion({
    id: generateId("geography", 37),
    year: 2019,

    question: "A map that shows physical features is called",

    options: ["Political map", "Physical map", "Road map", "Climate map"],

    answer: 1,

    explanation: "Physical maps show landforms and features.",
  }),

  createQuestion({
    id: generateId("geography", 38),
    year: 2021,

    question: "The capital of Kenya is",

    options: ["Nairobi", "Kampala", "Accra", "Addis Ababa"],

    answer: 0,

    explanation: "Nairobi is the capital of Kenya.",
  }),

  createQuestion({
    id: generateId("geography", 39),
    year: 2017,

    question: "The process of planting trees to restore forests is called",

    options: ["Deforestation", "Afforestation", "Erosion", "Revolution"],

    answer: 1,

    explanation: "Afforestation means planting new forests.",
  }),

  createQuestion({
    id: generateId("geography", 40),
    year: 2023,

    question: "The longest river in Africa is",

    options: ["Niger", "Congo", "Nile", "Zambezi"],

    answer: 2,

    explanation: "The Nile is the longest river in Africa.",
  }),

  createQuestion({
    id: generateId("geography", 41),
    year: 2020,

    question: "The capital of South Africa (administrative) is",

    options: ["Cape Town", "Johannesburg", "Pretoria", "Durban"],

    answer: 2,

    explanation: "Pretoria is the administrative capital.",
  }),

  createQuestion({
    id: generateId("geography", 42),
    year: 2019,

    question: "The process of breaking down rocks without movement is",

    options: ["Erosion", "Weathering", "Deposition", "Sedimentation"],

    answer: 1,

    explanation: "Weathering breaks rocks in place.",
  }),

  createQuestion({
    id: generateId("geography", 43),
    year: 2021,

    question: "The ocean between Africa and America is",

    options: [
      "Pacific Ocean",
      "Indian Ocean",
      "Atlantic Ocean",
      "Arctic Ocean",
    ],

    answer: 2,

    explanation: "The Atlantic lies between Africa and America.",
  }),

  createQuestion({
    id: generateId("geography", 44),
    year: 2018,

    question: "The highest mountain in Africa is",

    options: [
      "Mount Kenya",
      "Mount Kilimanjaro",
      "Mount Elgon",
      "Mount Rwenzori",
    ],

    answer: 1,

    explanation: "Kilimanjaro is the highest in Africa.",
  }),

  createQuestion({
    id: generateId("geography", 45),
    year: 2022,

    question: "The capital of Egypt is",

    options: ["Cairo", "Alexandria", "Tripoli", "Khartoum"],

    answer: 0,

    explanation: "Cairo is the capital of Egypt.",
  }),

  createQuestion({
    id: generateId("geography", 46),
    year: 2020,

    question: "The process of soil removal by wind or water is",

    options: ["Deposition", "Erosion", "Weathering", "Condensation"],

    answer: 1,

    explanation: "Erosion removes soil by natural forces.",
  }),

  createQuestion({
    id: generateId("geography", 47),
    year: 2019,

    question: "The capital of Italy is",

    options: ["Madrid", "Rome", "Paris", "Athens"],

    answer: 1,

    explanation: "Rome is the capital of Italy.",
  }),

  createQuestion({
    id: generateId("geography", 48),
    year: 2021,

    question: "The equator has a latitude of",

    options: ["0°", "90°", "45°", "180°"],

    answer: 0,

    explanation: "The equator is 0° latitude.",
  }),

  createQuestion({
    id: generateId("geography", 49),
    year: 2017,

    question: "The capital of USA is",

    options: ["New York", "Washington D.C.", "Los Angeles", "Chicago"],

    answer: 1,

    explanation: "Washington D.C. is the capital of USA.",
  }),

  createQuestion({
    id: generateId("geography", 50),
    year: 2023,

    question: "The movement of water from land to atmosphere is called",

    options: ["Water cycle", "Erosion cycle", "Rock cycle", "Soil cycle"],

    answer: 0,

    explanation: "The water cycle describes water movement.",
  }),

  createQuestion({
    id: generateId("geography", 51),
    year: 2020,

    question: "The capital of Russia is",

    options: ["Moscow", "Paris", "Berlin", "Madrid"],

    answer: 0,

    explanation: "Moscow is the capital of Russia.",
  }),

  createQuestion({
    id: generateId("geography", 52),
    year: 2019,

    question: "The study of population is called",

    options: ["Demography", "Cartography", "Geology", "Meteorology"],

    answer: 0,

    explanation: "Demography studies population.",
  }),

  createQuestion({
    id: generateId("geography", 53),
    year: 2021,

    question: "The largest country in Africa by land area is",

    options: ["Nigeria", "Algeria", "Sudan", "Egypt"],

    answer: 1,

    explanation: "Algeria is the largest in Africa.",
  }),

  createQuestion({
    id: generateId("geography", 54),
    year: 2018,

    question: "The capital of Spain is",

    options: ["Rome", "Madrid", "Lisbon", "Paris"],

    answer: 1,

    explanation: "Madrid is the capital of Spain.",
  }),

  createQuestion({
    id: generateId("geography", 55),
    year: 2022,

    question: "The movement of molten rocks inside the earth is called",

    options: ["Erosion", "Convection current", "Condensation", "Precipitation"],

    answer: 1,

    explanation: "Convection currents drive movement in the mantle.",
  }),

  createQuestion({
    id: generateId("geography", 56),
    year: 2020,

    question: "The capital of Brazil is",

    options: ["Rio de Janeiro", "Brasília", "Sao Paulo", "Lima"],

    answer: 1,

    explanation: "Brasília is the capital of Brazil.",
  }),

  createQuestion({
    id: generateId("geography", 57),
    year: 2019,

    question: "The natural harbor in Nigeria is located at",

    options: ["Lagos", "Kano", "Jos", "Abuja"],

    answer: 0,

    explanation: "Lagos has a natural harbor.",
  }),

  createQuestion({
    id: generateId("geography", 58),
    year: 2021,

    question: "The capital of India is",

    options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"],

    answer: 1,

    explanation: "New Delhi is the capital of India.",
  }),

  createQuestion({
    id: generateId("geography", 59),
    year: 2017,

    question: "The largest island in the world is",

    options: ["Greenland", "Madagascar", "Australia", "Borneo"],

    answer: 0,

    explanation: "Greenland is the largest island.",
  }),

  createQuestion({
    id: generateId("geography", 60),
    year: 2023,

    question: "The capital of Germany is",

    options: ["Berlin", "Munich", "Frankfurt", "Hamburg"],

    answer: 0,

    explanation: "Berlin is the capital of Germany.",
  }),

  createQuestion({
    id: generateId("geography", 61),
    year: 2020,

    question: "The study of rocks is called",

    options: ["Pedology", "Geology", "Meteorology", "Ecology"],

    answer: 1,

    explanation: "Geology is the study of rocks.",
  }),

  createQuestion({
    id: generateId("geography", 62),
    year: 2019,

    question: "The capital of China is",

    options: ["Shanghai", "Beijing", "Hong Kong", "Tokyo"],

    answer: 1,

    explanation: "Beijing is the capital of China.",
  }),

  createQuestion({
    id: generateId("geography", 63),
    year: 2021,

    question: "The main source of river water is",

    options: ["Rain", "Sea", "Ocean", "Lake only"],

    answer: 0,

    explanation: "Rainfall feeds rivers.",
  }),

  createQuestion({
    id: generateId("geography", 64),
    year: 2018,

    question: "The capital of Australia is",

    options: ["Sydney", "Canberra", "Melbourne", "Perth"],

    answer: 1,

    explanation: "Canberra is the capital of Australia.",
  }),

  createQuestion({
    id: generateId("geography", 65),
    year: 2022,

    question: "The process of water soaking into the ground is",

    options: ["Infiltration", "Evaporation", "Condensation", "Precipitation"],

    answer: 0,

    explanation: "Infiltration is water entering soil.",
  }),

  createQuestion({
    id: generateId("geography", 66),
    year: 2020,

    question: "The capital of Turkey is",

    options: ["Istanbul", "Ankara", "Izmir", "Bursa"],

    answer: 1,

    explanation: "Ankara is the capital of Turkey.",
  }),

  createQuestion({
    id: generateId("geography", 67),
    year: 2019,

    question: "The highest plateau in Africa is",

    options: [
      "Jos Plateau",
      "Tibesti Plateau",
      "Ethiopian Plateau",
      "Adamawa Plateau",
    ],

    answer: 2,

    explanation: "The Ethiopian Plateau is the highest in Africa.",
  }),

  createQuestion({
    id: generateId("geography", 68),
    year: 2021,

    question: "The capital of Argentina is",

    options: ["Buenos Aires", "Lima", "Santiago", "Bogota"],

    answer: 0,

    explanation: "Buenos Aires is the capital of Argentina.",
  }),

  createQuestion({
    id: generateId("geography", 69),
    year: 2018,

    question: "The major export of Nigeria is",

    options: ["Gold", "Oil", "Coffee", "Wheat"],

    answer: 1,

    explanation: "Crude oil is Nigeria’s major export.",
  }),

  createQuestion({
    id: generateId("geography", 70),
    year: 2022,

    question: "The capital of Saudi Arabia is",

    options: ["Mecca", "Riyadh", "Jeddah", "Medina"],

    answer: 1,

    explanation: "Riyadh is the capital of Saudi Arabia.",
  }),

  createQuestion({
    id: generateId("geography", 71),
    year: 2020,

    question: "The study of climates is called",

    options: ["Meteorology", "Climatology", "Geology", "Hydrology"],

    answer: 1,

    explanation: "Climatology studies long-term weather patterns.",
  }),

  createQuestion({
    id: generateId("geography", 72),
    year: 2019,

    question: "The capital of Indonesia is",

    options: ["Jakarta", "Bali", "Bandung", "Surabaya"],

    answer: 0,

    explanation: "Jakarta is the capital of Indonesia.",
  }),

  createQuestion({
    id: generateId("geography", 73),
    year: 2021,

    question: "The movement of soil particles by water is",

    options: ["Erosion", "Weathering", "Condensation", "Transpiration"],

    answer: 0,

    explanation: "Erosion moves soil particles.",
  }),

  createQuestion({
    id: generateId("geography", 74),
    year: 2018,

    question: "The capital of South Korea is",

    options: ["Busan", "Seoul", "Incheon", "Daegu"],

    answer: 1,

    explanation: "Seoul is the capital of South Korea.",
  }),

  createQuestion({
    id: generateId("geography", 75),
    year: 2022,

    question: "The river that flows through Egypt is",

    options: ["Nile", "Amazon", "Congo", "Niger"],

    answer: 0,

    explanation: "The Nile flows through Egypt.",
  }),

  createQuestion({
    id: generateId("geography", 76),
    year: 2020,

    question: "The capital of Pakistan is",

    options: ["Karachi", "Islamabad", "Lahore", "Peshawar"],

    answer: 1,

    explanation: "Islamabad is the capital of Pakistan.",
  }),

  createQuestion({
    id: generateId("geography", 77),
    year: 2019,

    question: "The smallest continent is",

    options: ["Europe", "Australia", "Asia", "Africa"],

    answer: 1,

    explanation: "Australia is the smallest continent.",
  }),

  createQuestion({
    id: generateId("geography", 78),
    year: 2021,

    question: "The capital of Mexico is",

    options: ["Guadalajara", "Mexico City", "Cancun", "Tijuana"],

    answer: 1,

    explanation: "Mexico City is the capital of Mexico.",
  }),

  createQuestion({
    id: generateId("geography", 79),
    year: 2017,

    question: "The process of breaking rocks into smaller pieces is",

    options: ["Weathering", "Erosion", "Deposition", "Condensation"],

    answer: 0,

    explanation: "Weathering breaks rocks into smaller pieces.",
  }),

  createQuestion({
    id: generateId("geography", 80),
    year: 2023,

    question: "The capital of Iran is",

    options: ["Tehran", "Isfahan", "Shiraz", "Tabriz"],

    answer: 0,

    explanation: "Tehran is the capital of Iran.",
  }),
];

/* =========================================================
HISTORY
========================================================= */
const history = [
  createQuestion({
    id: generateId("history", 1),
    year: 2023,

    question: "The leader of the Sokoto Jihad was",

    options: [
      "Usman dan Fodio",
      "Ahmadu Bello",
      "Muhammadu Ribadu",
      "Sultan Bello",
    ],

    answer: 0,

    explanation:
      "Usman dan Fodio led the Sokoto Jihad in the early 19th century.",
  }),

  createQuestion({
    id: generateId("history", 2),
    year: 2022,

    question: "The amalgamation of Northern and Southern Nigeria took place in",

    options: ["1900", "1914", "1922", "1960"],

    answer: 1,

    explanation:
      "Lord Lugard amalgamated Northern and Southern Nigeria in 1914.",
  }),

  createQuestion({
    id: generateId("history", 3),
    year: 2021,

    question: "Who was the first Governor-General of independent Nigeria?",

    options: [
      "Nnamdi Azikiwe",
      "Tafawa Balewa",
      "Obafemi Awolowo",
      "Ahmadu Bello",
    ],

    answer: 0,

    explanation:
      "Dr. Nnamdi Azikiwe became the first Governor-General in 1960.",
  }),

  createQuestion({
    id: generateId("history", 4),
    year: 2020,

    question: "The Berlin Conference of 1884–1885 was convened to",

    options: [
      "End slavery",
      "Promote trade",
      "Partition Africa",
      "Establish democracy",
    ],

    answer: 2,

    explanation:
      "The Berlin Conference formalized the partition of Africa among European powers.",
  }),

  createQuestion({
    id: generateId("history", 5),
    year: 2023,

    question: "The Aba Women's Riot occurred in",

    options: ["1929", "1914", "1945", "1960"],

    answer: 0,

    explanation:
      "The Aba Women's Riot of 1929 was a protest against colonial taxation policies.",
  }),

  createQuestion({
    id: generateId("history", 6),
    year: 2022,

    question: "The ancient city famous for bronze works in Nigeria was",

    options: ["Kano", "Benin", "Ife", "Nupe"],

    answer: 1,

    explanation: "Benin Kingdom became famous for its bronze artworks.",
  }),

  createQuestion({
    id: generateId("history", 7),
    year: 2021,

    question:
      "Indirect rule was successfully practiced in Northern Nigeria because of",

    options: [
      "Strong traditional institutions",
      "British military power",
      "Religious conflicts",
      "Western education",
    ],

    answer: 0,

    explanation:
      "Northern Nigeria already had organized emirate systems that aided indirect rule.",
  }),

  createQuestion({
    id: generateId("history", 8),
    year: 2020,

    question: "Who founded the Oyo Empire?",

    options: ["Oranmiyan", "Sango", "Oduduwa", "Alaafin Atiba"],

    answer: 0,

    explanation: "Oranmiyan is regarded as the founder of the Oyo Empire.",
  }),

  createQuestion({
    id: generateId("history", 9),
    year: 2023,

    question: "The Nigerian Civil War lasted from",

    options: ["1960–1963", "1966–1969", "1967–1970", "1975–1979"],

    answer: 2,

    explanation: "The Nigerian Civil War was fought between 1967 and 1970.",
  }),

  createQuestion({
    id: generateId("history", 10),
    year: 2022,

    question: "The first military coup in Nigeria occurred in",

    options: ["1960", "1963", "1966", "1975"],

    answer: 2,

    explanation: "Nigeria experienced its first military coup in January 1966.",
  }),
  createQuestion({
    id: generateId("history", 11),
    year: 2021,

    question: "The first Nigerian President was",

    options: [
      "Nnamdi Azikiwe",
      "Yakubu Gowon",
      "Olusegun Obasanjo",
      "Tafawa Balewa",
    ],

    answer: 0,

    explanation: "Dr. Nnamdi Azikiwe became Nigeria’s first President in 1963.",
  }),

  createQuestion({
    id: generateId("history", 12),
    year: 2020,

    question: "The nationalist movement in West Africa mainly aimed at",

    options: [
      "Promoting slavery",
      "Ending colonial rule",
      "Encouraging indirect rule",
      "Expanding trade",
    ],

    answer: 1,

    explanation:
      "Nationalist movements fought to end colonial domination in Africa.",
  }),

  createQuestion({
    id: generateId("history", 13),
    year: 2023,

    question: "The first political party in Nigeria was",

    options: ["NCNC", "NPC", "NNDP", "AG"],

    answer: 2,

    explanation:
      "The Nigerian National Democratic Party (NNDP) was formed in 1923.",
  }),

  createQuestion({
    id: generateId("history", 14),
    year: 2022,

    question: "Who introduced indirect rule in Nigeria?",

    options: [
      "Lord Lugard",
      "Herbert Macaulay",
      "Mungo Park",
      "Nnamdi Azikiwe",
    ],

    answer: 0,

    explanation: "Lord Lugard introduced the indirect rule system in Nigeria.",
  }),

  createQuestion({
    id: generateId("history", 15),
    year: 2021,

    question: "The Kano Chronicle is important because it",

    options: [
      "Explains Nigerian independence",
      "Records the history of Kano",
      "Contains Islamic laws",
      "Discusses slave trade",
    ],

    answer: 1,

    explanation:
      "The Kano Chronicle provides historical accounts of Kano rulers.",
  }),

  createQuestion({
    id: generateId("history", 16),
    year: 2020,

    question: "The capital of the Kanem-Bornu Empire was",

    options: ["Kukawa", "Benin", "Oyo", "Ife"],

    answer: 0,

    explanation:
      "Kukawa served as an important capital of the Kanem-Bornu Empire.",
  }),

  createQuestion({
    id: generateId("history", 17),
    year: 2023,

    question: "The Clifford Constitution was introduced in",

    options: ["1914", "1922", "1946", "1951"],

    answer: 1,

    explanation: "The Clifford Constitution came into effect in 1922.",
  }),

  createQuestion({
    id: generateId("history", 18),
    year: 2022,

    question: "Who was the founder of the NCNC?",

    options: [
      "Herbert Macaulay",
      "Ahmadu Bello",
      "Obafemi Awolowo",
      "Tafawa Balewa",
    ],

    answer: 0,

    explanation: "Herbert Macaulay co-founded the NCNC in 1944.",
  }),

  createQuestion({
    id: generateId("history", 19),
    year: 2021,

    question:
      "The Atlantic slave trade mainly involved the transportation of slaves to",

    options: ["Europe", "Asia", "Americas", "Australia"],

    answer: 2,

    explanation: "African slaves were mainly transported to the Americas.",
  }),

  createQuestion({
    id: generateId("history", 20),
    year: 2020,

    question: "The Nigerian Youth Movement was formed in",

    options: ["1938", "1923", "1945", "1951"],

    answer: 0,

    explanation: "The Nigerian Youth Movement was established in 1938.",
  }),

  createQuestion({
    id: generateId("history", 21),
    year: 2023,

    question: "Who became Head of State after the January 1966 coup?",

    options: [
      "Yakubu Gowon",
      "Aguiyi-Ironsi",
      "Murtala Mohammed",
      "Olusegun Obasanjo",
    ],

    answer: 1,

    explanation:
      "Major General Aguiyi-Ironsi became Head of State after the coup.",
  }),

  createQuestion({
    id: generateId("history", 22),
    year: 2022,

    question: "The Fulani Jihad led to the establishment of the",

    options: ["Benin Empire", "Sokoto Caliphate", "Kanem Empire", "Oyo Empire"],

    answer: 1,

    explanation:
      "The Fulani Jihad resulted in the creation of the Sokoto Caliphate.",
  }),

  createQuestion({
    id: generateId("history", 23),
    year: 2021,

    question: "The Richards Constitution was introduced in",

    options: ["1946", "1951", "1922", "1960"],

    answer: 0,

    explanation: "The Richards Constitution came into operation in 1946.",
  }),

  createQuestion({
    id: generateId("history", 24),
    year: 2020,

    question: "The first newspaper in Nigeria was established by",

    options: [
      "Herbert Macaulay",
      "Henry Townsend",
      "Nnamdi Azikiwe",
      "Obafemi Awolowo",
    ],

    answer: 1,

    explanation:
      "Henry Townsend founded Iwe Irohin, the first newspaper in Nigeria.",
  }),

  createQuestion({
    id: generateId("history", 25),
    year: 2023,

    question: "The main export during the legitimate trade era was",

    options: ["Gold", "Palm oil", "Cocoa", "Cotton"],

    answer: 1,

    explanation:
      "Palm oil became a major export after the abolition of slave trade.",
  }),

  createQuestion({
    id: generateId("history", 26),
    year: 2022,

    question: "The OAU was established in",

    options: ["1960", "1963", "1975", "1981"],

    answer: 1,

    explanation: "The Organization of African Unity was founded in 1963.",
  }),

  createQuestion({
    id: generateId("history", 27),
    year: 2021,

    question: "The first executive president of Nigeria was",

    options: [
      "Shehu Shagari",
      "Nnamdi Azikiwe",
      "Olusegun Obasanjo",
      "Yakubu Gowon",
    ],

    answer: 0,

    explanation:
      "Shehu Shagari became Nigeria’s first executive president in 1979.",
  }),

  createQuestion({
    id: generateId("history", 28),
    year: 2020,

    question: "The trans-Saharan trade connected West Africa with",

    options: [
      "Southern Africa",
      "North Africa",
      "East Africa",
      "Central Africa",
    ],

    answer: 1,

    explanation:
      "The trans-Saharan trade routes linked West Africa to North Africa.",
  }),

  createQuestion({
    id: generateId("history", 29),
    year: 2023,

    question: "The capital of the old Oyo Empire was",

    options: ["Ile-Ife", "Oyo-Ile", "Ibadan", "Abeokuta"],

    answer: 1,

    explanation: "Oyo-Ile was the political capital of the Oyo Empire.",
  }),

  createQuestion({
    id: generateId("history", 30),
    year: 2022,

    question: "The Macpherson Constitution was introduced in",

    options: ["1946", "1951", "1954", "1960"],

    answer: 1,

    explanation: "The Macpherson Constitution came into effect in 1951.",
  }),

  createQuestion({
    id: generateId("history", 31),
    year: 2021,

    question: "Who founded the Action Group political party?",

    options: [
      "Nnamdi Azikiwe",
      "Obafemi Awolowo",
      "Tafawa Balewa",
      "Ahmadu Bello",
    ],

    answer: 1,

    explanation: "Chief Obafemi Awolowo founded the Action Group in 1951.",
  }),

  createQuestion({
    id: generateId("history", 32),
    year: 2020,

    question: "The NCNC means",

    options: [
      "National Congress of Nigerian Citizens",
      "National Council of Nigeria and the Cameroons",
      "Northern Council of Nigeria and Cameroon",
      "National Committee of Nigerian Citizens",
    ],

    answer: 1,

    explanation:
      "NCNC stands for National Council of Nigeria and the Cameroons.",
  }),

  createQuestion({
    id: generateId("history", 33),
    year: 2023,

    question: "The main aim of indirect rule was to",

    options: [
      "Destroy traditional institutions",
      "Rule through traditional rulers",
      "Promote slavery",
      "Encourage nationalism",
    ],

    answer: 1,

    explanation:
      "Indirect rule involved governing through existing traditional authorities.",
  }),

  createQuestion({
    id: generateId("history", 34),
    year: 2022,

    question: "Who was the first Prime Minister of Nigeria?",

    options: [
      "Nnamdi Azikiwe",
      "Tafawa Balewa",
      "Obafemi Awolowo",
      "Yakubu Gowon",
    ],

    answer: 1,

    explanation:
      "Sir Abubakar Tafawa Balewa became Nigeria’s first Prime Minister.",
  }),

  createQuestion({
    id: generateId("history", 35),
    year: 2021,

    question: "The famous walls of Benin were built mainly for",

    options: ["Decoration", "Defense", "Religious worship", "Trade"],

    answer: 1,

    explanation: "The Benin walls were built primarily for defense purposes.",
  }),

  createQuestion({
    id: generateId("history", 36),
    year: 2020,

    question: "The leader of the Mau Mau uprising in Kenya was",

    options: [
      "Jomo Kenyatta",
      "Kwame Nkrumah",
      "Julius Nyerere",
      "Patrice Lumumba",
    ],

    answer: 0,

    explanation:
      "Jomo Kenyatta was associated with the Mau Mau nationalist movement.",
  }),

  createQuestion({
    id: generateId("history", 37),
    year: 2023,

    question: "Which constitution introduced regionalism in Nigeria?",

    options: [
      "Clifford Constitution",
      "Richards Constitution",
      "Macpherson Constitution",
      "Lyttleton Constitution",
    ],

    answer: 1,

    explanation: "The Richards Constitution introduced regionalism in Nigeria.",
  }),

  createQuestion({
    id: generateId("history", 38),
    year: 2022,

    question: "The traditional ruler of the Benin Kingdom is called the",

    options: ["Emir", "Oba", "Alaafin", "Attah"],

    answer: 1,

    explanation: "The ruler of Benin Kingdom is known as the Oba.",
  }),

  createQuestion({
    id: generateId("history", 39),
    year: 2021,

    question: "The Yoruba migrated to Ile-Ife under the leadership of",

    options: ["Oduduwa", "Oranmiyan", "Sango", "Atiba"],

    answer: 0,

    explanation: "Oduduwa is regarded as the progenitor of the Yoruba people.",
  }),

  createQuestion({
    id: generateId("history", 40),
    year: 2020,

    question: "The headquarters of ECOWAS is located in",

    options: ["Lagos", "Accra", "Abuja", "Dakar"],

    answer: 2,

    explanation: "The ECOWAS headquarters is in Abuja, Nigeria.",
  }),

  createQuestion({
    id: generateId("history", 41),
    year: 2023,

    question: "The first republic in Nigeria ended in",

    options: ["1963", "1966", "1970", "1979"],

    answer: 1,

    explanation:
      "Nigeria’s First Republic ended after the military coup of 1966.",
  }),

  createQuestion({
    id: generateId("history", 42),
    year: 2022,

    question: "The leader of the NPC was",

    options: [
      "Ahmadu Bello",
      "Tafawa Balewa",
      "Nnamdi Azikiwe",
      "Obafemi Awolowo",
    ],

    answer: 0,

    explanation:
      "Sir Ahmadu Bello was the leader of the Northern People's Congress.",
  }),

  createQuestion({
    id: generateId("history", 43),
    year: 2021,

    question: "Apartheid policy was practiced in",

    options: ["Kenya", "South Africa", "Nigeria", "Zimbabwe"],

    answer: 1,

    explanation:
      "Apartheid was a system of racial segregation in South Africa.",
  }),

  createQuestion({
    id: generateId("history", 44),
    year: 2020,

    question: "The first military Head of State in Nigeria was",

    options: [
      "Yakubu Gowon",
      "Murtala Mohammed",
      "Aguiyi-Ironsi",
      "Olusegun Obasanjo",
    ],

    answer: 2,

    explanation:
      "Major General Aguiyi-Ironsi became Nigeria’s first military Head of State.",
  }),

  createQuestion({
    id: generateId("history", 45),
    year: 2023,

    question: "The Berlin Conference was chaired by",

    options: ["Otto von Bismarck", "Lord Lugard", "Cecil Rhodes", "Mungo Park"],

    answer: 0,

    explanation: "Otto von Bismarck of Germany chaired the Berlin Conference.",
  }),

  createQuestion({
    id: generateId("history", 46),
    year: 2022,

    question: "Which empire succeeded the Ghana Empire?",

    options: ["Songhai Empire", "Mali Empire", "Kanem Empire", "Benin Empire"],

    answer: 1,

    explanation: "The Mali Empire rose after the decline of the Ghana Empire.",
  }),

  createQuestion({
    id: generateId("history", 47),
    year: 2021,

    question: "The traditional political system of the Igbo was mainly",

    options: ["Centralized", "Feudal", "Segmentary", "Monarchical"],

    answer: 2,

    explanation:
      "The Igbo political system was largely decentralized and segmentary.",
  }),

  createQuestion({
    id: generateId("history", 48),
    year: 2020,

    question: "Who led Ghana to independence?",

    options: ["Jomo Kenyatta", "Kwame Nkrumah", "Nyerere", "Mandela"],

    answer: 1,

    explanation: "Kwame Nkrumah led Ghana to independence in 1957.",
  }),

  createQuestion({
    id: generateId("history", 49),
    year: 2023,

    question: "The title of the ruler of the Kanem-Bornu Empire was",

    options: ["Mai", "Oba", "Emir", "Sultan"],

    answer: 0,

    explanation: "The rulers of Kanem-Bornu were known as Mais.",
  }),

  createQuestion({
    id: generateId("history", 50),
    year: 2022,

    question: "The Nigerian civil war was also known as the",

    options: [
      "Biafran War",
      "Atlantic War",
      "Independence War",
      "Regional War",
    ],

    answer: 0,

    explanation: "The Nigerian Civil War is also called the Biafran War.",
  }),
  createQuestion({
    id: generateId("history", 51),
    year: 2021,

    question: "The Lyttleton Constitution was introduced in",

    options: ["1946", "1951", "1954", "1960"],

    answer: 2,

    explanation: "The Lyttleton Constitution came into operation in 1954.",
  }),

  createQuestion({
    id: generateId("history", 52),
    year: 2020,

    question:
      "The major cash crop produced in Western Nigeria during colonial rule was",

    options: ["Groundnut", "Palm oil", "Cocoa", "Cotton"],

    answer: 2,

    explanation: "Western Nigeria was known for cocoa production.",
  }),

  createQuestion({
    id: generateId("history", 53),
    year: 2023,

    question: "Who was the first President of Ghana?",

    options: [
      "Kwame Nkrumah",
      "Julius Nyerere",
      "Nelson Mandela",
      "Jomo Kenyatta",
    ],

    answer: 0,

    explanation: "Kwame Nkrumah became Ghana’s first President.",
  }),

  createQuestion({
    id: generateId("history", 54),
    year: 2022,

    question: "The main reason for the decline of the Oyo Empire was",

    options: [
      "European invasion",
      "Internal conflicts",
      "Islamic conquest",
      "Natural disasters",
    ],

    answer: 1,

    explanation:
      "Internal conflicts and political instability weakened the Oyo Empire.",
  }),

  createQuestion({
    id: generateId("history", 55),
    year: 2021,

    question: "The first European traders to arrive in Nigeria were the",

    options: ["British", "French", "Portuguese", "Dutch"],

    answer: 2,

    explanation:
      "The Portuguese were the first Europeans to arrive in Nigeria.",
  }),

  createQuestion({
    id: generateId("history", 56),
    year: 2020,

    question:
      "Which nationalist was known as the father of Nigerian nationalism?",

    options: ["Herbert Macaulay", "Nnamdi Azikiwe", "Awolowo", "Balewa"],

    answer: 0,

    explanation:
      "Herbert Macaulay is regarded as the father of Nigerian nationalism.",
  }),

  createQuestion({
    id: generateId("history", 57),
    year: 2023,

    question: "The main occupation of the Nok people was",

    options: ["Fishing", "Trading", "Farming and iron working", "Hunting only"],

    answer: 2,

    explanation: "The Nok civilization practiced farming and iron smelting.",
  }),

  createQuestion({
    id: generateId("history", 58),
    year: 2022,

    question: "The capital of the old Benin Kingdom was",

    options: ["Warri", "Benin City", "Lokoja", "Abeokuta"],

    answer: 1,

    explanation: "Benin City was the capital of the Benin Kingdom.",
  }),

  createQuestion({
    id: generateId("history", 59),
    year: 2021,

    question: "The Second Republic in Nigeria began in",

    options: ["1963", "1979", "1983", "1999"],

    answer: 1,

    explanation: "Nigeria’s Second Republic started in 1979.",
  }),

  createQuestion({
    id: generateId("history", 60),
    year: 2020,

    question: "The slave trade was abolished by Britain in",

    options: ["1807", "1914", "1885", "1960"],

    answer: 0,

    explanation: "Britain abolished the slave trade in 1807.",
  }),

  createQuestion({
    id: generateId("history", 61),
    year: 2023,

    question: "The traditional ruler of Oyo Empire was known as the",

    options: ["Oba", "Alaafin", "Mai", "Emir"],

    answer: 1,

    explanation: "The ruler of the Oyo Empire was called the Alaafin.",
  }),

  createQuestion({
    id: generateId("history", 62),
    year: 2022,

    question: "Who became Nigeria’s Head of State after Aguiyi-Ironsi?",

    options: ["Yakubu Gowon", "Obasanjo", "Murtala Mohammed", "Babangida"],

    answer: 0,

    explanation: "Yakubu Gowon succeeded Aguiyi-Ironsi in 1966.",
  }),

  createQuestion({
    id: generateId("history", 63),
    year: 2021,

    question: "The major objective of ECOWAS is to",

    options: [
      "Promote religion",
      "Promote economic integration",
      "Encourage military rule",
      "Fight colonialism",
    ],

    answer: 1,

    explanation:
      "ECOWAS promotes economic cooperation among West African states.",
  }),

  createQuestion({
    id: generateId("history", 64),
    year: 2020,

    question: "The first university in Nigeria was",

    options: [
      "University of Lagos",
      "University of Nigeria",
      "University of Ibadan",
      "Ahmadu Bello University",
    ],

    answer: 2,

    explanation: "The University of Ibadan was Nigeria’s first university.",
  }),

  createQuestion({
    id: generateId("history", 65),
    year: 2023,

    question: "The Nigerian flag was designed by",

    options: [
      "Taiwo Akinkunmi",
      "Nnamdi Azikiwe",
      "Herbert Macaulay",
      "Awolowo",
    ],

    answer: 0,

    explanation: "Taiwo Akinkunmi designed the Nigerian national flag.",
  }),

  createQuestion({
    id: generateId("history", 66),
    year: 2022,

    question: "Which empire was famous for gold trade in West Africa?",

    options: ["Benin Empire", "Ghana Empire", "Kanem Empire", "Oyo Empire"],

    answer: 1,

    explanation: "The Ghana Empire became wealthy through gold trade.",
  }),

  createQuestion({
    id: generateId("history", 67),
    year: 2021,

    question: "The title of the ruler of the Hausa states was",

    options: ["Mai", "Oba", "Sarki", "Alaafin"],

    answer: 2,

    explanation: "Hausa rulers were referred to as Sarki.",
  }),

  createQuestion({
    id: generateId("history", 68),
    year: 2020,

    question: "The first military coup in Ghana occurred in",

    options: ["1966", "1957", "1979", "1981"],

    answer: 0,

    explanation: "Ghana experienced its first military coup in 1966.",
  }),

  createQuestion({
    id: generateId("history", 69),
    year: 2023,

    question: "The capital of the Mali Empire was",

    options: ["Timbuktu", "Gao", "Niani", "Kano"],

    answer: 2,

    explanation: "Niani served as the capital of the Mali Empire.",
  }),

  createQuestion({
    id: generateId("history", 70),
    year: 2022,

    question: "The introduction of Christianity in Nigeria was mainly through",

    options: ["Explorers", "Missionaries", "Soldiers", "Merchants"],

    answer: 1,

    explanation:
      "Christianity spread in Nigeria mainly through missionary activities.",
  }),

  createQuestion({
    id: generateId("history", 71),
    year: 2021,

    question: "The headquarters of the African Union is in",

    options: ["Nairobi", "Addis Ababa", "Abuja", "Cairo"],

    answer: 1,

    explanation:
      "The African Union headquarters is located in Addis Ababa, Ethiopia.",
  }),

  createQuestion({
    id: generateId("history", 72),
    year: 2020,

    question: "The famous Songhai ruler was",

    options: ["Mansa Musa", "Askia Muhammad", "Sunni Ali", "Oduduwa"],

    answer: 2,

    explanation:
      "Sunni Ali was one of the greatest rulers of the Songhai Empire.",
  }),

  createQuestion({
    id: generateId("history", 73),
    year: 2023,

    question: "The first republic constitution in Nigeria came into effect in",

    options: ["1960", "1963", "1966", "1979"],

    answer: 1,

    explanation: "Nigeria became a republic in 1963.",
  }),

  createQuestion({
    id: generateId("history", 74),
    year: 2022,

    question: "The abolition of slave trade encouraged",

    options: ["Legitimate trade", "Civil war", "Military rule", "Imperialism"],

    answer: 0,

    explanation: "Legitimate trade replaced slave trade after abolition.",
  }),

  createQuestion({
    id: generateId("history", 75),
    year: 2021,

    question:
      "Who was the first Executive President of the United States of America?",

    options: [
      "George Washington",
      "Abraham Lincoln",
      "Thomas Jefferson",
      "John Adams",
    ],

    answer: 0,

    explanation:
      "George Washington became the first President of the United States.",
  }),

  createQuestion({
    id: generateId("history", 76),
    year: 2020,

    question: "The nationalist newspaper founded by Nnamdi Azikiwe was",

    options: [
      "West African Pilot",
      "Daily Times",
      "Nigerian Tribune",
      "Iwe Irohin",
    ],

    answer: 0,

    explanation: "Nnamdi Azikiwe founded the West African Pilot newspaper.",
  }),

  createQuestion({
    id: generateId("history", 77),
    year: 2023,

    question: "The major reason for European exploration of Africa was to",

    options: [
      "Spread democracy",
      "Discover trade routes",
      "Promote nationalism",
      "Establish kingdoms",
    ],

    answer: 1,

    explanation:
      "Europeans explored Africa mainly to discover trade routes and resources.",
  }),

  createQuestion({
    id: generateId("history", 78),
    year: 2022,

    question: "The first military ruler of Ghana was",

    options: ["Jerry Rawlings", "Ankrah", "Nkrumah", "Busia"],

    answer: 1,

    explanation:
      "General Ankrah became Ghana’s first military ruler after the 1966 coup.",
  }),

  createQuestion({
    id: generateId("history", 79),
    year: 2021,

    question: "The headquarters of the United Nations is in",

    options: ["London", "Washington D.C.", "New York", "Paris"],

    answer: 2,

    explanation: "The headquarters of the United Nations is in New York.",
  }),

  createQuestion({
    id: generateId("history", 80),
    year: 2020,

    question:
      "The Yoruba council that checked the powers of the Alaafin was the",

    options: ["Ogboni", "Oyomesi", "Ekpe", "Age Grade"],

    answer: 1,

    explanation: "The Oyomesi acted as checks on the powers of the Alaafin.",
  }),

  createQuestion({
    id: generateId("history", 81),
    year: 2023,

    question: "The first indigenous governor-general of Nigeria was",

    options: [
      "Tafawa Balewa",
      "Nnamdi Azikiwe",
      "Obafemi Awolowo",
      "Yakubu Gowon",
    ],

    answer: 1,

    explanation:
      "Dr. Nnamdi Azikiwe became Nigeria’s first indigenous Governor-General.",
  }),

  createQuestion({
    id: generateId("history", 82),
    year: 2022,

    question: "The nationalist movement in South Africa fought against",

    options: ["Colonial taxation", "Indirect rule", "Apartheid", "Slave trade"],

    answer: 2,

    explanation:
      "South African nationalists struggled against apartheid policies.",
  }),

  createQuestion({
    id: generateId("history", 83),
    year: 2021,

    question: "The first President of South Africa after apartheid was",

    options: ["Nelson Mandela", "Desmond Tutu", "F.W. de Klerk", "Thabo Mbeki"],

    answer: 0,

    explanation:
      "Nelson Mandela became President in 1994 after apartheid ended.",
  }),

  createQuestion({
    id: generateId("history", 84),
    year: 2020,

    question: "The major export of Northern Nigeria during colonial rule was",

    options: ["Palm oil", "Groundnut", "Cocoa", "Rubber"],

    answer: 1,

    explanation: "Northern Nigeria was known for groundnut production.",
  }),

  createQuestion({
    id: generateId("history", 85),
    year: 2023,

    question: "The empire founded by Sunni Ali was",

    options: ["Mali Empire", "Songhai Empire", "Kanem Empire", "Benin Empire"],

    answer: 1,

    explanation: "Sunni Ali was a famous ruler of the Songhai Empire.",
  }),

  createQuestion({
    id: generateId("history", 86),
    year: 2022,

    question: "The Nigerian Tribune newspaper was founded by",

    options: ["Awolowo", "Azikiwe", "Balewa", "Macaulay"],

    answer: 0,

    explanation: "Chief Obafemi Awolowo founded the Nigerian Tribune.",
  }),

  createQuestion({
    id: generateId("history", 87),
    year: 2021,

    question: "The first republic in Ghana began in",

    options: ["1957", "1960", "1966", "1979"],

    answer: 1,

    explanation: "Ghana became a republic in 1960.",
  }),

  createQuestion({
    id: generateId("history", 88),
    year: 2020,

    question: "The title of the ruler of the Jukun people was",

    options: ["Attah", "Aku", "Tor Tiv", "Oba"],

    answer: 0,

    explanation: "The ruler of the Jukun people was known as the Attah.",
  }),

  createQuestion({
    id: generateId("history", 89),
    year: 2023,

    question: "The Cold War was mainly between",

    options: [
      "USA and Germany",
      "USA and USSR",
      "Britain and France",
      "China and Japan",
    ],

    answer: 1,

    explanation:
      "The Cold War was mainly between the United States and the Soviet Union.",
  }),

  createQuestion({
    id: generateId("history", 90),
    year: 2022,

    question:
      "The first Nigerian military ruler to hand over power peacefully was",

    options: ["Yakubu Gowon", "Olusegun Obasanjo", "Babangida", "Abacha"],

    answer: 1,

    explanation:
      "Olusegun Obasanjo handed over power to a civilian government in 1979.",
  }),
];

/* =========================================================
FRENCH
========================================================= */
const french = [
  createQuestion({
    id: generateId("french", 1),
    year: 2023,

    question: 'The French expression for "Good morning" is',

    options: ["Bonsoir", "Bonjour", "Salut", "Merci"],

    answer: 1,

    explanation: '"Bonjour" means "Good morning" in French.',
  }),

  createQuestion({
    id: generateId("french", 2),
    year: 2022,

    question: 'The French word for "book" is',

    options: ["Livre", "Table", "Stylo", "Chaise"],

    answer: 0,

    explanation: '"Livre" means "book" in French.',
  }),

  createQuestion({
    id: generateId("french", 3),
    year: 2021,

    question: 'Choose the correct translation of "Thank you".',

    options: ["Bonjour", "Merci", "Pardon", "Au revoir"],

    answer: 1,

    explanation: '"Merci" means "Thank you" in French.',
  }),

  createQuestion({
    id: generateId("french", 4),
    year: 2020,

    question: 'The French equivalent of "Goodbye" is',

    options: ["Bonsoir", "Merci", "Au revoir", "Salut"],

    answer: 2,

    explanation: '"Au revoir" means "Goodbye".',
  }),

  createQuestion({
    id: generateId("french", 5),
    year: 2023,

    question: 'Which of these means "Please" in French?',

    options: ["S’il vous plaît", "Merci", "Bonjour", "Excusez-moi"],

    answer: 0,

    explanation: '"S’il vous plaît" means "Please".',
  }),

  createQuestion({
    id: generateId("french", 6),
    year: 2022,

    question: 'The French word for "school" is',

    options: ["Maison", "École", "Livre", "Voiture"],

    answer: 1,

    explanation: '"École" means "school".',
  }),

  createQuestion({
    id: generateId("french", 7),
    year: 2021,

    question: 'Choose the correct French translation for "water".',

    options: ["Pain", "Lait", "Eau", "Viande"],

    answer: 2,

    explanation: '"Eau" means "water" in French.',
  }),

  createQuestion({
    id: generateId("french", 8),
    year: 2020,

    question: 'The opposite of "grand" in French is',

    options: ["Petit", "Beau", "Long", "Jeune"],

    answer: 0,

    explanation: '"Petit" means "small", opposite of "grand".',
  }),

  createQuestion({
    id: generateId("french", 9),
    year: 2023,

    question: 'The French word for "teacher" is',

    options: ["Étudiant", "Professeur", "Docteur", "Ingénieur"],

    answer: 1,

    explanation: '"Professeur" means "teacher".',
  }),

  createQuestion({
    id: generateId("french", 10),
    year: 2022,

    question: 'Choose the correct translation of "I am happy".',

    options: [
      "Je suis fatigué",
      "Je suis content",
      "Je suis malade",
      "Je suis pauvre",
    ],

    answer: 1,

    explanation: '"Je suis content" means "I am happy".',
  }),

  createQuestion({
    id: generateId("french", 11),
    year: 2021,

    question: 'The French word for "food" is',

    options: ["Nourriture", "Boisson", "Maison", "École"],

    answer: 0,

    explanation: '"Nourriture" means "food".',
  }),

  createQuestion({
    id: generateId("french", 12),
    year: 2020,

    question: 'What is the French word for "friend"?',

    options: ["Ami", "Voisin", "Frère", "Père"],

    answer: 0,

    explanation: '"Ami" means "friend".',
  }),

  createQuestion({
    id: generateId("french", 13),
    year: 2023,

    question: 'The plural form of "cheval" is',

    options: ["Chevals", "Chevaux", "Chevales", "Chevaleux"],

    answer: 1,

    explanation: 'The plural of "cheval" is "chevaux".',
  }),

  createQuestion({
    id: generateId("french", 14),
    year: 2022,

    question: 'Choose the correct French word for "house".',

    options: ["École", "Maison", "Table", "Chaise"],

    answer: 1,

    explanation: '"Maison" means "house".',
  }),

  createQuestion({
    id: generateId("french", 15),
    year: 2021,

    question: 'The French expression "Comment ça va?" means',

    options: [
      "What is your name?",
      "How are you?",
      "Where are you going?",
      "Goodbye",
    ],

    answer: 1,

    explanation: '"Comment ça va?" means "How are you?"',
  }),
  createQuestion({
    id: generateId("french", 16),
    year: 2020,

    question: 'The French word for "car" is',

    options: ["Voiture", "Maison", "Route", "Porte"],

    answer: 0,

    explanation: '"Voiture" means "car" in French.',
  }),

  createQuestion({
    id: generateId("french", 17),
    year: 2023,

    question: 'Choose the correct translation of "Where do you live?"',

    options: [
      "Comment allez-vous?",
      "Où habitez-vous?",
      "Quel âge avez-vous?",
      "Que faites-vous?",
    ],

    answer: 1,

    explanation: '"Où habitez-vous?" means "Where do you live?"',
  }),

  createQuestion({
    id: generateId("french", 18),
    year: 2022,

    question: 'The French word for "bread" is',

    options: ["Pain", "Lait", "Viande", "Fromage"],

    answer: 0,

    explanation: '"Pain" means "bread".',
  }),

  createQuestion({
    id: generateId("french", 19),
    year: 2021,

    question: 'Choose the correct French translation for "mother".',

    options: ["Père", "Frère", "Sœur", "Mère"],

    answer: 3,

    explanation: '"Mère" means "mother".',
  }),

  createQuestion({
    id: generateId("french", 20),
    year: 2020,

    question: 'The opposite of "chaud" is',

    options: ["Petit", "Froid", "Long", "Jeune"],

    answer: 1,

    explanation: '"Froid" means "cold", opposite of "chaud".',
  }),

  createQuestion({
    id: generateId("french", 21),
    year: 2023,

    question: 'The French word for "dog" is',

    options: ["Chat", "Cheval", "Chien", "Oiseau"],

    answer: 2,

    explanation: '"Chien" means "dog".',
  }),

  createQuestion({
    id: generateId("french", 22),
    year: 2022,

    question: 'Choose the correct translation of "See you tomorrow".',

    options: ["À demain", "Bonsoir", "Merci beaucoup", "Bonne nuit"],

    answer: 0,

    explanation: '"À demain" means "See you tomorrow".',
  }),

  createQuestion({
    id: generateId("french", 23),
    year: 2021,

    question: 'The French word for "chair" is',

    options: ["Chaise", "Table", "Porte", "Fenêtre"],

    answer: 0,

    explanation: '"Chaise" means "chair".',
  }),

  createQuestion({
    id: generateId("french", 24),
    year: 2020,

    question: 'What is the French word for "milk"?',

    options: ["Pain", "Lait", "Sucre", "Sel"],

    answer: 1,

    explanation: '"Lait" means "milk".',
  }),

  createQuestion({
    id: generateId("french", 25),
    year: 2023,

    question: 'Choose the correct translation of "My name is John".',

    options: [
      "Je suis John",
      "J’habite John",
      "Je m’appelle John",
      "Je vais John",
    ],

    answer: 2,

    explanation: '"Je m’appelle John" means "My name is John".',
  }),

  createQuestion({
    id: generateId("french", 26),
    year: 2022,

    question: 'The French word for "sun" is',

    options: ["Lune", "Étoile", "Soleil", "Ciel"],

    answer: 2,

    explanation: '"Soleil" means "sun".',
  }),

  createQuestion({
    id: generateId("french", 27),
    year: 2021,

    question: 'Choose the correct French word for "father".',

    options: ["Frère", "Oncle", "Père", "Cousin"],

    answer: 2,

    explanation: '"Père" means "father".',
  }),

  createQuestion({
    id: generateId("french", 28),
    year: 2020,

    question: 'The French word for "market" is',

    options: ["Marché", "Boutique", "Banque", "Église"],

    answer: 0,

    explanation: '"Marché" means "market".',
  }),

  createQuestion({
    id: generateId("french", 29),
    year: 2023,

    question: 'The expression "Bonne nuit" means',

    options: ["Good morning", "Good afternoon", "Good night", "Goodbye"],

    answer: 2,

    explanation: '"Bonne nuit" means "Good night".',
  }),

  createQuestion({
    id: generateId("french", 30),
    year: 2022,

    question: 'The French word for "child" is',

    options: ["Enfant", "Parent", "Professeur", "Ami"],

    answer: 0,

    explanation: '"Enfant" means "child".',
  }),
  createQuestion({
    id: generateId("french", 31),
    year: 2021,

    question: 'Choose the correct translation of "I love my country".',

    options: [
      "J’aime mon pays",
      "Je vois mon pays",
      "Je quitte mon pays",
      "Je connais mon pays",
    ],

    answer: 0,

    explanation: '"J’aime mon pays" means "I love my country".',
  }),

  createQuestion({
    id: generateId("french", 32),
    year: 2020,

    question: 'The French word for "window" is',

    options: ["Porte", "Fenêtre", "Chaise", "Toit"],

    answer: 1,

    explanation: '"Fenêtre" means "window".',
  }),

  createQuestion({
    id: generateId("french", 33),
    year: 2023,

    question: 'Choose the correct French translation for "How old are you?"',

    options: [
      "Quel âge avez-vous?",
      "Comment allez-vous?",
      "Où habitez-vous?",
      "Que faites-vous?",
    ],

    answer: 0,

    explanation: '"Quel âge avez-vous?" means "How old are you?"',
  }),

  createQuestion({
    id: generateId("french", 34),
    year: 2022,

    question: 'The French word for "church" is',

    options: ["Mosquée", "Temple", "Église", "École"],

    answer: 2,

    explanation: '"Église" means "church".',
  }),

  createQuestion({
    id: generateId("french", 35),
    year: 2021,

    question: 'The opposite of "riche" is',

    options: ["Pauvre", "Grand", "Heureux", "Fort"],

    answer: 0,

    explanation: '"Pauvre" means "poor", opposite of "riche".',
  }),

  createQuestion({
    id: generateId("french", 36),
    year: 2020,

    question: 'The French word for "student" is',

    options: ["Professeur", "Docteur", "Étudiant", "Ingénieur"],

    answer: 2,

    explanation: '"Étudiant" means "student".',
  }),

  createQuestion({
    id: generateId("french", 37),
    year: 2023,

    question: 'Choose the correct translation of "I am tired".',

    options: [
      "Je suis malade",
      "Je suis fatigué",
      "Je suis heureux",
      "Je suis pauvre",
    ],

    answer: 1,

    explanation: '"Je suis fatigué" means "I am tired".',
  }),

  createQuestion({
    id: generateId("french", 38),
    year: 2022,

    question: 'The French word for "brother" is',

    options: ["Père", "Sœur", "Frère", "Oncle"],

    answer: 2,

    explanation: '"Frère" means "brother".',
  }),

  createQuestion({
    id: generateId("french", 39),
    year: 2021,

    question: 'Choose the correct French word for "river".',

    options: ["Mer", "Lac", "Rivière", "Montagne"],

    answer: 2,

    explanation: '"Rivière" means "river".',
  }),

  createQuestion({
    id: generateId("french", 40),
    year: 2020,

    question: 'The French expression "Excusez-moi" means',

    options: ["Please", "Thank you", "Excuse me", "Goodbye"],

    answer: 2,

    explanation: '"Excusez-moi" means "Excuse me".',
  }),

  createQuestion({
    id: generateId("french", 41),
    year: 2023,

    question: 'The French word for "doctor" is',

    options: ["Professeur", "Médecin", "Avocat", "Étudiant"],

    answer: 1,

    explanation: '"Médecin" means "doctor".',
  }),

  createQuestion({
    id: generateId("french", 42),
    year: 2022,

    question: 'Choose the correct translation of "We are friends".',

    options: [
      "Nous sommes amis",
      "Vous êtes amis",
      "Ils sont amis",
      "Je suis ami",
    ],

    answer: 0,

    explanation: '"Nous sommes amis" means "We are friends".',
  }),

  createQuestion({
    id: generateId("french", 43),
    year: 2021,

    question: 'The French word for "table" is',

    options: ["Chaise", "Table", "Porte", "Livre"],

    answer: 1,

    explanation: '"Table" means "table".',
  }),

  createQuestion({
    id: generateId("french", 44),
    year: 2020,

    question: 'The opposite of "jeune" is',

    options: ["Petit", "Grand", "Vieux", "Heureux"],

    answer: 2,

    explanation: '"Vieux" means "old", opposite of "jeune".',
  }),

  createQuestion({
    id: generateId("french", 45),
    year: 2023,

    question: 'Choose the correct French word for "city".',

    options: ["Village", "Ville", "Pays", "Route"],

    answer: 1,

    explanation: '"Ville" means "city".',
  }),
];
/* =========================================================
COMPUTER STUDIES
========================================================= */
const computer = [
  createQuestion({
    id: generateId("computer_studies", 1),
    year: 2023,

    question: "The brain of the computer is the",

    options: ["RAM", "CPU", "Hard Disk", "Monitor"],

    answer: 1,

    explanation:
      "The CPU (Central Processing Unit) is regarded as the brain of the computer.",
  }),

  createQuestion({
    id: generateId("computer_studies", 2),
    year: 2022,

    question: "Which of the following is an input device?",

    options: ["Printer", "Monitor", "Keyboard", "Speaker"],

    answer: 2,

    explanation: "Keyboard is used to input data into the computer.",
  }),

  createQuestion({
    id: generateId("computer_studies", 3),
    year: 2021,

    question: "Which of the following is an example of system software?",

    options: ["Microsoft Word", "Windows OS", "Excel", "Photoshop"],

    answer: 1,

    explanation:
      "Windows OS is system software that manages computer hardware.",
  }),

  createQuestion({
    id: generateId("computer_studies", 4),
    year: 2020,

    question: "ROM stands for",

    options: [
      "Read Only Memory",
      "Random Only Memory",
      "Run Only Memory",
      "Read Output Memory",
    ],

    answer: 0,

    explanation: "ROM means Read Only Memory.",
  }),

  createQuestion({
    id: generateId("computer_studies", 5),
    year: 2023,

    question: "Which device is used to display output?",

    options: ["Keyboard", "Mouse", "Monitor", "Scanner"],

    answer: 2,

    explanation: "Monitor is an output device used to display information.",
  }),

  createQuestion({
    id: generateId("computer_studies", 6),
    year: 2022,

    question: "The full meaning of RAM is",

    options: [
      "Read Access Memory",
      "Random Access Memory",
      "Run Access Memory",
      "Rapid Access Memory",
    ],

    answer: 1,

    explanation: "RAM stands for Random Access Memory.",
  }),

  createQuestion({
    id: generateId("computer_studies", 7),
    year: 2021,

    question: "Which of the following is NOT an operating system?",

    options: ["Linux", "Windows", "Google Chrome", "macOS"],

    answer: 2,

    explanation: "Google Chrome is a browser, not an operating system.",
  }),

  createQuestion({
    id: generateId("computer_studies", 8),
    year: 2020,

    question: "A computer network is defined as",

    options: [
      "A single computer system",
      "A group of connected computers",
      "A storage device",
      "An input device",
    ],

    answer: 1,

    explanation: "A network connects multiple computers to share resources.",
  }),

  createQuestion({
    id: generateId("computer_studies", 9),
    year: 2023,

    question: "Which of the following is a programming language?",

    options: ["HTML", "Python", "Windows", "Google"],

    answer: 1,

    explanation: "Python is a high-level programming language.",
  }),

  createQuestion({
    id: generateId("computer_studies", 10),
    year: 2022,

    question: "The device used to store data permanently is",

    options: ["RAM", "Cache", "Hard Disk", "Register"],

    answer: 2,

    explanation: "Hard Disk stores data permanently.",
  }),

  createQuestion({
    id: generateId("computer_studies", 11),
    year: 2021,

    question: "Which of the following is an example of output device?",

    options: ["Keyboard", "Mouse", "Printer", "Scanner"],

    answer: 2,

    explanation: "Printer produces hard copy output.",
  }),

  createQuestion({
    id: generateId("computer_studies", 12),
    year: 2020,

    question: "The internet is best described as",

    options: [
      "A local network",
      "A global network",
      "A single computer",
      "A software",
    ],

    answer: 1,

    explanation: "The internet is a global network of computers.",
  }),

  createQuestion({
    id: generateId("computer_studies", 13),
    year: 2023,

    question: "Which of the following is used to browse the internet?",

    options: ["MS Word", "Chrome", "Excel", "PowerPoint"],

    answer: 1,

    explanation: "Google Chrome is a web browser.",
  }),

  createQuestion({
    id: generateId("computer_studies", 14),
    year: 2022,

    question: "The ALU in a computer stands for",

    options: [
      "Arithmetic Logic Unit",
      "Array Logic Unit",
      "Automatic Link Unit",
      "Application Logic Unit",
    ],

    answer: 0,

    explanation: "ALU means Arithmetic Logic Unit.",
  }),

  createQuestion({
    id: generateId("computer_studies", 15),
    year: 2021,

    question: "Which of the following is a storage device?",

    options: ["Scanner", "Hard Disk", "Monitor", "Keyboard"],

    answer: 1,

    explanation: "Hard Disk is used for data storage.",
  }),
  createQuestion({
    id: generateId("computer_studies", 16),
    year: 2020,

    question: "The shortcut key for copy is",

    options: ["Ctrl + V", "Ctrl + C", "Ctrl + X", "Ctrl + Z"],

    answer: 1,

    explanation: "Ctrl + C is used to copy selected text or item.",
  }),

  createQuestion({
    id: generateId("computer_studies", 17),
    year: 2023,

    question: "Which of the following is NOT an input device?",

    options: ["Mouse", "Scanner", "Printer", "Keyboard"],

    answer: 2,

    explanation: "Printer is an output device, not input.",
  }),

  createQuestion({
    id: generateId("computer_studies", 18),
    year: 2022,

    question: "BIOS stands for",

    options: [
      "Basic Input Output System",
      "Binary Input Output System",
      "Basic Internal Operating System",
      "Built-In Operating System",
    ],

    answer: 0,

    explanation: "BIOS means Basic Input Output System.",
  }),

  createQuestion({
    id: generateId("computer_studies", 19),
    year: 2021,

    question: "A computer virus is",

    options: [
      "A hardware device",
      "A program that harms a computer",
      "A type of memory",
      "An input device",
    ],

    answer: 1,

    explanation: "A computer virus is malicious software that damages systems.",
  }),

  createQuestion({
    id: generateId("computer_studies", 20),
    year: 2020,

    question: "Which of the following is a search engine?",

    options: ["Google", "Microsoft Word", "Windows", "Excel"],

    answer: 0,

    explanation: "Google is a search engine used to find information online.",
  }),

  createQuestion({
    id: generateId("computer_studies", 21),
    year: 2023,

    question: "Which of the following is system software?",

    options: ["MS Excel", "Windows OS", "Photoshop", "MS Word"],

    answer: 1,

    explanation: "Windows OS is system software.",
  }),

  createQuestion({
    id: generateId("computer_studies", 22),
    year: 2022,

    question: "The process of turning data into useful information is called",

    options: ["Processing", "Input", "Output", "Storage"],

    answer: 0,

    explanation: "Processing converts raw data into meaningful information.",
  }),

  createQuestion({
    id: generateId("computer_studies", 23),
    year: 2021,

    question: "Which device is used to point and click on a computer?",

    options: ["Keyboard", "Mouse", "Scanner", "Printer"],

    answer: 1,

    explanation: "Mouse is used to point and select items on screen.",
  }),

  createQuestion({
    id: generateId("computer_studies", 24),
    year: 2020,

    question: "Which of the following is NOT a storage device?",

    options: ["Flash drive", "Hard disk", "RAM", "Monitor"],

    answer: 3,

    explanation: "Monitor is an output device, not storage.",
  }),

  createQuestion({
    id: generateId("computer_studies", 25),
    year: 2023,

    question: "HTML is used for",

    options: [
      "Programming games",
      "Creating web pages",
      "Editing images",
      "Operating system",
    ],

    answer: 1,

    explanation: "HTML is used to create and structure web pages.",
  }),

  createQuestion({
    id: generateId("computer_studies", 26),
    year: 2022,

    question: "Which of the following is an example of application software?",

    options: ["Windows", "Linux", "MS Word", "BIOS"],

    answer: 2,

    explanation: "MS Word is application software used for word processing.",
  }),

  createQuestion({
    id: generateId("computer_studies", 27),
    year: 2021,

    question: "The full meaning of URL is",

    options: [
      "Uniform Resource Locator",
      "Universal Resource Link",
      "Unified Resource Locator",
      "Uniform Routing Link",
    ],

    answer: 0,

    explanation: "URL stands for Uniform Resource Locator.",
  }),

  createQuestion({
    id: generateId("computer_studies", 28),
    year: 2020,

    question: "Which memory is volatile?",

    options: ["ROM", "Hard disk", "RAM", "Flash drive"],

    answer: 2,

    explanation: "RAM is volatile memory that loses data when power is off.",
  }),

  createQuestion({
    id: generateId("computer_studies", 29),
    year: 2023,

    question: "The device used to connect computers in a network is",

    options: ["Router", "Scanner", "Monitor", "Keyboard"],

    answer: 0,

    explanation: "A router connects multiple devices in a network.",
  }),

  createQuestion({
    id: generateId("computer_studies", 30),
    year: 2022,

    question: "Which of the following is NOT an operating system?",

    options: ["Android", "Windows", "Linux", "Google Drive"],

    answer: 3,

    explanation: "Google Drive is cloud storage, not an operating system.",
  }),
  createQuestion({
    id: generateId("computer_studies", 31),
    year: 2021,

    question: "Which of the following is used to delete a file permanently?",

    options: ["Recycle Bin", "Restore", "Shift + Delete", "Ctrl + Delete"],

    answer: 2,

    explanation:
      "Shift + Delete removes a file permanently without sending it to Recycle Bin.",
  }),

  createQuestion({
    id: generateId("computer_studies", 32),
    year: 2020,

    question: "The function of an operating system is to",

    options: [
      "Play music",
      "Manage computer resources",
      "Print documents",
      "Browse the internet",
    ],

    answer: 1,

    explanation: "An operating system manages hardware and software resources.",
  }),

  createQuestion({
    id: generateId("computer_studies", 33),
    year: 2023,

    question: "Which of the following is an example of cloud storage?",

    options: ["Hard disk", "Flash drive", "Google Drive", "CD-ROM"],

    answer: 2,

    explanation: "Google Drive is a cloud storage service.",
  }),

  createQuestion({
    id: generateId("computer_studies", 34),
    year: 2022,

    question: "A compiler is used to",

    options: [
      "Design hardware",
      "Translate high-level language to machine code",
      "Store data",
      "Connect networks",
    ],

    answer: 1,

    explanation:
      "A compiler converts high-level programming language into machine code.",
  }),

  createQuestion({
    id: generateId("computer_studies", 35),
    year: 2021,

    question: "Which device is used to scan documents into a computer?",

    options: ["Printer", "Scanner", "Monitor", "Speaker"],

    answer: 1,

    explanation:
      "A scanner is used to convert physical documents into digital form.",
  }),

  createQuestion({
    id: generateId("computer_studies", 36),
    year: 2020,

    question: "The binary system uses which base?",

    options: ["Base 10", "Base 2", "Base 8", "Base 16"],

    answer: 1,

    explanation: "Binary system is base 2, using only 0 and 1.",
  }),

  createQuestion({
    id: generateId("computer_studies", 37),
    year: 2023,

    question: "Which of the following is NOT a programming language?",

    options: ["Python", "Java", "HTML", "C++"],

    answer: 2,

    explanation: "HTML is a markup language, not a programming language.",
  }),

  createQuestion({
    id: generateId("computer_studies", 38),
    year: 2022,

    question: "The device used to convert analog signals to digital is",

    options: ["Modem", "Printer", "Keyboard", "Monitor"],

    answer: 0,

    explanation:
      "A modem converts analog signals to digital signals and vice versa.",
  }),

  createQuestion({
    id: generateId("computer_studies", 39),
    year: 2021,

    question: "Which of the following is a secondary storage device?",

    options: ["RAM", "Cache", "Hard disk", "Register"],

    answer: 2,

    explanation: "Hard disk is used for secondary storage.",
  }),

  createQuestion({
    id: generateId("computer_studies", 40),
    year: 2020,

    question: "Which protocol is used for transferring web pages?",

    options: ["FTP", "HTTP", "SMTP", "POP3"],

    answer: 1,

    explanation: "HTTP (HyperText Transfer Protocol) is used for web pages.",
  }),

  createQuestion({
    id: generateId("computer_studies", 41),
    year: 2023,

    question: "The smallest unit of data in a computer is",

    options: ["Byte", "Bit", "Kilobyte", "Nibble"],

    answer: 1,

    explanation: "A bit is the smallest unit of data in computing.",
  }),

  createQuestion({
    id: generateId("computer_studies", 42),
    year: 2022,

    question: "Which of the following is an example of output device?",

    options: ["Keyboard", "Mouse", "Printer", "Scanner"],

    answer: 2,

    explanation: "Printer produces output in hard copy form.",
  }),

  createQuestion({
    id: generateId("computer_studies", 43),
    year: 2021,

    question: "Which of the following is NOT part of the CPU?",

    options: ["ALU", "CU", "RAM", "Registers"],

    answer: 2,

    explanation: "RAM is memory, not part of the CPU.",
  }),

  createQuestion({
    id: generateId("computer_studies", 44),
    year: 2020,

    question: "The main memory of the computer is",

    options: ["Hard disk", "ROM", "RAM", "Flash drive"],

    answer: 2,

    explanation: "RAM is the main memory used during processing.",
  }),

  createQuestion({
    id: generateId("computer_studies", 45),
    year: 2023,

    question: "Which of the following is used to send emails?",

    options: ["HTTP", "SMTP", "FTP", "DNS"],

    answer: 1,

    explanation: "SMTP is used for sending emails.",
  }),

  createQuestion({
    id: generateId("computer_studies", 46),
    year: 2022,

    question: "Which of the following is NOT an input device?",

    options: ["Mouse", "Keyboard", "Scanner", "Speaker"],

    answer: 3,

    explanation: "Speaker is an output device, not an input device.",
  }),

  createQuestion({
    id: generateId("computer_studies", 47),
    year: 2021,

    question: "The process of finding and fixing errors in a program is called",

    options: ["Compiling", "Debugging", "Executing", "Linking"],

    answer: 1,

    explanation:
      "Debugging is the process of identifying and removing errors in a program.",
  }),

  createQuestion({
    id: generateId("computer_studies", 48),
    year: 2020,

    question: "Which of the following is a web browser?",

    options: ["Google Chrome", "Microsoft Excel", "Windows", "Notepad"],

    answer: 0,

    explanation:
      "Google Chrome is a web browser used for accessing the internet.",
  }),

  createQuestion({
    id: generateId("computer_studies", 49),
    year: 2023,

    question: "The unit of measurement of computer memory is",

    options: ["Meter", "Kilogram", "Byte", "Second"],

    answer: 2,

    explanation: "Memory is measured in bytes and its multiples.",
  }),

  createQuestion({
    id: generateId("computer_studies", 50),
    year: 2022,

    question: "Which of the following is used to store web pages locally?",

    options: ["Cache", "CPU", "RAM", "Router"],

    answer: 0,

    explanation:
      "Cache stores frequently accessed web data for faster retrieval.",
  }),

  createQuestion({
    id: generateId("computer_studies", 51),
    year: 2021,

    question: "Which of the following is an example of application software?",

    options: ["Linux", "Windows", "MS Word", "BIOS"],

    answer: 2,

    explanation:
      "MS Word is application software used for document processing.",
  }),

  createQuestion({
    id: generateId("computer_studies", 52),
    year: 2020,

    question: "The internet service used for file transfer is",

    options: ["HTTP", "FTP", "SMTP", "POP3"],

    answer: 1,

    explanation: "FTP (File Transfer Protocol) is used for transferring files.",
  }),

  createQuestion({
    id: generateId("computer_studies", 53),
    year: 2023,

    question: "Which of the following is a pointing device?",

    options: ["Mouse", "Printer", "Speaker", "Monitor"],

    answer: 0,

    explanation: "Mouse is a pointing device used to control the cursor.",
  }),

  createQuestion({
    id: generateId("computer_studies", 54),
    year: 2022,

    question: "The language used to write web pages is",

    options: ["Python", "HTML", "C++", "Java"],

    answer: 1,

    explanation: "HTML is used for creating web pages.",
  }),

  createQuestion({
    id: generateId("computer_studies", 55),
    year: 2021,

    question: "Which of the following is a storage device?",

    options: ["Monitor", "Keyboard", "Flash drive", "Mouse"],

    answer: 2,

    explanation: "Flash drive is used for storing data.",
  }),

  createQuestion({
    id: generateId("computer_studies", 56),
    year: 2020,

    question: "Which of the following controls all computer operations?",

    options: ["RAM", "CPU", "Hard disk", "Monitor"],

    answer: 1,

    explanation: "CPU controls all operations of the computer.",
  }),

  createQuestion({
    id: generateId("computer_studies", 57),
    year: 2023,

    question: "The abbreviation ICT stands for",

    options: [
      "Information Communication Technology",
      "Internal Computer Technology",
      "Internet Control Technology",
      "Information Computer Transfer",
    ],

    answer: 0,

    explanation: "ICT stands for Information and Communication Technology.",
  }),

  createQuestion({
    id: generateId("computer_studies", 58),
    year: 2022,

    question: "Which of the following is NOT system software?",

    options: ["Windows", "Linux", "MS Word", "macOS"],

    answer: 2,

    explanation: "MS Word is application software, not system software.",
  }),

  createQuestion({
    id: generateId("computer_studies", 59),
    year: 2021,

    question: "The device used to print documents is",

    options: ["Scanner", "Printer", "Monitor", "Keyboard"],

    answer: 1,

    explanation: "Printer produces hard copy output.",
  }),

  createQuestion({
    id: generateId("computer_studies", 60),
    year: 2020,

    question: "Which of the following is a type of computer network?",

    options: ["LAN", "CPU", "RAM", "ROM"],

    answer: 0,

    explanation: "LAN (Local Area Network) is a type of computer network.",
  }),
];

/* =========================================================
MUSIC
========================================================= */
const music = [
  createQuestion({
    id: generateId("music", 1),
    year: 2023,

    question:
      "The element of music that refers to the loudness or softness of sound is",

    options: ["Pitch", "Dynamics", "Rhythm", "Harmony"],

    answer: 1,

    explanation:
      "Dynamics refers to the loudness or softness of sound in music.",
  }),

  createQuestion({
    id: generateId("music", 2),
    year: 2022,

    question: "The musical symbol used to represent silence is called",

    options: ["Note", "Rest", "Clef", "Bar line"],

    answer: 1,

    explanation: "A rest represents silence in music notation.",
  }),

  createQuestion({
    id: generateId("music", 3),
    year: 2021,

    question: "The treble clef is also known as",

    options: ["G clef", "F clef", "C clef", "D clef"],

    answer: 0,

    explanation:
      "The treble clef is called the G clef because it centers on note G.",
  }),

  createQuestion({
    id: generateId("music", 4),
    year: 2020,

    question: "The number of lines in a musical staff is",

    options: ["3", "4", "5", "6"],

    answer: 2,

    explanation: "A musical staff consists of 5 horizontal lines.",
  }),

  createQuestion({
    id: generateId("music", 5),
    year: 2023,

    question: "The duration of a semibreve is",

    options: ["1 beat", "2 beats", "4 beats", "8 beats"],

    answer: 2,

    explanation: "A semibreve (whole note) lasts for 4 beats in common time.",
  }),

  createQuestion({
    id: generateId("music", 6),
    year: 2022,

    question: "Which of the following is a percussion instrument?",

    options: ["Violin", "Trumpet", "Drum", "Flute"],

    answer: 2,

    explanation: "Drums are percussion instruments.",
  }),

  createQuestion({
    id: generateId("music", 7),
    year: 2021,

    question: "The symbol ♯ in music means",

    options: ["Flat", "Sharp", "Natural", "Rest"],

    answer: 1,

    explanation: "Sharp raises a note by a semitone.",
  }),

  createQuestion({
    id: generateId("music", 8),
    year: 2020,

    question: "A group of singers is called",

    options: ["Band", "Choir", "Orchestra", "Solo"],

    answer: 1,

    explanation: "A choir is a group of singers.",
  }),

  createQuestion({
    id: generateId("music", 9),
    year: 2023,

    question: "The speed of music is called",

    options: ["Dynamics", "Tempo", "Pitch", "Tone"],

    answer: 1,

    explanation: "Tempo refers to the speed of a piece of music.",
  }),

  createQuestion({
    id: generateId("music", 10),
    year: 2022,

    question: "The symbol used to raise the pitch of a note is",

    options: ["Flat", "Sharp", "Natural", "Rest"],

    answer: 1,

    explanation: "Sharp raises the pitch of a note.",
  }),

  createQuestion({
    id: generateId("music", 11),
    year: 2021,

    question: "The bass clef is also known as",

    options: ["G clef", "F clef", "C clef", "D clef"],

    answer: 1,

    explanation: "Bass clef is called the F clef.",
  }),

  createQuestion({
    id: generateId("music", 12),
    year: 2020,

    question: "A group of instrumentalists is called",

    options: ["Choir", "Orchestra", "Solo", "Duet"],

    answer: 1,

    explanation: "An orchestra is a large group of instrumentalists.",
  }),

  createQuestion({
    id: generateId("music", 13),
    year: 2023,

    question: "The distance between two musical notes is called",

    options: ["Chord", "Interval", "Scale", "Beat"],

    answer: 1,

    explanation: "An interval is the distance between two notes.",
  }),

  createQuestion({
    id: generateId("music", 14),
    year: 2022,

    question: "The Italian term 'Allegro' means",

    options: ["Slow", "Fast", "Soft", "Loud"],

    answer: 1,

    explanation: "Allegro means fast in music.",
  }),

  createQuestion({
    id: generateId("music", 15),
    year: 2021,

    question: "A melody is best described as",

    options: [
      "A group of random notes",
      "A sequence of musical notes",
      "A loud sound",
      "A rhythm only",
    ],

    answer: 1,

    explanation: "A melody is a sequence of musical notes arranged in order.",
  }),
  createQuestion({
    id: generateId("music", 16),
    year: 2020,

    question: "The symbol used to show the end of a piece of music is",

    options: ["Bar line", "Double bar line", "Clef", "Tie"],

    answer: 1,

    explanation: "A double bar line indicates the end of a musical piece.",
  }),

  createQuestion({
    id: generateId("music", 17),
    year: 2023,

    question: "The grouping of two or more notes sounded together is called",

    options: ["Melody", "Chord", "Rhythm", "Scale"],

    answer: 1,

    explanation:
      "A chord is formed when two or more notes are played together.",
  }),

  createQuestion({
    id: generateId("music", 18),
    year: 2022,

    question: "The basic unit of rhythm in music is called",

    options: ["Beat", "Note", "Pitch", "Staff"],

    answer: 0,

    explanation: "Beat is the basic unit of rhythm in music.",
  }),

  createQuestion({
    id: generateId("music", 19),
    year: 2021,

    question: "A repeated pattern of notes in music is called",

    options: ["Harmony", "Rhythm", "Melody", "Motif"],

    answer: 3,

    explanation: "A motif is a short repeated musical idea or pattern.",
  }),

  createQuestion({
    id: generateId("music", 20),
    year: 2020,

    question: "The term 'forte' in music means",

    options: ["Soft", "Fast", "Loud", "Slow"],

    answer: 2,

    explanation: "Forte means loud in music dynamics.",
  }),

  createQuestion({
    id: generateId("music", 21),
    year: 2023,

    question: "The symbol ♭ in music means",

    options: ["Sharp", "Flat", "Natural", "Rest"],

    answer: 1,

    explanation: "Flat lowers a note by a semitone.",
  }),

  createQuestion({
    id: generateId("music", 22),
    year: 2022,

    question: "The speed of a musical piece is called",

    options: ["Pitch", "Tempo", "Dynamics", "Harmony"],

    answer: 1,

    explanation: "Tempo refers to the speed of music.",
  }),

  createQuestion({
    id: generateId("music", 23),
    year: 2021,

    question: "A solo performance is performed by",

    options: ["One person", "Two people", "A group", "An orchestra"],

    answer: 0,

    explanation: "A solo is performed by one person.",
  }),

  createQuestion({
    id: generateId("music", 24),
    year: 2020,

    question: "The distance between two notes is called",

    options: ["Chord", "Interval", "Beat", "Scale"],

    answer: 1,

    explanation: "An interval is the distance between two notes.",
  }),

  createQuestion({
    id: generateId("music", 25),
    year: 2023,

    question: "Which of the following is a woodwind instrument?",

    options: ["Drum", "Flute", "Trumpet", "Timpani"],

    answer: 1,

    explanation: "Flute is a woodwind instrument.",
  }),

  createQuestion({
    id: generateId("music", 26),
    year: 2022,

    question: "A group of musical notes arranged in order is called",

    options: ["Chord", "Scale", "Beat", "Bar"],

    answer: 1,

    explanation: "A scale is a sequence of musical notes.",
  }),

  createQuestion({
    id: generateId("music", 27),
    year: 2021,

    question: "The Italian term 'piano' means",

    options: ["Loud", "Soft", "Fast", "Slow"],

    answer: 1,

    explanation: "Piano means soft in music dynamics.",
  }),

  createQuestion({
    id: generateId("music", 28),
    year: 2020,

    question: "A composition for a large group of instruments is called",

    options: ["Solo", "Duet", "Orchestra", "Monologue"],

    answer: 2,

    explanation: "An orchestra is a large group of instrumentalists.",
  }),

  createQuestion({
    id: generateId("music", 29),
    year: 2023,

    question: "The written form of music is called",

    options: ["Notation", "Lyrics", "Rhythm", "Tempo"],

    answer: 0,

    explanation: "Music notation is the written representation of music.",
  }),

  createQuestion({
    id: generateId("music", 30),
    year: 2022,

    question: "A bar in music is also called",

    options: ["Measure", "Beat", "Chord", "Note"],

    answer: 0,

    explanation: "A bar is also called a measure in music.",
  }),
  createQuestion({
    id: generateId("music", 31),
    year: 2021,

    question: "The symbol used to show repetition in music is",

    options: ["Repeat sign", "Clef", "Bar line", "Rest"],

    answer: 0,

    explanation:
      "Repeat signs indicate that a section of music should be played again.",
  }),

  createQuestion({
    id: generateId("music", 32),
    year: 2020,

    question:
      "The combination of different notes sounding pleasant together is called",

    options: ["Harmony", "Rhythm", "Tempo", "Beat"],

    answer: 0,

    explanation:
      "Harmony is the combination of notes played together pleasantly.",
  }),

  createQuestion({
    id: generateId("music", 33),
    year: 2023,

    question: "Which of the following is a brass instrument?",

    options: ["Flute", "Clarinet", "Trumpet", "Violin"],

    answer: 2,

    explanation: "Trumpet is a brass instrument.",
  }),

  createQuestion({
    id: generateId("music", 34),
    year: 2022,

    question: "The symbol used to indicate silence in music is",

    options: ["Note", "Rest", "Clef", "Sharp"],

    answer: 1,

    explanation: "A rest represents silence in music.",
  }),

  createQuestion({
    id: generateId("music", 35),
    year: 2021,

    question: "A group of singers performing together is called",

    options: ["Orchestra", "Choir", "Band", "Solo"],

    answer: 1,

    explanation: "A choir is a group of singers.",
  }),

  createQuestion({
    id: generateId("music", 36),
    year: 2020,

    question: "The term used for gradual increase in loudness is",

    options: ["Crescendo", "Decrescendo", "Allegro", "Staccato"],

    answer: 0,

    explanation: "Crescendo means gradually getting louder.",
  }),

  createQuestion({
    id: generateId("music", 37),
    year: 2023,

    question: "The symbol used to lower a note by a semitone is",

    options: ["Sharp", "Flat", "Natural", "Tie"],

    answer: 1,

    explanation: "Flat lowers a note by a semitone.",
  }),

  createQuestion({
    id: generateId("music", 38),
    year: 2022,

    question: "The distance between the highest and lowest notes is called",

    options: ["Range", "Pitch", "Tempo", "Beat"],

    answer: 0,

    explanation:
      "Range refers to the span between the lowest and highest notes.",
  }),

  createQuestion({
    id: generateId("music", 39),
    year: 2021,

    question: "A musical form consisting of verses and chorus is called",

    options: ["Symphony", "Song", "Sonata", "Opera"],

    answer: 1,

    explanation: "A song typically has verses and a chorus.",
  }),

  createQuestion({
    id: generateId("music", 40),
    year: 2020,

    question: "The term 'adagio' means",

    options: ["Fast", "Slow", "Loud", "Soft"],

    answer: 1,

    explanation: "Adagio means slow tempo in music.",
  }),
  createQuestion({
    id: generateId("music", 41),
    year: 2023,

    question: "The main beat of a piece of music is called",

    options: ["Tempo", "Pulse", "Harmony", "Chord"],

    answer: 1,

    explanation: "Pulse is the steady main beat in music.",
  }),

  createQuestion({
    id: generateId("music", 42),
    year: 2022,

    question: "Which of the following is NOT a percussion instrument?",

    options: ["Drum", "Xylophone", "Trumpet", "Cymbal"],

    answer: 2,

    explanation: "Trumpet is a brass instrument, not percussion.",
  }),

  createQuestion({
    id: generateId("music", 43),
    year: 2021,

    question: "The symbol used to connect two notes of the same pitch is",

    options: ["Tie", "Slur", "Bar line", "Rest"],

    answer: 0,

    explanation:
      "A tie connects two notes of the same pitch to extend duration.",
  }),

  createQuestion({
    id: generateId("music", 44),
    year: 2020,

    question: "The system of writing music is called",

    options: ["Notation", "Lyrics", "Tempo", "Scale"],

    answer: 0,

    explanation: "Music notation is the system of writing musical sounds.",
  }),

  createQuestion({
    id: generateId("music", 45),
    year: 2023,

    question: "The Italian term 'andante' means",

    options: ["Very fast", "Moderate walking pace", "Very slow", "Loud"],

    answer: 1,

    explanation: "Andante means a moderate walking tempo.",
  }),

  createQuestion({
    id: generateId("music", 46),
    year: 2022,

    question: "Which of the following is a string instrument?",

    options: ["Flute", "Violin", "Drum", "Trumpet"],

    answer: 1,

    explanation: "Violin is a string instrument.",
  }),

  createQuestion({
    id: generateId("music", 47),
    year: 2021,

    question: "The term 'fortissimo' means",

    options: ["Very soft", "Very loud", "Moderate", "Slow"],

    answer: 1,

    explanation: "Fortissimo means very loud.",
  }),

  createQuestion({
    id: generateId("music", 48),
    year: 2020,

    question: "A set of five horizontal lines used in music is called",

    options: ["Staff", "Chord", "Scale", "Bar"],

    answer: 0,

    explanation: "The staff (stave) is used for writing music notation.",
  }),

  createQuestion({
    id: generateId("music", 49),
    year: 2023,

    question: "The term used for gradual decrease in loudness is",

    options: ["Crescendo", "Decrescendo", "Allegro", "Staccato"],

    answer: 1,

    explanation: "Decrescendo means gradually getting softer.",
  }),

  createQuestion({
    id: generateId("music", 50),
    year: 2022,

    question: "Which of the following best describes rhythm?",

    options: [
      "Highness or lowness of sound",
      "Pattern of beats in music",
      "Speed of music",
      "Loudness of sound",
    ],

    answer: 1,

    explanation: "Rhythm is the pattern of beats in music.",
  }),
];

/* =========================================================
FINE ARTS
========================================================= */
const arts = [
  createQuestion({
    id: generateId("fine_arts", 1),
    year: 2023,

    question:
      "The element of art that refers to the lightness or darkness of a colour is",

    options: ["Line", "Value", "Texture", "Shape"],

    answer: 1,

    explanation: "Value describes how light or dark a colour is.",
  }),

  createQuestion({
    id: generateId("fine_arts", 2),
    year: 2022,

    question: "Which of the following is a primary colour?",

    options: ["Green", "Orange", "Red", "Purple"],

    answer: 2,

    explanation: "Red is a primary colour in art.",
  }),

  createQuestion({
    id: generateId("fine_arts", 3),
    year: 2021,

    question: "The act of making sketches before a final artwork is called",

    options: ["Printing", "Drafting", "Sketching", "Carving"],

    answer: 2,

    explanation: "Sketching is the process of making rough drawings.",
  }),

  createQuestion({
    id: generateId("fine_arts", 4),
    year: 2020,

    question: "The tool used for mixing colours in painting is",

    options: ["Palette", "Brush", "Easel", "Canvas"],

    answer: 0,

    explanation: "A palette is used for mixing paint colours.",
  }),

  createQuestion({
    id: generateId("fine_arts", 5),
    year: 2023,

    question: "Which of the following is a secondary colour?",

    options: ["Red", "Blue", "Green", "Yellow"],

    answer: 2,

    explanation:
      "Green is a secondary colour formed by mixing blue and yellow.",
  }),

  createQuestion({
    id: generateId("fine_arts", 6),
    year: 2022,

    question: "The surface on which an artist paints is called",

    options: ["Canvas", "Brush", "Palette", "Chalk"],

    answer: 0,

    explanation: "Canvas is the surface used for painting.",
  }),

  createQuestion({
    id: generateId("fine_arts", 7),
    year: 2021,

    question: "The art of making three-dimensional figures is called",

    options: ["Painting", "Drawing", "Sculpture", "Printing"],

    answer: 2,

    explanation: "Sculpture involves creating 3D art forms.",
  }),

  createQuestion({
    id: generateId("fine_arts", 8),
    year: 2020,

    question: "Which of the following is a warm colour?",

    options: ["Blue", "Green", "Red", "Purple"],

    answer: 2,

    explanation: "Red is considered a warm colour.",
  }),

  createQuestion({
    id: generateId("fine_arts", 9),
    year: 2023,

    question: "The repetition of elements in art is known as",

    options: ["Balance", "Rhythm", "Contrast", "Unity"],

    answer: 1,

    explanation: "Rhythm refers to repetition in art.",
  }),

  createQuestion({
    id: generateId("fine_arts", 10),
    year: 2022,

    question: "Which tool is used for drawing straight lines?",

    options: ["Compass", "Ruler", "Brush", "Palette"],

    answer: 1,

    explanation: "A ruler is used to draw straight lines.",
  }),

  createQuestion({
    id: generateId("fine_arts", 11),
    year: 2021,

    question: "The combination of light and shadow in art is called",

    options: ["Texture", "Value", "Chiaroscuro", "Form"],

    answer: 2,

    explanation: "Chiaroscuro is the use of light and shadow in art.",
  }),

  createQuestion({
    id: generateId("fine_arts", 12),
    year: 2020,

    question: "Which of the following is a tertiary colour?",

    options: ["Red-orange", "Blue", "Yellow", "Red"],

    answer: 0,

    explanation:
      "Red-orange is a tertiary colour formed by mixing a primary and secondary colour.",
  }),

  createQuestion({
    id: generateId("fine_arts", 13),
    year: 2023,

    question: "The outline of an object in art is called",

    options: ["Shape", "Line", "Form", "Space"],

    answer: 1,

    explanation: "A line creates the outline of objects.",
  }),

  createQuestion({
    id: generateId("fine_arts", 14),
    year: 2022,

    question: "Which of the following is NOT a drawing material?",

    options: ["Pencil", "Charcoal", "Brush", "Crayon"],

    answer: 2,

    explanation: "Brush is mainly used for painting, not drawing.",
  }),

  createQuestion({
    id: generateId("fine_arts", 15),
    year: 2021,

    question: "The art of printing designs on fabric is called",

    options: ["Weaving", "Dyeing", "Textile printing", "Carving"],

    answer: 2,

    explanation: "Textile printing is the art of printing designs on fabric.",
  }),
  createQuestion({
    id: generateId("fine_arts", 16),
    year: 2020,

    question: "The arrangement of elements in an artwork is called",

    options: ["Composition", "Balance", "Contrast", "Texture"],

    answer: 0,

    explanation:
      "Composition refers to how elements are arranged in an artwork.",
  }),

  createQuestion({
    id: generateId("fine_arts", 17),
    year: 2023,

    question: "Which of the following is a cool colour?",

    options: ["Red", "Orange", "Blue", "Yellow"],

    answer: 2,

    explanation: "Blue is considered a cool colour in art.",
  }),

  createQuestion({
    id: generateId("fine_arts", 18),
    year: 2022,

    question: "The tool used for shading in drawing is",

    options: ["Ruler", "Charcoal", "Compass", "Palette"],

    answer: 1,

    explanation: "Charcoal is commonly used for shading in drawings.",
  }),

  createQuestion({
    id: generateId("fine_arts", 19),
    year: 2021,

    question:
      "The principle of art that deals with equal distribution of visual weight is",

    options: ["Rhythm", "Balance", "Unity", "Emphasis"],

    answer: 1,

    explanation:
      "Balance ensures equal distribution of visual weight in artwork.",
  }),

  createQuestion({
    id: generateId("fine_arts", 20),
    year: 2020,

    question: "Which of the following is used to sharpen pencils?",

    options: ["Brush", "Eraser", "Sharpener", "Palette"],

    answer: 2,

    explanation: "A sharpener is used to sharpen pencils.",
  }),

  createQuestion({
    id: generateId("fine_arts", 21),
    year: 2023,

    question: "The art of designing letters and symbols is called",

    options: ["Calligraphy", "Sculpture", "Painting", "Weaving"],

    answer: 0,

    explanation: "Calligraphy is the art of beautiful handwriting.",
  }),

  createQuestion({
    id: generateId("fine_arts", 22),
    year: 2022,

    question: "Which of the following is a secondary colour?",

    options: ["Red", "Blue", "Green", "Yellow"],

    answer: 2,

    explanation:
      "Green is a secondary colour formed by mixing blue and yellow.",
  }),

  createQuestion({
    id: generateId("fine_arts", 23),
    year: 2021,

    question: "The material used for painting is called",

    options: ["Paint", "Ink", "Clay", "Stone"],

    answer: 0,

    explanation: "Paint is the material used for painting artworks.",
  }),

  createQuestion({
    id: generateId("fine_arts", 24),
    year: 2020,

    question: "Which of the following is NOT a painting tool?",

    options: ["Brush", "Palette knife", "Pencil", "Chisel"],

    answer: 3,

    explanation: "Chisel is used in sculpture, not painting.",
  }),

  createQuestion({
    id: generateId("fine_arts", 25),
    year: 2023,

    question: "The art of making designs on cloth using threads is called",

    options: ["Embroidery", "Painting", "Drawing", "Printing"],

    answer: 0,

    explanation:
      "Embroidery is the art of decorating fabric with needle and thread.",
  }),
  createQuestion({
    id: generateId("fine_arts", 26),
    year: 2022,

    question:
      "The use of different sizes of objects in art to show importance is called",

    options: ["Proportion", "Emphasis", "Perspective", "Rhythm"],

    answer: 2,

    explanation:
      "Perspective helps show depth and importance using size variation.",
  }),

  createQuestion({
    id: generateId("fine_arts", 27),
    year: 2021,

    question: "Which of the following is a form of visual art?",

    options: ["Music", "Dance", "Painting", "Drama"],

    answer: 2,

    explanation: "Painting is a visual art form.",
  }),

  createQuestion({
    id: generateId("fine_arts", 28),
    year: 2020,

    question: "The element of art that refers to surface quality is",

    options: ["Line", "Shape", "Texture", "Value"],

    answer: 2,

    explanation:
      "Texture describes how a surface feels or looks like it feels.",
  }),

  createQuestion({
    id: generateId("fine_arts", 29),
    year: 2023,

    question: "Which of the following is used for mixing colours in painting?",

    options: ["Canvas", "Palette", "Brush", "Easel"],

    answer: 1,

    explanation: "A palette is used to mix paint colours.",
  }),

  createQuestion({
    id: generateId("fine_arts", 30),
    year: 2022,

    question: "The art of creating images using computer software is called",

    options: ["Digital art", "Sculpture", "Calligraphy", "Weaving"],

    answer: 0,

    explanation: "Digital art is created using computers and software.",
  }),

  createQuestion({
    id: generateId("fine_arts", 31),
    year: 2021,

    question: "Which of the following is NOT a primary colour?",

    options: ["Red", "Blue", "Green", "Yellow"],

    answer: 2,

    explanation: "Green is a secondary colour, not primary.",
  }),

  createQuestion({
    id: generateId("fine_arts", 32),
    year: 2020,

    question: "The principle of art that creates unity is",

    options: ["Contrast", "Balance", "Harmony", "Proportion"],

    answer: 2,

    explanation: "Harmony creates unity and visual agreement in artwork.",
  }),

  createQuestion({
    id: generateId("fine_arts", 33),
    year: 2023,

    question: "Which tool is used to draw circles?",

    options: ["Ruler", "Compass", "Brush", "Eraser"],

    answer: 1,

    explanation: "A compass is used to draw circles.",
  }),

  createQuestion({
    id: generateId("fine_arts", 34),
    year: 2022,

    question: "The art of carving designs on wood is called",

    options: ["Weaving", "Sculpture", "Wood carving", "Painting"],

    answer: 2,

    explanation: "Wood carving is the art of shaping wood into designs.",
  }),

  createQuestion({
    id: generateId("fine_arts", 35),
    year: 2021,

    question: "The repetition of lines or shapes in art is known as",

    options: ["Balance", "Rhythm", "Contrast", "Unity"],

    answer: 1,

    explanation: "Rhythm refers to repetition of elements in art.",
  }),
  createQuestion({
    id: generateId("fine_arts", 36),
    year: 2020,

    question: "The tool used for erasing pencil marks is called",

    options: ["Chalk", "Eraser", "Brush", "Palette"],

    answer: 1,

    explanation: "An eraser is used to remove pencil marks.",
  }),

  createQuestion({
    id: generateId("fine_arts", 37),
    year: 2023,

    question: "Which of the following is a tertiary colour?",

    options: ["Blue", "Red", "Yellow-green", "Green"],

    answer: 2,

    explanation:
      "Tertiary colours are formed by mixing a primary and a secondary colour.",
  }),

  createQuestion({
    id: generateId("fine_arts", 38),
    year: 2022,

    question: "The art of arranging objects in a decorative way is called",

    options: ["Design", "Composition", "Still life", "Balance"],

    answer: 2,

    explanation:
      "Still life is the arrangement of objects for artistic study or painting.",
  }),

  createQuestion({
    id: generateId("fine_arts", 39),
    year: 2021,

    question: "Which of the following is NOT a visual art?",

    options: ["Painting", "Sculpture", "Music", "Drawing"],

    answer: 2,

    explanation: "Music is a performing art, not a visual art.",
  }),

  createQuestion({
    id: generateId("fine_arts", 40),
    year: 2020,

    question: "The use of light and dark in drawing is called",

    options: ["Perspective", "Shading", "Proportion", "Texture"],

    answer: 1,

    explanation: "Shading creates light and dark areas in drawings.",
  }),

  createQuestion({
    id: generateId("fine_arts", 41),
    year: 2023,

    question:
      "Which of the following is used to support a canvas while painting?",

    options: ["Easel", "Palette", "Brush", "Chalk"],

    answer: 0,

    explanation: "An easel holds the canvas while an artist paints.",
  }),

  createQuestion({
    id: generateId("fine_arts", 42),
    year: 2022,

    question: "The principle of art that deals with emphasis is",

    options: ["Balance", "Contrast", "Rhythm", "Focus"],

    answer: 3,

    explanation: "Emphasis creates a focal point in artwork.",
  }),

  createQuestion({
    id: generateId("fine_arts", 43),
    year: 2021,

    question: "Which of the following materials is used in sculpture?",

    options: ["Clay", "Paper", "Ink", "Charcoal"],

    answer: 0,

    explanation: "Clay is commonly used in sculpture.",
  }),

  createQuestion({
    id: generateId("fine_arts", 44),
    year: 2020,

    question: "The art of creating patterns on fabric using dye is called",

    options: ["Printing", "Weaving", "Dyeing", "Embroidery"],

    answer: 2,

    explanation: "Dyeing is the process of colouring fabric using dye.",
  }),

  createQuestion({
    id: generateId("fine_arts", 45),
    year: 2023,

    question: "Which of the following is a warm colour?",

    options: ["Blue", "Green", "Yellow", "Purple"],

    answer: 2,

    explanation: "Yellow is considered a warm colour.",
  }),
];
/* =========================================================
QUESTION BANK EXPORT
========================================================= */

const baseQuestionBank = {
  english,
  mathematics,
  physics,
  chemistry,
  biology,
  economics,
  government,
  literature,
  commerce,
  geography,
  crs,
  irs,
  agricultural,
  history,
  computer,
  music,
  french,
  arts,
};
export const questionBank = augmentQuestionBank(baseQuestionBank);
/* =========================================================
AUTO GROUP QUESTIONS BY YEAR
========================================================= */

const groupByYear = (questions) => {
  const grouped = {};

  questions.forEach((q) => {
    if (!q.year) return;

    if (!grouped[q.year]) {
      grouped[q.year] = [];
    }

    grouped[q.year].push(q);
  });

  return grouped;
};
