#include "Files.h"
#include "Model.h"
#include "Renderer.h"
#include "Writer.h"
#include <QFile>
#include <QGuiApplication>
#include <QHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <QTemporaryDir>
#include <QtEndian>
#include <functional>
#include <iostream>

using namespace powerimages;
namespace {
void require(bool condition, const char *message) {
    if (!condition)
        throw std::runtime_error(message);
}
void rejects(const std::function<void()> &action) {
    try {
        action();
    } catch (const Error &) {
        return;
    }
    throw std::runtime_error("Expected operation to fail");
}
class MemoryFiles final : public Files {
  public:
    QHash<QString, QByteArray> contents;
    QString failPath;
    QStringList writes;
    bool exists(const QString &path) const override {
        return contents.contains(path);
    }
    QByteArray read(const QString &path) const override {
        if (!contents.contains(path))
            throw Error("Missing file", path);
        return contents.value(path);
    }
    void write(const QString &path, const QByteArray &bytes) override {
        if (path == failPath)
            throw Error("Injected write failure", path);
        writes.append(path);
        contents[path] = bytes;
    }
};
QByteArray json(const QJsonObject &object) {
    return QJsonDocument(object).toJson(QJsonDocument::Compact);
}
const Progress quiet = [](const QJsonObject &) {};
struct Fixture {
    MemoryFiles files;
    Environment environment{"/app", "/images", "/boot", "reMarkable 1.0", false};
    QDate date{2026, 8, 9};
    explicit Fixture(const QJsonObject &contract) {
        files.contents["/app/data/roster.json"] = json(contract["roster"].toObject());
        files.contents["/app/data/2026-08.json"] = json(contract["month"].toObject());
        files.contents["/app/settings.json"] = "{\"suspendImageEnabled\":true}";
        for (const auto &name : {"suspended", "poweroff", "batteryempty", "starting", "rebooting", "restart-crashed"})
            files.contents["/images/" + QString(name) + ".png"] = "original-" + QByteArray(name);
    }
    void disabled() {
        files.contents["/app/settings.json"] = "{\"suspendImageEnabled\":false,\"powerImageRestorePending\":true}";
    }
};
} // namespace
int main(int argc, char **argv) {
    QGuiApplication app(argc, argv);
    LocalFiles local;
    const auto contract =
        QJsonDocument::fromJson(local.read(QString::fromLocal8Bit(argv[1]) + "/habit-contract.json")).object();
    int failures = 0;
    int count = 0;
    const auto test = [&](const char *name, const std::function<void()> &body) {
        ++count;
        try {
            body();
            std::cout << "PASS " << name << '\n';
        } catch (const std::exception &error) {
            ++failures;
            std::cerr << "FAIL " << name << ": " << error.what() << '\n';
        }
    };
    test("shared JSON contract, privacy, tombstones and negative habits", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        const auto snapshot = writer.capture(fixture.date);
        const auto expected = contract["expected"].toArray();
        require(snapshot.habits.size() == expected.size(), "Hidden habit leaked");
        for (int index = 0; index < snapshot.habits.size(); ++index) {
            const auto &habit = snapshot.habits[index];
            QString marks;
            for (int day = 1; day <= snapshot.date.day(); ++day) {
                const auto mark = markFor(habit.entries.value(day, Outcome::Unmarked), habit.polarity);
                marks += mark.isNull() ? QChar(' ') : mark;
            }
            require(marks == expected[index].toObject()["marks"].toString(), "Mark semantics drifted");
            require(habit.name == expected[index].toObject()["name"].toString(), "Roster order drifted");
        }
    });
    test("malformed and legacy input refused; missing month allowed", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        fixture.files.contents.remove("/app/data/2026-08.json");
        require(writer.capture(fixture.date).habits.size() == 2, "Missing month lost roster");
        fixture.files.contents["/app/data/2026-08.json"] = "{}";
        rejects([&] { writer.capture(fixture.date); });
        fixture.files.contents["/app/data/roster.json"] = "{\"habits\":[{}]}";
        rejects([&] { writer.capture(fixture.date); });
        rejects([] { parseDate("2026-02-30"); });
        require(parseDate("2024-02-29").daysInMonth() == 29, "Leap day failed");
    });
    test("changed files rejected before capture or image writes", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        const QJsonObject expected{{"roster", contentHash(fixture.files.read("/app/data/roster.json"))},
                                   {"month", "missing"}};
        bool superseded = false;
        try {
            writer.execute({Operation::Render, fixture.date, expected}, quiet);
        } catch (const Error &error) {
            superseded = error.superseded;
        }
        require(superseded, "Changed input accepted");
        require(fixture.files.writes.isEmpty(), "Wrote before validating input");
    });
    test("captured batch stays immutable when JSON changes", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        writer.execute({Operation::Render, fixture.date, {}}, [&](const QJsonObject &progress) {
            if (progress["kind"] == "captured")
                fixture.files.contents["/app/data/roster.json"] = "invalid";
        });
        const auto snapshot =
            parseSnapshot(json(contract["roster"].toObject()), json(contract["month"].toObject()), fixture.date);
        require(fixture.files.read("/images/suspended.png") ==
                    encodePng(renderState(renderBase(snapshot), State::Sleep)),
                "Used changed data after capture");
    });
    test("every backup precedes image writes; backups retained", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        require(fixture.files.writes.indexOf("/images/restart-crashed.png.bak") <
                    fixture.files.writes.indexOf("/images/suspended.png"),
                "Replaced image before all backups");
        require(fixture.files.read("/images/restart-crashed.png") == fixture.files.read("/images/rebooting.png"),
                "Duplicate state differs");
        writer.execute({Operation::Backup, {}, {}}, quiet);
        require(fixture.files.read("/images/suspended.png.bak") == "original-suspended", "Overwrote original backup");
    });
    test("backup failure prevents any installed image change", [&] {
        Fixture fixture(contract);
        fixture.files.failPath = "/images/poweroff.png.bak";
        Writer writer(fixture.files, fixture.environment);
        rejects([&] { writer.execute({Operation::Render, fixture.date, {}}, quiet); });
        require(fixture.files.read("/images/suspended.png") == "original-suspended",
                "Image changed despite backup failure");
        require(!fixture.files.exists("/app/.sleep-sig"), "Committed failed batch signature");
    });
    test("partial failed batch cannot cause stale dedup skip", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        const auto original = fixture.files.read("/images/suspended.png");
        fixture.files.failPath = "/images/poweroff.png";
        rejects([&] { writer.execute({Operation::Render, fixture.date.addDays(1), {}}, quiet); });
        require(fixture.files.read("/images/suspended.png") != original, "Fault did not follow first write");
        fixture.files.failPath.clear();
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        require(fixture.files.read("/images/suspended.png") == original, "Skipped repair after failed batch");
    });
    test("signature failure is reported and retried", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        fixture.files.failPath = "/app/.sleep-sig";
        rejects([&] { writer.execute({Operation::Render, fixture.date, {}}, quiet); });
        fixture.files.failPath.clear();
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        require(fixture.files.exists("/app/.sleep-sig"), "Failed to retry signature");
        fixture.files.writes.clear();
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        require(fixture.files.writes.isEmpty(), "Repeated unchanged batch");
    });
    test("restore preflight and disabled opt-in survive failure", [&] {
        Fixture fixture(contract);
        Writer writer(fixture.files, fixture.environment);
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        fixture.disabled();
        const auto rendered = fixture.files.read("/images/suspended.png");
        fixture.files.contents.remove("/images/poweroff.png.bak");
        rejects([&] { writer.execute({Operation::Restore, {}, {}}, quiet); });
        require(fixture.files.read("/images/suspended.png") == rendered, "Restored partially before preflight");
        fixture.files.contents["/images/poweroff.png.bak"] = "original-poweroff";
        writer.execute({Operation::Restore, {}, {}}, quiet);
        require(fixture.files.read("/images/suspended.png") == "original-suspended", "Restore failed");
        rejects([&] { writer.execute({Operation::Render, fixture.date, {}}, quiet); });
    });
    test("boot format, orientation and corruption validation", [&] {
        QImage portrait(1404, 1872, QImage::Format_RGB32);
        portrait.fill(Qt::white);
        portrait.setPixelColor(0, 0, Qt::black);
        const auto bytes = encodeBootImage(portrait);
        validateBootImage(bytes);
        require(uchar(bytes[1078 + 1403 * 1872 + 1871]) == 0, "Boot orientation changed");
        auto corrupt = bytes;
        corrupt[28] = 24;
        rejects([&] { validateBootImage(corrupt); });
        rejects([&] { validateBootImage(bytes.left(bytes.size() - 1)); });
    });
    test("unsupported boot device fails before backups or writes", [&] {
        Fixture fixture(contract);
        fixture.environment.deviceModel = "reMarkable 2.0";
        fixture.files.contents["/boot/splash.bmp"] = QByteArray("bad");
        Writer writer(fixture.files, fixture.environment);
        rejects([&] { writer.execute({Operation::Render, fixture.date, {}}, quiet); });
        require(fixture.files.writes.isEmpty(), "Wrote on unsupported boot device");
    });
    test("test profile automatic output stays local", [&] {
        Fixture fixture(contract);
        fixture.environment.testProfile = true;
        Writer writer(fixture.files, fixture.environment);
        writer.execute({Operation::Render, fixture.date, {}}, quiet);
        for (const auto &path : fixture.files.writes)
            require(path.startsWith("/app/"), "Test automatic write escaped app directory");
        require(fixture.files.read("/images/suspended.png") == "original-suspended", "Test touched system screen");
    });
    test("atomic local writes preserve symlink aliases and verify full bytes", [&] {
        QTemporaryDir directory;
        const auto target = directory.path() + "/image.png";
        const auto alias = directory.path() + "/alias.png";
        local.write(target, "first");
        require(QFile::link(target, alias), "Could not create test symlink");
        local.write(alias, "second");
        require(QFileInfo(alias).isSymLink() && local.read(target) == "second", "Replaced alias rather than target");
        rejects([&] { local.write(directory.path() + "/missing/image.png", "bad"); });
        require(local.read(target) == "second", "Failed write damaged prior data");
    });
    std::cout << count - failures << '/' << count << " native checks passed\n";
    return failures ? 1 : 0;
}
