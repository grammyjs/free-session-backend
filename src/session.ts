const map = new Map<number, string>();

export function readSession(id: number) {
  const session = map.get(id);
  return new Response(session, { status: 200 });
}

export function writeSession(id: number, data: string) {
  map.set(id, data);
  return new Response("set", { status: 201 });
}
