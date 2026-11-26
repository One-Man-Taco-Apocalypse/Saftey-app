// Shared by server and browser code.

export type Person = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  color: string;
  email: string | null;
  position: string | null;
};

export function personName(p: Person) {
  return (
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.email ||
    "Unnamed user"
  );
}
