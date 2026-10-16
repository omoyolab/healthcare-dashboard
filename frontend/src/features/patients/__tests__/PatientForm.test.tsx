import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PatientCreatePage } from "@/features/patients/pages/PatientCreatePage";
import { renderWithProviders } from "@/test/render";

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status === 422 ? "application/problem+json" : "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First name"), "Ada");
  await user.type(screen.getByLabelText("Last name"), "Lovelace");
  await user.type(screen.getByLabelText("Date of birth"), "1990-12-10");
}

test("blocks submission and shows messages when required fields are empty", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await user.click(screen.getByRole("button", { name: "Create patient" }));

  expect(await screen.findAllByText("Required")).toHaveLength(3);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("rejects an invalid email before contacting the server", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await fillRequired(user);
  await user.type(screen.getByLabelText(/Email/), "not-an-email");
  await user.click(screen.getByRole("button", { name: "Create patient" }));

  expect(await screen.findByText("Enter a valid email address")).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("maps a server 422 onto the matching field", async () => {
  fetchMock.mockResolvedValue(
    json(
      {
        type: "/errors/validation-error",
        title: "Validation failed",
        status: 422,
        detail: "1 field is invalid.",
        errors: [{ field: "date_of_birth", message: "must be in the past" }],
      },
      422,
    ),
  );
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await fillRequired(user);
  await user.click(screen.getByRole("button", { name: "Create patient" }));

  // The message appears under Date of birth, not in a generic banner.
  expect(await screen.findByText("must be in the past")).toBeVisible();
});

test("shows a duplicate email conflict on the email field", async () => {
  fetchMock.mockResolvedValue(
    json(
      {
        type: "/errors/conflict",
        title: "Email already in use",
        status: 409,
        detail: "Another patient already uses ada@example.com",
        errors: [{ field: "email", message: "Another patient already uses this address" }],
      },
      409,
    ),
  );
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await fillRequired(user);
  await user.type(screen.getByLabelText(/Email/), "ada@example.com");
  await user.click(screen.getByRole("button", { name: "Create patient" }));

  expect(await screen.findByText("Another patient already uses this address")).toBeVisible();
});

test("keeps what the user typed when the network fails", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await fillRequired(user);
  await user.click(screen.getByRole("button", { name: "Create patient" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/Could not reach the server/);
  expect(screen.getByLabelText("First name")).toHaveValue("Ada");
});

test("sends empty optional fields as null and splits comma lists", async () => {
  fetchMock.mockResolvedValue(json({ id: "new-id", first_name: "Ada" }, 201));
  const user = userEvent.setup();
  renderWithProviders(<PatientCreatePage />, { route: "/patients/new" });

  await fillRequired(user);
  await user.type(screen.getByLabelText("Allergies"), "latex, Latex , penicillin");
  await user.click(screen.getByRole("button", { name: "Create patient" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(init.body as string) as Record<string, unknown>;
  expect(body.phone).toBeNull();
  expect(body.blood_type).toBeNull();
  expect(body.allergies).toEqual(["latex", "Latex", "penicillin"]);
});
