import { AppointmentsTable } from "@/components/admin/AppointmentsTable";

export default function AdminAppointmentsPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Appointments
      </h1>
      <AppointmentsTable />
    </main>
  );
}
