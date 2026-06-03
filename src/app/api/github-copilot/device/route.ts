export async function POST(req: Request) {
  try {
    const { client_id, scope } = await req.json();
    
    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "brane/0.1.0",
      },
      body: JSON.stringify({ client_id, scope }),
    });

    if (!response.ok) {
      return new Response("Failed to initiate device authorization", { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
