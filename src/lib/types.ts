export type Gender = "M" | "F" | "O";
export type Quota = "Regular" | "TFW" | "PMSSS" | "FN/OCI/PIO";
export const QUOTAS: Quota[] = ["Regular", "TFW", "PMSSS", "FN/OCI/PIO"];

export interface UploadRow {
  rowNo: number;
  apaarId: string;
  name: string;
  dob: string;
  gender: string;
  category: string;
  quota: string;
  admissionDate: string;
}

export type EditableField = "apaarId" | "name" | "dob" | "gender" | "category" | "quota" | "admissionDate";

export interface RegistryPerson {
  apaarId: string;
  name: string;
  dob: string;
  gender: Gender;
}

export type RuleId =
  | "required"
  | "apaar_format"
  | "dob_format"
  | "quota_value"
  | "file_duplicate"
  | "not_found"
  | "name_match"
  | "dob_match"
  | "gender_match"
  | "national_duplicate"
  | "late_admission";

export type Severity = "fix" | "review";

export interface Check {
  rule: RuleId;
  ok: boolean;
  severity: Severity;
  message: string;
  field?: EditableField;
}

export type RowStatus = "accepted" | "fix" | "review";

export interface Suggestion {
  field: EditableField;
  value: string;
  reason: string;
}

export interface OtherEnrolment {
  institutionId: string;
  programme: string;
  admittedOn: string;
}

export interface RowResult {
  row: UploadRow;
  status: RowStatus;
  checks: Check[];
  failed: Check[];
  matchScore?: number;
  matchNote?: string;
  registryName?: string;
  suggestions: Suggestion[];
  other?: OtherEnrolment;
}

export interface LedgerLine {
  quota: Quota;
  admitted: number;
  limit: number;
}

export interface Ledger {
  approved: number;
  lines: LedgerLine[];
  regular: number;
  excess: number;
  supernumeraryExcess: number;
}

export interface Programme {
  code: string;
  name: string;
  approved: number;
  limits: Record<Exclude<Quota, "Regular">, number>;
}

export interface Institution {
  id: string;
  aicteId: string;
  name: string;
  city: string;
  state: string;
  type: string;
  programmes: Programme[];
  studentsReported: number;
  verified: number;
  features: number[];
}

export interface Submission {
  id: string;
  institutionId: string;
  programmeCode: string;
  fileName: string;
  uploadedAt: string;
  signedBy: string;
  results: RowResult[];
  ledger: Ledger;
  round: number;
  durationMs: number;
}

export interface RegisterRecord {
  apaarId: string;
  name: string;
  dob: string;
  gender: string;
  category: string;
  institutionId: string;
  programmeCode: string;
  quota: string;
  admissionDate: string;
  addedAt: string;
  version: number;
  source: "upload" | "officer" | "correction";
}

export type CaseRule = "over_intake" | "national_duplicate" | "not_found" | "name_match" | "late_admission";

export interface CaseRow {
  apaarId: string;
  name: string;
  detail: string;
  result?: RowResult;
}

export interface Case {
  id: string;
  institutionId: string;
  programmeCode: string;
  rule: CaseRule;
  title: string;
  summary: string;
  rows: CaseRow[];
  excess?: number;
  createdAt: string;
  source: "seed" | "live";
  submissionId?: string;
}

export type CaseOutcome = "cleared" | "violation" | "superseded";

export interface Decision {
  outcome: CaseOutcome;
  action?: string;
  remarks: string;
  officer: string;
  ts: string;
}

export type ConsentStatus = "pending" | "approved" | "declined" | "revoked";

export type ShareField = "name" | "dob" | "institution" | "programme" | "admissionYear" | "status";

export interface ConsentRequest {
  id: string;
  verifierOrg: string;
  verifierType: string;
  apaarId: string;
  purpose: string;
  fields: ShareField[];
  status: ConsentStatus;
  createdAt: string;
  decidedAt?: string;
  expiresAt?: string;
  token?: string;
  sharedFields?: ShareField[];
}

export interface Correction {
  id: string;
  apaarId: string;
  field: "name" | "dob" | "gender" | "category";
  current: string;
  proposed: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
}

export interface Notice {
  id: string;
  institutionId: string;
  caseId: string;
  title: string;
  action: string;
  remarks: string;
  ts: string;
  acknowledged: boolean;
}

export interface AuditEntry {
  seq: number;
  ts: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  prevHash: string;
  hash: string;
}

export interface Verification {
  id: string;
  consentId?: string;
  ts: string;
  valid: boolean;
  summary: string;
  ms: number;
}
