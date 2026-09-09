import type { AuthSession } from "@/auth/session";
import type { AppRuntime } from "@/runtime/types";

import { prepareTestDatabase } from "./database";
import { testFixture } from "./fixture.generated";

let session: AuthSession | null = {
    token: "local-test-mode-token",
    user: testFixture.user,
};
let sessions = testFixture.sessions.map((item) => ({ ...item }));

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

async function testFetch(
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
        sessions = sessions.filter((item) => item.id !== id);
        return jsonResponse(undefined, 204);
    }

    return jsonResponse(
        {
            title: `Test mode has no local response for ${method} ${url.pathname}`,
        },
        501,
    );
}

export const testRuntime: AppRuntime = {
    databaseName: "habits-test.db",
    prepareDatabase: async (database) => {
        await prepareTestDatabase(database);
        console.info("TEST_MODE_READY");
    },
    sessionStore: {
        async get() {
            return session;
        },
        async set(nextSession) {
            session = nextSession;
        },
        async clear() {
            session = null;
        },
    },
    fetch: testFetch,
};
