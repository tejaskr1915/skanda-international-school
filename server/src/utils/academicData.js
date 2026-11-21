// Academic Metadata & Rules for Skanda International School

const BOARD_INFO = {
  CBSE: {
    name: 'Central Board of Secondary Education (CBSE)',
    code: 'CBSE',
    classesOffered: 'Nursery to Grade 12',
    medium: 'English',
    annualFee: 85000,
    seatsLeft: 34,
    status: 'AVAILABLE',
    curriculumOverview: 'NCERT aligned curriculum emphasizing holistic skill-building, experiential STEM learning, national competitive exam readiness (JEE/NEET/CUET), and formative continuous evaluation.',
    syllabusUrl: '/documents/syllabus-cbse-2026.pdf',
    textbookList: [
      'NCERT Honeycomb & Honeydew English',
      'NCERT Mathematics Standard 2026',
      'NCERT Science In-Depth with Lab Manual',
      'NCERT Social Sciences (History, Geography, Civics)'
    ]
  },
  ICSE_ISC: {
    name: 'Council for the Indian School Certificate Examinations (ICSE/ISC)',
    code: 'ICSE_ISC',
    classesOffered: 'Grade 1 to Grade 12',
    medium: 'English',
    annualFee: 110000,
    seatsLeft: 8,
    status: 'LIMITED_SEATS',
    curriculumOverview: 'Comprehensive and rigorous syllabus with heavy emphasis on practical application, deep English literature mastery, lab experiments, and globally recognized ICSE/ISC council pattern.',
    syllabusUrl: '/documents/syllabus-icse-2026.pdf',
    textbookList: [
      'CISCE Total English & Literature Anthology',
      'Selina Concise Mathematics & Sciences',
      'Frank Modern Certificate History & Civics',
      'Council Environmental Applications'
    ]
  },
  STATE: {
    name: 'State Education Board (Karnataka / Regional)',
    code: 'STATE',
    classesOffered: 'Grade 1 to Grade 10',
    medium: 'English / Kannada',
    annualFee: 48000,
    seatsLeft: 0,
    status: 'WAITLIST',
    curriculumOverview: 'State prescribed Department of Public Instruction curriculum balanced with state language proficiency, culture, and standardized board testing.',
    syllabusUrl: '/documents/syllabus-state-2026.pdf',
    textbookList: [
      'State Textbook Directorate Reader & Grammar',
      'State Directorate Mathematics with Exercises',
      'Karnataka State Science & Environmental Reader',
      'First Language Kannada / Regional Reader'
    ]
  }
};

const CLASS_OPTIONS = [
  { value: 'Nursery', label: 'Nursery', minAge: 3, maxAge: 4, type: 'SCHOOL', boards: ['CBSE'] },
  { value: 'LKG', label: 'LKG (Lower Kindergarten)', minAge: 4, maxAge: 5, type: 'SCHOOL', boards: ['CBSE'] },
  { value: 'UKG', label: 'UKG (Upper Kindergarten)', minAge: 5, maxAge: 6, type: 'SCHOOL', boards: ['CBSE'] },
  { value: 'Grade 1', label: 'Grade 1', minAge: 6, maxAge: 7, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 2', label: 'Grade 2', minAge: 7, maxAge: 8, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 3', label: 'Grade 3', minAge: 8, maxAge: 9, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 4', label: 'Grade 4', minAge: 9, maxAge: 10, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 5', label: 'Grade 5', minAge: 10, maxAge: 11, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 6', label: 'Grade 6', minAge: 11, maxAge: 12, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 7', label: 'Grade 7', minAge: 12, maxAge: 13, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 8', label: 'Grade 8', minAge: 13, maxAge: 14, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 9', label: 'Grade 9', minAge: 14, maxAge: 15, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 10', label: 'Grade 10', minAge: 15, maxAge: 16, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC', 'STATE'] },
  { value: 'Grade 11', label: 'Grade 11 (PUC / Senior Secondary)', minAge: 16, maxAge: 18, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC'] },
  { value: 'Grade 12', label: 'Grade 12 (Senior Secondary)', minAge: 17, maxAge: 19, type: 'SCHOOL', boards: ['CBSE', 'ICSE_ISC'] },
  { value: 'B.Tech Computer Science', label: 'B.Tech - Computer Science & Engineering', minAge: 17, maxAge: 25, type: 'COLLEGE', boards: [] },
  { value: 'B.Sc Biotechnology', label: 'B.Sc - Biotechnology & Life Sciences', minAge: 17, maxAge: 25, type: 'COLLEGE', boards: [] },
  { value: 'B.Com Honors', label: 'B.Com - Financial Accounting & FinTech', minAge: 17, maxAge: 25, type: 'COLLEGE', boards: [] },
  { value: 'BBA', label: 'BBA - Global Business & Analytics', minAge: 17, maxAge: 25, type: 'COLLEGE', boards: [] }
];

function getSubjectsForClass(classOrCourse, board) {
  const isKindergarten = ['Nursery', 'LKG', 'UKG'].includes(classOrCourse);
  const isPrimary = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'].includes(classOrCourse);
  const isMiddleOrSecondary = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(classOrCourse);
  const isSeniorSec = ['Grade 11', 'Grade 12'].includes(classOrCourse);

  if (isKindergarten) {
    return {
      type: 'FIXED',
      description: 'Foundational Early Childhood curriculum focused on play, phonics, and motor skill development.',
      compulsory: ['English Phonics & Early Reading', 'Early Math & Number Sense', 'Environmental Discovery', 'Visual Arts & Rhymes', 'Physical Movement & Play']
    };
  }

  if (isPrimary) {
    return {
      type: 'FIXED',
      description: 'Classes 1 to 5: Standard foundational subjects prescribed across boards.',
      compulsory: ['English Language & Literature', 'Mathematics', 'Environmental Studies (EVS)', 'Second Language (Hindi / Regional)', 'Art, Music & Physical Education', 'Basic Computer Foundations']
    };
  }

  if (isMiddleOrSecondary) {
    return {
      type: 'COMPULSORY_WITH_LANGUAGES',
      description: 'Classes 6 to 10: Core compulsory subjects + choice of Second & Third Languages.',
      compulsory: [
        'English Language & Literature',
        'Mathematics',
        'Science (Physics, Chemistry, Biology)',
        'Social Science (History, Civics, Geography, Economics)',
        'Information & Communications Technology (ICT)'
      ],
      languageChoices: ['Hindi Course-A', 'Kannada (State Language)', 'Sanskrit', 'French (Foreign Language)', 'German'],
      maxLanguageSelection: 1
    };
  }

  if (isSeniorSec) {
    return {
      type: 'STREAM_COMBINATIONS',
      description: 'Classes 11 & 12: Stream & Elective Combinations aligned with national boards.',
      streams: [
        {
          id: 'science-pcmc',
          name: 'Science - PCM + Computer Science (Engineering Focus)',
          compulsory: ['English Core', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science (Python & SQL)']
        },
        {
          id: 'science-pcmb',
          name: 'Science - PCM + Biology (Medical / Research Focus)',
          compulsory: ['English Core', 'Physics', 'Chemistry', 'Mathematics', 'Biology']
        },
        {
          id: 'commerce',
          name: 'Commerce - Accounts & Applied Mathematics',
          compulsory: ['English Core', 'Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics / Informatics Practices']
        },
        {
          id: 'humanities',
          name: 'Humanities - Liberal Arts & Social Sciences',
          compulsory: ['English Core', 'History', 'Political Science', 'Psychology', 'Sociology / Economics']
        }
      ]
    };
  }

  // College Courses
  return {
    type: 'COLLEGE_SEMESTER',
    description: 'Undergraduate Semester Modules & Core Specialization Papers.',
    compulsory: [
      'Core Discipline Fundamentals I & II',
      'Advanced Mathematics & Analytical Thinking',
      'Hands-on Practical Laboratory & Workshop',
      'Professional Communication & Technical Writing',
      'Ethics, Environmental Sustainability & Research Projects'
    ]
  };
}

function validateAgeEligibility(dobString, classOrCourse) {
  if (!dobString || !classOrCourse) return { valid: true };

  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    return { valid: false, message: 'Invalid Date of Birth provided.' };
  }

  // Target academic cutoff date: June 1st 2026
  const targetDate = new Date('2026-06-01');
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }

  const option = CLASS_OPTIONS.find(c => c.value === classOrCourse);
  if (option) {
    if (age < option.minAge) {
      return {
        valid: false,
        age,
        message: `Applicant will be ${age} years old by June 1, 2026. Minimum required age for ${classOrCourse} is ${option.minAge} years.`
      };
    }
    if (option.maxAge && age > option.maxAge + 3) {
      return {
        valid: false,
        age,
        message: `Applicant age (${age} years) exceeds standard age bracket for ${classOrCourse} (max ${option.maxAge} years). Special principal waiver required.`
      };
    }
  }

  return { valid: true, age };
}

module.exports = {
  BOARD_INFO,
  CLASS_OPTIONS,
  getSubjectsForClass,
  validateAgeEligibility
};
