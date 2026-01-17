/**
 * Sample test data extracted from JSONL recordings
 * These fixtures represent real race data for unit testing
 */

export const sampleGateConfig = {
  // 24 gates: NNRNNRNRNNNRNNRNRNNRNNRN
  normal24: 'NNRNNRNRNNNRNNRNRNNRNNRN',
  // 18 gates for shorter course
  normal18: 'NNRNNRNRNNNRNNRNRN',
}

export const sampleGatesStrings = {
  // OnCourse format (comma-separated)
  onCourse: {
    allClear: '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0',
    withPenalties: '0,0,0,2,0,0,2,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0',
    partial: '0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,,',
    empty: '',
    allEmpty: ',,,,,,,,,,,,,,,,,,,,,,,,',
  },
  // Results format (space-separated, may have multiple spaces)
  results: {
    allClear: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
    withPenalties: '0 0 0 2 0 0 2 0 50 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
    multipleMisses: '50 0 0 2 0 50 2 0 0 0 0 2 0 0 0 50 0 0 0 0 0 0 0 0',
    // Real C123 data has double spaces between values
    doubleSpaces: '0  0  0  2  0  0  2  0  50  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0',
  },
}

export const sampleOnCourseCompetitor = {
  bib: '10',
  name: 'Test Competitor',
  club: 'Test Club',
  nat: 'CZE',
  position: 1,
  gates: '0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,,',
  pen: 54,
  time: '102.45',
  completed: false,
  rank: 0,
}

export const sampleOnCourseCompetitorFinished = {
  ...sampleOnCourseCompetitor,
  bib: '11',
  name: 'Finished Competitor',
  gates: '0,0,0,2,0,0,2,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0',
  completed: true,
  rank: 1,
  time: '98.32',
}

export const sampleResultsRow = {
  rank: 1,
  bib: '42',
  name: 'Result Competitor',
  club: 'RC Club',
  nat: 'SVK',
  startOrder: 5,
  gates: '0 0 0 2 0 0 2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  pen: 4,
  time: '95.21',
  total: '99.21',
  behind: '+0.00',
  status: undefined,
}

export const sampleResultsRowDNS = {
  ...sampleResultsRow,
  rank: 0,
  bib: '99',
  name: 'DNS Competitor',
  gates: '',
  pen: 0,
  time: '',
  total: '',
  behind: '',
  status: 'DNS',
}

export const sampleScheduleRace = {
  raceId: 'race-001',
  mainTitle: 'K1m',
  subTitle: 'střední trať',
  shortTitle: 'K1m - střední trať - 1. jízda',
  raceOrder: 1,
  status: 4, // InProgress
  onCourseCount: 3,
}

export const sampleScheduleRaces = [
  sampleScheduleRace,
  {
    raceId: 'race-002',
    mainTitle: 'C1m',
    subTitle: 'střední trať',
    shortTitle: 'C1m - střední trať - 1. jízda',
    raceOrder: 2,
    status: 2, // Ready
    onCourseCount: 0,
  },
  {
    raceId: 'race-003',
    mainTitle: 'K1w',
    subTitle: 'střední trať',
    shortTitle: 'K1w - střední trať - 1. jízda',
    raceOrder: 3,
    status: 1, // NotStarted
    onCourseCount: 0,
  },
]

export const sampleGateGroups = [
  {
    id: 'group-1',
    name: 'Gates 1-8',
    gates: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#3b82f6',
    shortcut: 1,
  },
  {
    id: 'group-2',
    name: 'Gates 9-16',
    gates: [9, 10, 11, 12, 13, 14, 15, 16],
    color: '#10b981',
    shortcut: 2,
  },
  {
    id: 'group-3',
    name: 'Gates 17-24',
    gates: [17, 18, 19, 20, 21, 22, 23, 24],
    color: '#f59e0b',
    shortcut: 3,
  },
]
