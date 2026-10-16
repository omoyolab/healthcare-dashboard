import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useDeletePatient } from "../api/patients.queries";

interface DeletePatientDialogProps {
  patientId: string;
  patientName: string;
}

export function DeletePatientDialog({ patientId, patientName }: DeletePatientDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const deletePatient = useDeletePatient();

  return (
    <>
      {/* Destructive actions are never one click. */}
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete this patient?"
        description={
          <>
            <strong>{patientName}</strong> and all of their clinical notes will be permanently
            removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete patient"
        isPending={deletePatient.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          deletePatient.mutate(patientId, {
            onSuccess: () => void navigate("/patients"),
            onError: () => setOpen(false),
          });
        }}
      />
    </>
  );
}
