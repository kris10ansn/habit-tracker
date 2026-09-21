import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [profile, buildDirectory] = process.argv.slice(2);
if (!["stable", "test"].includes(profile) || !buildDirectory) {
    throw new Error(
        "Usage: node scripts/stage-profile.mjs stable|test <build-directory>",
    );
}

const profilePath = path.join(buildDirectory, "src/js/BuildProfile.js");
const source = readFileSync(profilePath, "utf8");
if (!source.includes("const isTest = false;")) {
    throw new Error("BuildProfile must be staged from unmodified source");
}
writeFileSync(
    profilePath,
    source.replace(
        "const isTest = false;",
        `const isTest = ${profile === "test"};`,
    ),
);

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
if (profile === "test") {
    manifest.id = "habit-tracker-test";
    manifest.name = "Habit Tracker TEST";
}
writeFileSync(
    path.join(buildDirectory, "manifest.json"),
    JSON.stringify(manifest, null, 4) + "\n",
);

const resources = readFileSync("application.qrc", "utf8");
writeFileSync(
    path.join(buildDirectory, "application.qrc"),
    profile === "test"
        ? resources
        : resources.replace(/^.*<file>src\/testing\/.*\n/gm, ""),
);

const applicationDirectory = `/home/root/xovi/exthome/appload/${manifest.id}`;
const service = readFileSync(
    "tools/suspend-writer/power-images.service.in",
    "utf8",
)
    .replaceAll("@PROFILE@", profile)
    .replaceAll("@APP_DIRECTORY@", applicationDirectory);
writeFileSync(
    path.join(buildDirectory, `${manifest.id}-images.service`),
    service,
);
