export interface PatientSummary {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export type PatientChoice =
  | { kind: "existing"; patient: PatientSummary }
  | { kind: "new"; firstName: string; lastName: string; email: string; phone: string };

export interface NewPatientDraft {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
}

export interface AppointmentDraft {
  physioId: string;
  date: string;
  startUtc: string;
  phone: string;
  phoneCountry: string;
  reasonForVisit: string;
  commentsForPhysiotherapist: string;
  sendConfirmation: boolean;
}

export interface CreatedAppointment {
  id: string;
  reference: string;
  patient: { id: string; fullName: string; email: string; phone: string; created: boolean };
  physiotherapist: { id: string; fullName: string; specialisation: string | null };
  date: string;
  startTime: string;
  endTime: string;
  duration: 45;
  notification: "sent" | "failed" | "not_requested" | "not_configured";
  receptionNotification: "sent" | "failed" | "not_requested" | "not_configured";
  calendar: "created" | "failed" | "not_connected";
}
