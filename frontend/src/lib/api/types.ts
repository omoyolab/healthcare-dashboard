/** Transport types. Mirrors backend app/schemas/common.py. */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}

/** RFC 9457 problem details, as produced by core/exception_handlers.py. */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string | null;
  request_id?: string | null;
  errors?: FieldError[];
}
