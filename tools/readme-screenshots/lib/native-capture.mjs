import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const screens = [
    {
        name: "today",
        route: "",
        content: [
            "logged today",
            "Read 20 min",
            "4 of 6 habits logged",
            "6 days",
        ],
    },
    {
        name: "habits",
        route: "habits",
        content: [
            "Rename, reorder, set polarity, or add",
            "Read 20 min",
            "Medication",
        ],
    },
    {
        name: "month",
        route: "month",
        content: ["Your habits across the month", "R2m", "September"],
    },
    {
        name: "sync",
        route: "sync",
        content: [
            "Keep every device in step",
            "Changes not synced",
            "alex@example.com",
        ],
    },
    {
        name: "devices",
        route: "devices",
        content: [
            "Every device signed into your account",
            "Pixel 9a",
            "reMarkable 1",
        ],
    },
    {
        name: "pairing",
        route: "link-device",
        content: [
            "Scan the QR code or enter the 6-character code",
            "H7K9Q2",
            "Requesting device: reMarkable 1",
            "Approve",
            "Example camera view",
        ],
    },
];

function decodeXml(text) {
    return text.replace(
        /&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi,
        (_, entity) => {
            if (entity.startsWith("#x"))
                return String.fromCodePoint(parseInt(entity.slice(2), 16));
            if (entity.startsWith("#"))
                return String.fromCodePoint(Number(entity.slice(1)));
            return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[entity];
        },
    );
}

export function parseNativeUi(xml) {
    if (!xml.includes("<hierarchy") || !xml.includes("</hierarchy>")) {
        throw new Error("Android did not return a complete UI hierarchy");
    }
    return [...xml.matchAll(/<node\b[^>]*>/g)].map(([element]) => {
        const attributes = Object.fromEntries(
            [...element.matchAll(/([\w-]+)="([^"]*)"/g)].map(
                ([, key, value]) => [key, decodeXml(value)],
            ),
        );
        const bounds = attributes.bounds
            ?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)
            ?.slice(1)
            .map(Number);
        return {
            text: attributes.text || attributes["content-desc"] || "",
            package: attributes.package,
            center:
                bounds && bounds[2] > bounds[0] && bounds[3] > bounds[1]
                    ? [
                          Math.floor((bounds[0] + bounds[2]) / 2),
                          Math.floor((bounds[1] + bounds[3]) / 2),
                      ]
                    : undefined,
        };
    });
}

export function missingContent(nodes, expected) {
    const appNodes = nodes.filter(
        (node) => node.package === "host.exp.exponent",
    );
    return expected.filter(
        (text) => !appNodes.some((node) => node.text.includes(text)),
    );
}

export async function captureNative({
    adb,
    url,
    output,
    scenario,
    announce,
    onReadRetry = () => {},
    onCommandRetry = () => {},
}) {
    const directory = path.join(output, "native");
    await mkdir(directory);
    const deadline = Date.now() + 180000;
    const command = async (args, options = {}) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
            if (Date.now() >= deadline)
                throw new Error(
                    "Native capture exceeded its 180-second deadline",
                );
            try {
                return await adb(args, {
                    ...options,
                    timeoutMs: Math.min(10000, deadline - Date.now()),
                });
            } catch (error) {
                // The server rejects an offline transport before dispatching the command.
                // Do not replay arbitrary errors or commands that may already have executed.
                if (attempt === 3 || !/device offline/.test(error.message))
                    throw error;
                onCommandRetry();
                await appendFile(
                    path.join(directory, "events.log"),
                    `${new Date().toISOString()} command retry ${attempt}: ${error.message}\n`,
                );
                await adb(["wait-for-device"], {
                    timeoutMs: Math.max(
                        1,
                        Math.min(10000, deadline - Date.now()),
                    ),
                });
            }
        }
    };
    const captures = [];
    for (const screen of screens.filter(
        (screen) => scenario === "all" || screen.name === scenario,
    )) {
        announce(`Capturing ${screen.name} with Android UI checks`);
        // Today is the freshly loaded root. Later screens use explicit deep links.
        if (screen.route) {
            await command(
                [
                    "shell",
                    "am",
                    "start",
                    "-W",
                    "-a",
                    "android.intent.action.VIEW",
                    "-d",
                    `${url}/--/${screen.route}`,
                    "host.exp.exponent",
                ],
                { log: path.join(output, "logs", "launch.log") },
            );
        }
        const readyDeadline = Math.min(deadline, Date.now() + 30000);
        let consecutiveMatches = 0;
        let missing = screen.content;
        while (Date.now() < readyDeadline && consecutiveMatches < 2) {
            let nodes;
            try {
                const xml = await command([
                    "exec-out",
                    "uiautomator",
                    "dump",
                    "/dev/tty",
                ]);
                await writeFile(
                    path.join(directory, `${screen.name}.xml`),
                    xml,
                );
                nodes = parseNativeUi(xml);
            } catch (error) {
                consecutiveMatches = 0;
                onReadRetry();
                await appendFile(
                    path.join(directory, "events.log"),
                    `${new Date().toISOString()} ${screen.name}: ${error.message}\n`,
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
            }
            const intro = nodes.some((node) =>
                node.text.includes("This is the developer menu"),
            );
            const continueButton = nodes.find(
                (node) => node.text === "Continue" && node.center,
            );
            if (intro && continueButton) {
                await command([
                    "shell",
                    "input",
                    "tap",
                    ...continueButton.center.map(String),
                ]);
                consecutiveMatches = 0;
                continue;
            }
            if (nodes.some((node) => node.text === "Reload")) {
                await command(["shell", "input", "keyevent", "KEYCODE_BACK"]);
                consecutiveMatches = 0;
                continue;
            }
            missing = missingContent(nodes, screen.content);
            consecutiveMatches = missing.length ? 0 : consecutiveMatches + 1;
            if (consecutiveMatches < 2)
                await new Promise((resolve) => setTimeout(resolve, 300));
        }
        if (consecutiveMatches < 2)
            throw new Error(
                `${screen.name} did not become ready within 30 seconds; missing: ${missing.join(", ")}. See native/${screen.name}.xml`,
            );
        const capture = path.join(directory, `android-${screen.name}.png`);
        await command(["exec-out", "screencap", "-p"], { stdoutFile: capture });
        captures.push(capture);
    }
    return captures;
}
