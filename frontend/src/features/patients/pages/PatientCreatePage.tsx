import { useNavigate } from "react-router-dom";

import { useCreatePatient } from "../api/patients.queries";
import { PatientForm } from "../components/PatientForm";

export function PatientCreatePage() {
  const navigate = useNavigate();
  const createPatient = useCreatePatient();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-content">Add patient</h1>
      <PatientForm
        submitLabel="Create patient"
        cancelTo="/patients"
        onSubmit={async (payload) => {
          const patient = await createPatient.mutateAsync(payload);
          void navigate(`/patients/${patient.id}`);
        }}
      />
    </div>
  );
}
