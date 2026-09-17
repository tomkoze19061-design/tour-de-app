// Administrátorský API klíč pro operace, které mění data zastávek
// (POST, PUT, DELETE). Klient jej posílá jako "Authorization: Bearer <klíč>".
const ADMIN_API_KEY = "Kyqc49jIM+5+D0Sed8ZQ671gxkd7W/bBTWjDtZ0Zrgk=";

export function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  return token === ADMIN_API_KEY;
}
