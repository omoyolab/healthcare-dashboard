import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/date";

import type { Patient } from "../types";

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-content-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-content">{value ?? "—"}</dd>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-content-muted">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-sm text-content">None recorded</span>
        ) : (
          items.map((item) => <Badge key={item}>{item}</Badge>)
        )}
      </dd>
    </div>
  );
}

export function PatientProfileCard({ patient }: { patient: Patient }) {
  const address = [patient.address_line1, patient.address_line2, patient.city, patient.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <CardTitle>Profile</CardTitle>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail
          label="Date of birth"
          value={`${formatDate(patient.date_of_birth)} (${patient.age})`}
        />
        <Detail label="Blood type" value={patient.blood_type} />
        <Detail label="Email" value={patient.email} />
        <Detail label="Phone" value={patient.phone} />
        <Detail label="Address" value={address || null} />
        <Detail label="Postal code" value={patient.postal_code} />
        <TagList label="Allergies" items={patient.allergies} />
        <TagList label="Conditions" items={patient.conditions} />
      </dl>
    </Card>
  );
}
