import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";

import {
  emptyPatientForm,
  patientFormSchema,
  toPayload,
  type PatientFormValues,
} from "../schemas/patient.schema";
import { BLOOD_TYPES, PATIENT_STATUSES } from "../types";

interface PatientFormProps {
  defaultValues?: PatientFormValues;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (payload: ReturnType<typeof toPayload>) => Promise<unknown>;
}

/** Shared by create and edit, so the two cannot drift apart. */
export function PatientForm({
  defaultValues = emptyPatientForm,
  submitLabel,
  cancelTo,
  onSubmit,
}: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toPayload(values));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setError("root", { message: "Something went wrong. Please try again." });
        return;
      }
      if (error.isValidationError || error.isConflict) {
        // Server field errors land on the matching input, not in a banner.
        const fields = error.fieldErrors;
        const known = Object.keys(fields).filter((name) => name in emptyPatientForm);
        for (const name of known) {
          setError(name as keyof PatientFormValues, { message: fields[name] });
        }
        if (known.length === 0) setError("root", { message: error.message });
        return;
      }
      setError("root", {
        message: error.isNetworkError
          ? "Could not reach the server. Your changes are still here - try again."
          : error.message,
      });
    }
  });

  return (
    // noValidate: without it the browser blocks submit on type="email" and
    // shows its own tooltip, so our inline messages never appear.
    <form noValidate onSubmit={(event) => void submit(event)} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">
          Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first_name" label="First name" error={errors.first_name?.message}>
            <Input
              id="first_name"
              aria-invalid={Boolean(errors.first_name)}
              {...register("first_name")}
            />
          </Field>
          <Field id="last_name" label="Last name" error={errors.last_name?.message}>
            <Input
              id="last_name"
              aria-invalid={Boolean(errors.last_name)}
              {...register("last_name")}
            />
          </Field>
          <Field id="date_of_birth" label="Date of birth" error={errors.date_of_birth?.message}>
            <Input
              id="date_of_birth"
              type="date"
              aria-invalid={Boolean(errors.date_of_birth)}
              {...register("date_of_birth")}
            />
          </Field>
          <Field
            id="email"
            label="Email"
            error={errors.email?.message}
            hint="Optional, must be unique"
          >
            <Input
              id="email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" {...register("phone")} />
          </Field>
          <Field id="city" label="City" error={errors.city?.message}>
            <Input id="city" {...register("city")} />
          </Field>
          <Field id="address_line1" label="Address line 1" error={errors.address_line1?.message}>
            <Input id="address_line1" {...register("address_line1")} />
          </Field>
          <Field id="address_line2" label="Address line 2" error={errors.address_line2?.message}>
            <Input id="address_line2" {...register("address_line2")} />
          </Field>
          <Field id="state" label="State" error={errors.state?.message}>
            <Input id="state" {...register("state")} />
          </Field>
          <Field id="postal_code" label="Postal code" error={errors.postal_code?.message}>
            <Input id="postal_code" {...register("postal_code")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">
          Medical information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="blood_type" label="Blood type" error={errors.blood_type?.message}>
            <Select id="blood_type" {...register("blood_type")}>
              <option value="">Not recorded</option>
              {BLOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="status" label="Status" error={errors.status?.message}>
            <Select id="status" {...register("status")}>
              {PATIENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status[0]?.toUpperCase()}
                  {status.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="allergies"
            label="Allergies"
            hint="Separate with commas"
            error={errors.allergies?.message}
          >
            <Input id="allergies" placeholder="penicillin, latex" {...register("allergies")} />
          </Field>
          <Field
            id="conditions"
            label="Conditions"
            hint="Separate with commas"
            error={errors.conditions?.message}
          >
            <Input id="conditions" placeholder="type 2 diabetes" {...register("conditions")} />
          </Field>
        </div>
      </section>

      {errors.root && (
        <p role="alert" className="text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Link to={cancelTo} className="text-sm text-content-muted hover:text-content">
          Cancel
        </Link>
      </div>
    </form>
  );
}
