import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { createTransport, sendMail };
});

vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("server-only", () => ({}));

const appointment = {
  event: "booking_created" as const,
  reference: "APT-123456",
  patientName: "Alex Patient",
  patientEmail: "patient@example.test",
  patientPhone: "+264811234567",
  physiotherapistName: "Dr Example",
  physiotherapistEmail: "doctor@example.test",
  date: "2026-10-05",
  startTime: "09:30",
  endTime: "10:15",
  reasonForVisit: "Back pain",
  status: "confirmed",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SMTP_USER", "clinic@gmail.com");
  vi.stubEnv("SMTP_PASSWORD", "not a real password");
  vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
  vi.stubEnv("SMTP_PORT", "465");
  vi.stubEnv("SMTP_FROM", "");
  vi.stubEnv("RECEPTION_EMAIL", "reception@example.test");
  sendMail.mockReset().mockResolvedValue({ messageId: "test-message" });
  createTransport.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("notifyAppointment", () => {
  it("sends client and receptionist mail through SMTP, never to the physiotherapist", async () => {
    const { notifyAppointment } = await import("@/lib/notify");

    const result = await notifyAppointment(appointment);

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "clinic@gmail.com", pass: "notarealpassword" },
    }));
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map(([message]) => message.to)).toEqual([
      "patient@example.test",
      "reception@example.test",
    ]);
    expect(JSON.stringify(sendMail.mock.calls)).not.toContain("doctor@example.test");
    expect(result).toEqual({ patient: "sent", reception: "sent" });
  });

  it("still sends the receptionist copy when patient confirmation is disabled", async () => {
    const { notifyAppointment } = await import("@/lib/notify");

    const result = await notifyAppointment({ ...appointment, sendPatient: false });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe("reception@example.test");
    expect(result).toEqual({ patient: "not_requested", reception: "sent" });
  });

  it("does not send through another provider when SMTP is unconfigured", async () => {
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASSWORD", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { notifyAppointment } = await import("@/lib/notify");

    const result = await notifyAppointment(appointment);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(result).toEqual({ patient: "not_configured", reception: "not_configured" });
  });

  it("retries a failed patient email, then still sends to reception", async () => {
    sendMail
      .mockRejectedValueOnce(new Error("temporary transport failure"))
      .mockRejectedValueOnce(new Error("transport unavailable"));
    const { notifyAppointment } = await import("@/lib/notify");

    const result = await notifyAppointment(appointment);

    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(sendMail.mock.calls.map(([message]) => message.to)).toEqual([
      "patient@example.test",
      "patient@example.test",
      "reception@example.test",
    ]);
    expect(result).toEqual({ patient: "failed", reception: "sent" });
  });
});
