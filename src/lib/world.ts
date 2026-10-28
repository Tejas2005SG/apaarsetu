import { gauss, int, mulberry32, pick, type Rng } from "./rng";
import { checkDigit } from "./verhoeff";
import { normalizeName } from "./match";
import type { Case, CaseRow, Decision, Gender, Institution, OtherEnrolment, Programme, RegistryPerson, UploadRow } from "./types";

export const ACADEMIC_YEAR = "2026-27";
export const ADMISSION_CUTOFF = "2026-09-30";
export const ABC_ID = "ABC";
export const ABC_PROGRAMME = "BTECH-CSE";
export const LINKED_STUDENT_INDEX = 0;
export const OFFICER = "S. Menon, Deputy Director (WRO)";
export const PRINCIPAL = "Dr. R. K. Kulkarni, Principal";
export const VERIFIER_ORG = "Infosys Ltd. — Campus Hiring";

export const FEATURE_LABELS = [
  "Admissions above intake",
  "Enrolled in another college",
  "APAAR ID not found",
  "Name mismatch",
  "Admitted after cut-off",
  "Year-on-year growth",
];

const FEMALE = ["Ananya", "Priya", "Sneha", "Pooja", "Kavita", "Neha", "Aishwarya", "Riya", "Shruti", "Meera", "Divya", "Nikita",
  "Pallavi", "Sakshi", "Tanvi", "Isha", "Aditi", "Gauri", "Anjali", "Swati", "Rutuja", "Vaishnavi", "Fatima", "Ayesha", "Harpreet",
  "Simran", "Deepika", "Revathi", "Keerthana", "Mrunal"];
const MALE = ["Rahul", "Aditya", "Rohan", "Arjun", "Siddharth", "Omkar", "Pranav", "Vikram", "Karan", "Akash", "Saurabh", "Nikhil",
  "Yash", "Tejas", "Harsh", "Abhishek", "Varun", "Kunal", "Amit", "Suresh", "Gaurav", "Imran", "Gurpreet", "Manish", "Ravi",
  "Karthik", "Vivek", "Chinmay", "Atharva", "Soham"];
const SURNAMES = ["Sharma", "Patil", "Kulkarni", "Deshmukh", "Joshi", "Pawar", "Jadhav", "Shinde", "More", "Gaikwad", "Chavan",
  "Kale", "Bhosale", "Iyer", "Nair", "Reddy", "Rao", "Gupta", "Verma", "Singh", "Yadav", "Mishra", "Shaikh", "Khan", "Pandey",
  "Agarwal", "Mehta", "Shah", "Desai", "Naik"];
const CATEGORIES: [string, number][] = [["GEN", 0.4], ["OBC", 0.3], ["SC", 0.12], ["ST", 0.06], ["EWS", 0.12]];

const CITIES: [string, string][] = [
  ["Nagpur", "Maharashtra"], ["Nashik", "Maharashtra"], ["Aurangabad", "Maharashtra"], ["Mumbai", "Maharashtra"],
  ["Kolhapur", "Maharashtra"], ["Bengaluru", "Karnataka"], ["Mysuru", "Karnataka"], ["Chennai", "Tamil Nadu"],
  ["Coimbatore", "Tamil Nadu"], ["Hyderabad", "Telangana"], ["Warangal", "Telangana"], ["Jaipur", "Rajasthan"],
  ["Kota", "Rajasthan"], ["Lucknow", "Uttar Pradesh"], ["Kanpur", "Uttar Pradesh"], ["Greater Noida", "Uttar Pradesh"],
  ["Bhopal", "Madhya Pradesh"], ["Indore", "Madhya Pradesh"], ["Ahmedabad", "Gujarat"], ["Vadodara", "Gujarat"],
  ["Kolkata", "West Bengal"], ["Patna", "Bihar"], ["Bhubaneswar", "Odisha"], ["Kochi", "Kerala"], ["Mohali", "Punjab"],
  ["New Delhi", "Delhi"], ["Guwahati", "Assam"], ["Dehradun", "Uttarakhand"], ["Raipur", "Chhattisgarh"], ["Ranchi", "Jharkhand"],
];
const NAME_ROOTS = ["Shivaji", "Saraswati", "Ramanujan", "Vivekananda", "Tagore", "Aryabhatta", "Bhaskara", "Narmada", "Godavari",
  "Kaveri", "Sahyadri", "Vindhya", "Satpura", "Yamuna", "Krishna", "Tapi", "Sindhu", "Brahmaputra", "Nalanda", "Takshashila",
  "Chanakya", "Panini", "Sushruta", "Varahamihira", "Kalidas", "Ashoka", "Harsha", "Maitreyi", "Gargi", "Lokmanya", "Sardar",
  "Netaji", "Deshbandhu", "Rajarshi", "Mahatma", "Swami Dayanand", "Acharya", "Visvesvaraya", "Bhabha"];
const NAME_TAILS = ["Institute of Technology", "College of Engineering", "Institute of Engineering & Technology", "Engineering College",
  "Institute of Management Studies", "Institute of Technology & Research"];

function makeApaar(rnd: Rng, used: Set<string>) {
  for (;;) {
    let body = String(int(rnd, 1, 9));
    for (let i = 0; i < 10; i++) body += String(int(rnd, 0, 9));
    const id = body + checkDigit(body);
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
}

function weighted(rnd: Rng, items: [string, number][]) {
  let r = rnd();
  for (const [v, w] of items) {
    if ((r -= w) <= 0) return v;
  }
  return items[0][0];
}

function dateBetween(rnd: Rng, from: string, to: string) {
  const a = Date.parse(from);
  const b = Date.parse(to);
  const d = new Date(a + rnd() * (b - a));
  return d.toISOString().slice(0, 10);
}

function person(rnd: Rng, used: Set<string>, gender?: Gender): RegistryPerson {
  const g: Gender = gender ?? (rnd() < 0.44 ? "F" : "M");
  const first = g === "F" ? pick(rnd, FEMALE) : pick(rnd, MALE);
  return { apaarId: makeApaar(rnd, used), name: `${first} ${pick(rnd, SURNAMES)}`, dob: dateBetween(rnd, "2005-01-01", "2007-12-31"), gender: g };
}

function transpose(id: string) {
  for (let i = 3; i < 10; i++) {
    if (id[i] !== id[i + 1]) return id.slice(0, i) + id[i + 1] + id[i] + id.slice(i + 2);
  }
  return id;
}

export const SAMPLE_SPECIAL = {
  variants: [5, 17, 29, 41, 52],
  apaarTypo: [12, 47, 88],
  dobInvalid: [23, 64],
  dobMismatch: [35, 101],
  genderMissing: [77],
  admissionMissing: [120],
  duplicate: [8, 54, 93, 130],
  notFound: [19, 71, 111],
  nameMismatch: [44, 99],
  late: [126],
  tfw: [2, 15, 33, 58, 80, 105],
};

export interface World {
  institutions: Institution[];
  byId: Record<string, Institution>;
  registry: Map<string, RegistryPerson>;
  registryByNameDob: Map<string, string>;
  nationalIndex: Map<string, OtherEnrolment>;
  sampleRows: UploadRow[];
  seedCases: Case[];
  seedDecisions: Record<string, Decision>;
  weekly: { week: string; records: number; institutions: number }[];
  linkedStudent: RegistryPerson;
}

let cached: World | null = null;
const SEED_SCALE = 0.45;

export function getWorld(): World {
  if (cached) return cached;
  const rnd = mulberry32(26263);
  const used = new Set<string>();

  const abcProgrammes: Programme[] = [
    { code: ABC_PROGRAMME, name: "B.Tech Computer Science & Engineering", approved: 120, limits: { TFW: 6, PMSSS: 2, "FN/OCI/PIO": 6 } },
    { code: "BTECH-ECE", name: "B.Tech Electronics & Communication", approved: 60, limits: { TFW: 3, PMSSS: 1, "FN/OCI/PIO": 3 } },
    { code: "BTECH-ME", name: "B.Tech Mechanical Engineering", approved: 60, limits: { TFW: 3, PMSSS: 1, "FN/OCI/PIO": 3 } },
    { code: "MBA", name: "MBA", approved: 60, limits: { TFW: 3, PMSSS: 1, "FN/OCI/PIO": 3 } },
  ];
  const abc: Institution = {
    id: ABC_ID, aicteId: "1-4412678903", name: "ABC Institute of Technology", city: "Pune", state: "Maharashtra",
    type: "Engineering & Technology", programmes: abcProgrammes, studentsReported: 0, verified: 0, features: [],
  };

  const institutions: Institution[] = [abc];
  const usedNames = new Set<string>();
  for (let i = 0; i < 39; i++) {
    const [city, state] = CITIES[i % CITIES.length];
    let name = "";
    do name = `${pick(rnd, NAME_ROOTS)} ${pick(rnd, NAME_TAILS)}`; while (usedNames.has(name));
    usedNames.add(name);
    const big = rnd() < 0.4;
    const programmes: Programme[] = [
      { code: "BTECH-CSE", name: "B.Tech Computer Science & Engineering", approved: big ? 180 : 120, limits: { TFW: big ? 9 : 6, PMSSS: 2, "FN/OCI/PIO": 6 } },
      { code: "BTECH-ECE", name: "B.Tech Electronics & Communication", approved: 60, limits: { TFW: 3, PMSSS: 1, "FN/OCI/PIO": 3 } },
      { code: "BTECH-ME", name: "B.Tech Mechanical Engineering", approved: 60, limits: { TFW: 3, PMSSS: 1, "FN/OCI/PIO": 3 } },
    ];
    const reported = int(rnd, 700, 2600);
    let features = [
      Math.max(0, gauss(rnd, 0.3, 0.9)),
      Math.abs(gauss(rnd, 0.15, 0.1)),
      Math.abs(gauss(rnd, 0.25, 0.14)),
      Math.abs(gauss(rnd, 0.4, 0.2)),
      Math.abs(gauss(rnd, 0.3, 0.18)),
      gauss(rnd, 4, 4),
    ].map((v) => Math.round(v * 100) / 100);
    if (i === 6) features = [6.1, 0.22, 0.31, 0.52, 0.4, 11.2];
    if (i === 17) features = [0.4, 1.35, 0.28, 0.61, 0.25, 6.4];
    if (i === 28) features = [2.8, 0.3, 0.9, 1.1, 0.7, 9.1];
    institutions.push({
      id: `I${String(i + 1).padStart(3, "0")}`,
      aicteId: `1-${int(rnd, 4000000000, 4999999999)}`,
      name: `${name}, ${city}`, city, state, type: name.includes("Management") ? "Management" : "Engineering & Technology",
      programmes, studentsReported: reported, verified: 0, features,
    });
  }

  const registry = new Map<string, RegistryPerson>();
  const nationalIndex = new Map<string, OtherEnrolment>();
  const others = institutions.slice(1);

  const S = SAMPLE_SPECIAL;
  const people: RegistryPerson[] = [];
  for (let i = 0; i < 138; i++) people.push(person(rnd, used));
  people[0] = { ...people[0], name: "Ananya Sharma", gender: "F", dob: "2007-03-14" };
  people[5] = { ...people[5], name: "Mohammed Arif Shaikh", gender: "M" };
  people[17] = { ...people[17], name: "Mohammad Salim Khan", gender: "M" };
  people[29] = { ...people[29], name: "Lakshmi Iyer", gender: "F" };
  people[41] = { ...people[41], name: "Srikant Kulkarni", gender: "M" };
  people[52] = { ...people[52], name: "Omkar Patil", gender: "M" };

  const sampleRows: UploadRow[] = people.map((p, i) => {
    const row: UploadRow = {
      rowNo: i + 1,
      apaarId: p.apaarId,
      name: p.name,
      dob: p.dob,
      gender: p.gender,
      category: weighted(rnd, CATEGORIES),
      quota: S.tfw.includes(i) ? "TFW" : "Regular",
      admissionDate: dateBetween(rnd, "2026-07-20", "2026-09-12"),
    };
    if (i === 5) row.name = "Mohd. Arif Shaikh";
    if (i === 17) row.name = "Md Salim Khan";
    if (i === 29) row.name = "Laxmi Iyer";
    if (i === 41) row.name = "Shrikant Kulkarni";
    if (i === 52) row.name = "Patil Omkar";
    if (S.apaarTypo.includes(i)) row.apaarId = transpose(p.apaarId);
    if (i === S.dobInvalid[0]) row.dob = `31-02-${p.dob.slice(0, 4)}`;
    if (i === S.dobInvalid[1]) row.dob = `${p.dob.slice(0, 4)}-13-${p.dob.slice(8, 10)}`;
    if (S.dobMismatch.includes(i)) {
      const d = new Date(Date.parse(p.dob) + 86400000 * (i === 35 ? 3 : -40));
      row.dob = d.toISOString().slice(0, 10);
    }
    if (S.genderMissing.includes(i)) row.gender = "";
    if (S.admissionMissing.includes(i)) row.admissionDate = "";
    if (S.nameMismatch.includes(i)) {
      const alt = person(rnd, new Set(), p.gender);
      row.name = i === 44 ? (p.gender === "F" ? "Pooja Bhandari" : "Rakesh Bhandari") : alt.name.split(" ")[0] + " Thakur";
    }
    if (S.late.includes(i)) row.admissionDate = "2026-10-14";
    return row;
  });
  people.forEach((p, i) => {
    if (!S.notFound.includes(i)) registry.set(p.apaarId, p);
  });
  S.duplicate.forEach((i, k) => {
    const inst = others[[3, 11, 6, 21][k]];
    nationalIndex.set(people[i].apaarId, {
      institutionId: inst.id,
      programme: pick(rnd, ["B.Tech Computer Engineering", "B.Tech Information Technology", "B.Tech Computer Science & Engineering"]),
      admittedOn: dateBetween(rnd, "2026-07-15", "2026-08-10"),
    });
  });
  for (let i = 0; i < 400; i++) {
    const p = person(rnd, used);
    registry.set(p.apaarId, p);
  }
  const registryByNameDob = new Map<string, string>();
  registry.forEach((p) => registryByNameDob.set(`${normalizeName(p.name)}|${p.dob}`, p.apaarId));

  const seedCases: Case[] = [];
  const seedDecisions: Record<string, Decision> = {};
  const fakeRow = (detail: string): CaseRow => {
    const p = person(rnd, used);
    return { apaarId: p.apaarId, name: p.name, detail };
  };
  let caseNo = 1001;
  for (const inst of others) {
    const [excess, dup, nf, nm, late] = inst.features;
    const n = inst.studentsReported;
    const cse = inst.programmes[0];
    const created = () => new Date(Date.parse("2026-10-05") + rnd() * 20 * 86400000).toISOString();
    const add = (c: Omit<Case, "id" | "institutionId" | "source" | "createdAt">) => {
      const id = `C-${caseNo++}`;
      seedCases.push({ ...c, id, institutionId: inst.id, source: "seed", createdAt: created() });
      if (rnd() < 0.22) {
        seedDecisions[id] = {
          outcome: rnd() < 0.7 ? "cleared" : "violation",
          action: undefined,
          remarks: "Checked against the institution's admission register and supporting documents.",
          officer: OFFICER,
          ts: created(),
        };
      }
    };
    const xs = Math.round((excess / 100) * cse.approved);
    if (xs >= 2) {
      add({ programmeCode: cse.code, rule: "over_intake", title: `${xs} admissions above approved intake`,
        summary: `${cse.name}: ${cse.approved + xs} regular admissions against ${cse.approved} approved seats.`,
        rows: [], excess: xs });
    }
    const rows = (count: number, detail: () => string) => Array.from({ length: count }, () => fakeRow(detail()));
    const K = SEED_SCALE;
    const dupN = Math.round((dup / 100) * n * K);
    if (dupN > 0) {
      add({ programmeCode: cse.code, rule: "national_duplicate", title: `${dupN} student${dupN > 1 ? "s" : ""} enrolled in another college`,
        summary: "The same APAAR ID is active in another AICTE-approved institution for this year.",
        rows: rows(dupN, () => `Also enrolled at ${pick(rnd, others).name}`) });
    }
    const nfN = Math.round((nf / 100) * n * K);
    if (nfN > 0) {
      add({ programmeCode: cse.code, rule: "not_found", title: `${nfN} APAAR ID${nfN > 1 ? "s" : ""} not found in registry`,
        summary: "The IDs pass the format check but no matching APAAR record exists.", rows: rows(nfN, () => "No APAAR record") });
    }
    const nmN = Math.round((nm / 100) * n * 0.5 * K);
    if (nmN > 0) {
      add({ programmeCode: cse.code, rule: "name_match", title: `${nmN} name${nmN > 1 ? "s" : ""} do not match APAAR`,
        summary: "The uploaded name differs from the APAAR record beyond spelling variation.",
        rows: rows(nmN, () => `Match score ${(0.55 + rnd() * 0.3).toFixed(2)}`) });
    }
    const lateN = Math.round((late / 100) * n * 0.5 * K);
    if (lateN > 0) {
      add({ programmeCode: cse.code, rule: "late_admission", title: `${lateN} admission${lateN > 1 ? "s" : ""} after the cut-off date`,
        summary: `Admitted after ${ADMISSION_CUTOFF}, the last date for admissions this year.`,
        rows: rows(lateN, () => `Admitted on ${dateBetween(rnd, "2026-10-01", "2026-10-20")}`) });
    }
    const flagged = seedCases.filter((c) => c.institutionId === inst.id).reduce((s, c) => s + c.rows.length, 0);
    inst.verified = n - flagged;
  }

  const weekly: World["weekly"] = [];
  let total = 0;
  let insts = 0;
  const start = Date.parse("2026-07-06");
  for (let w = 0; w < 17; w++) {
    const peak = Math.exp(-Math.pow((w - 8) / 4, 2));
    total += Math.round(1200 + peak * 4200 + rnd() * 500);
    insts = Math.min(39, insts + Math.round(1 + peak * 4));
    weekly.push({ week: new Date(start + w * 7 * 86400000).toISOString().slice(0, 10), records: total, institutions: insts });
  }

  const byId = Object.fromEntries(institutions.map((x) => [x.id, x]));
  cached = { institutions, byId, registry, registryByNameDob, nationalIndex, sampleRows, seedCases, seedDecisions, weekly, linkedStudent: people[0] };
  return cached;
}

export function programmeOf(institutionId: string, code: string) {
  const inst = getWorld().byId[institutionId];
  return inst?.programmes.find((p) => p.code === code);
}
