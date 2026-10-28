import type { CaseRule } from "./types";

export const RULE_NAME: Record<CaseRule, string> = {
  over_intake: "Admissions above intake",
  national_duplicate: "Enrolled in another college",
  not_found: "APAAR ID not found",
  name_match: "Name mismatch",
  late_admission: "Admitted after cut-off",
};

export const VIOLATION_ACTIONS: Record<CaseRule, string[]> = {
  over_intake: [
    "Show-cause notice for excess admissions",
    "Reduce intake by the excess in the next approval cycle",
    "Refer for inspection by the Regional Office",
  ],
  national_duplicate: [
    "Direct the institution to cancel the duplicate admission",
    "Show-cause notice to both institutions",
  ],
  not_found: [
    "Remove the records and seek proof of enrolment",
    "Refer for inspection by the Regional Office",
  ],
  name_match: [
    "Return to institution with proof of identity required",
    "Remove the records from the submission",
  ],
  late_admission: [
    "Cancel the admissions made after the cut-off",
    "Show-cause notice for late admissions",
  ],
};
