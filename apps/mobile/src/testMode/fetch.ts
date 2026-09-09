import { testFixture } from "./fixture.generated";

let sessions = testFixture.sessions.map((session) => ({ ...session }));

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(data === undefined ? null : JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function requestUrl(input: RequestInfo | URL): URL {
    if (typeof input === "string") return new URL(input);
    if (input instanceof URL) return input;
    return new URL(input.url);
}

export async function testFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Response> {
    const url = requestUrl(input);
    const method = init?.method?.toUpperCase() ?? "GET";

    if (method === "GET" && url.pathname === "/api/sessions") {
        return jsonResponse(sessions);
    }

    if (
        method === "GET" &&
        url.pathname === `/api/pairing/${testFixture.pairing.code}`
    ) {
        const { deviceName, expiresAt } = testFixture.pairing;
        return jsonResponse({ deviceName, expiresAt });
    }

    if (method === "POST" && url.pathname === "/api/pairing/approve") {
        return jsonResponse(undefined, 204);
    }

    if (method === "POST" && url.pathname === "/api/auth/logout") {
        return jsonResponse(undefined, 204);
    }

    if (method === "DELETE" && url.pathname.startsWith("/api/sessions/")) {
        const id = decodeURIComponent(
            url.pathname.slice("/api/sessions/".length),
        );
        sessions = sessions.filter((session) => session.id !== id);
        return jsonResponse(undefined, 204);
    }

    return jsonResponse(
        {
            title: `Test target has no response for ${method} ${url.pathname}`,
        },
        501,
    );
}
