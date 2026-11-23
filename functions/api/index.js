export async function onRequest() {
  return Response.json({
    status: "ok",
    app: "Vyapai CRM API",
    version: "2.0",
  });
}
