export async function POST(req: Request) {
  try {
    const { client_id, device_code, grant_type } = await req.json();
    
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "brane/0.1.0",
      },
      body: JSON.stringify({ client_id, device_code, grant_type }),
    });

    if (!response.ok) {
      return new Response("Failed to fetch token", { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
