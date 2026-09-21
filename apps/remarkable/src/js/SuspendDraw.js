.import "DateUtils.js" as DateUtils
.import "Entries.js" as Entries
.import "Polarity.js" as Polarity

function computeSignature(habits, today) {
    const currentDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();
    const visible = habits.filter((h) => !h.isPrivate);

    const parts = [`power-images-ledger-v4|${year}-${month}-${currentDay}`];

    for (let i = 0; i < visible.length; i++) {
        const h = visible[i];
        const entries = h.entries || {};
        const entryParts = [];
        for (let d = 1; d <= currentDay; d++) {
            entryParts.push(entries[DateUtils.dateKey(year, month, d)] || "");
        }
        parts.push(`${h.name}|${h.polarity}|${entryParts.join(",")}`);
    }

    return parts.join("\n");
}

function draw(
    ctx,
    canvasWidth,
    canvasHeight,
    habits,
    today,
    cfg,
    state = "sleep",
) {
    const states = {
        sleep: ["Sleeping", "Press power to wake"],
        off: ["Powered off", "Hold power to turn on"],
        empty: ["Battery empty", "Connect to power"],
        starting: ["Starting up", "Please wait while reMarkable loads"],
        rebooting: ["Restarting", "Please wait while reMarkable restarts"],
        overheating: ["Overheating", "Let your reMarkable cool down before use"],
    };
    if (!states[state]) throw new Error(`Unknown power state: ${state}`);

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(canvasWidth, 0);
    ctx.rotate(Math.PI / 2);
    ctx.scale(canvasHeight / 1872, canvasWidth / 1404);
    ctx.fillStyle = cfg.fg;
    ctx.textBaseline = "middle";

    const monthTitle = DateUtils.monthName(today).replace(/\s+\d{4}$/, "");
    drawText(ctx, "HABIT TRACKER", 96, 100, 23);
    drawText(ctx, monthTitle, 90, 200, 112, "serif");
    drawText(ctx, String(today.getFullYear()), 1776, 206, 57, "serif", "right");
    drawText(ctx, `${DateUtils.daysInMonth(today)} days`, 96, 286, 28);
    drawText(
        ctx,
        `${today.getDate()} · Snapshot day`,
        1776,
        286,
        28,
        "sans-serif",
        "right",
    );

    drawGrid(
        ctx,
        habits.filter((habit) => !habit.isPrivate),
        today,
    );
    drawLine(ctx, 96, 1085, 1776, 1085, "#111111", 2);
    drawStateBadge(ctx, state, states[state][0]);
    drawText(ctx, states[state][1], 1776, 1168, 29, "sans-serif", "right");
    drawText(
        ctx,
        `Snapshot · ${today.getDate()} ${monthTitle} ${today.getFullYear()}`,
        96,
        1270,
        25,
    );
    drawText(ctx, "Habit tracker", 1776, 1270, 25, "sans-serif", "right");
    ctx.restore();
}

const drawText = (
    ctx,
    value,
    x,
    y,
    size,
    family = "sans-serif",
    align = "left",
    color = "#111111",
) => {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${family}`;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
};

const drawLine = (ctx, x1, y1, x2, y2, color = "#777777", thickness = 1.6) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
};

const fitLabel = (ctx, name, width) => {
    if (ctx.measureText(name).width <= width) return name;

    let shortened = name;
    while (shortened.length && ctx.measureText(`${shortened}…`).width > width) {
        shortened = shortened.slice(0, -1);
    }
    return `${shortened}…`;
};

const drawGrid = (ctx, habits, today) => {
    const days = DateUtils.daysInMonth(today);
    const dayWidth = 1365 / days;
    const rowHeight = 560 / Math.max(5, habits.length);
    const bottom = 455 + rowHeight * habits.length;
    const currentX = 411 + (today.getDate() - 1) * dayWidth;
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(currentX, 412, dayWidth, Math.max(43, bottom - 412));
    ctx.fillStyle = "#111111";
    ctx.fillRect(currentX + 2, 377, dayWidth - 4, 47);

    for (let day = 1; day <= days; day++) {
        const center = 411 + (day - 0.5) * dayWidth;
        drawText(ctx, String(day), center, 402, 29, "sans-serif", "center");
        if (day === today.getDate()) {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(String(day), center, 402);
        }
        if (day % 5 === 0 && day !== days) {
            drawLine(
                ctx,
                center + dayWidth / 2,
                455,
                center + dayWidth / 2,
                bottom,
                "#aaaaaa",
                1.4,
            );
        }
    }
    drawLine(ctx, 96, 455, 1776, 455, "#111111", 2);
    habits.forEach((habit, index) =>
        drawHabit(ctx, habit, today, index, rowHeight, dayWidth),
    );
    if (!habits.length) drawText(ctx, "No public habits", 96, 560, 33);
};

const drawHabit = (ctx, habit, today, index, rowHeight, dayWidth) => {
    const centerY = 455 + (index + 0.5) * rowHeight;
    const fontSize = Math.min(33, rowHeight * 0.6);
    ctx.font = `${fontSize}px sans-serif`;
    drawText(ctx, fitLabel(ctx, habit.name, 287), 96, centerY, fontSize);
    const entries = habit.entries || {};
    for (let day = 1; day <= today.getDate(); day++) {
        const outcome =
            entries[
                DateUtils.dateKey(today.getFullYear(), today.getMonth(), day)
            ] || "";
        if (
            Entries.markFor(outcome, Polarity.isNegative(habit.polarity)) !==
            "X"
        )
            continue;

        const centerX = 411 + (day - 0.5) * dayWidth;
        const radius = Math.min(10, rowHeight * 0.23);
        drawLine(
            ctx,
            centerX - radius,
            centerY - radius,
            centerX + radius,
            centerY + radius,
            "#111111",
            3.4,
        );
        drawLine(
            ctx,
            centerX - radius,
            centerY + radius,
            centerX + radius,
            centerY - radius,
            "#111111",
            3.4,
        );
    }
    drawLine(
        ctx,
        96,
        455 + (index + 1) * rowHeight,
        1776,
        455 + (index + 1) * rowHeight,
    );
};

const circlePoints = (centerX, centerY, radius, start, end) => {
    return Array.from({ length: 49 }, (_, index) => {
        const angle = start + ((end - start) * index) / 48;
        return [
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
        ];
    });
};

const drawPolyline = (ctx, points) => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach((point) => ctx.lineTo(point[0], point[1]));
    ctx.stroke();
};

const drawStateBadge = (ctx, state, label) => {
    const background = {
        sleep: "#ffffff",
        off: "#111111",
        empty: "#dddddd",
        starting: "#ffffff",
        rebooting: "#ffffff",
        overheating: "#dddddd",
    }[state];
    const foreground = state === "off" ? "#ffffff" : "#111111";
    const iconWidth = state === "empty" ? 50 : 38;
    const padding = 26;
    const gap = 14;
    const left = 96;
    const top = 1118;
    const height = 100;
    const centerY = top + height / 2;
    ctx.font = "42px sans-serif";
    const width = padding * 2 + iconWidth + gap + ctx.measureText(label).width;
    roundedRectangle(ctx, left, top, width, height, 14);
    ctx.fillStyle = background;
    ctx.fill();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.stroke();
    drawStateIcon(ctx, state, left + padding, centerY - 18, foreground);
    drawText(
        ctx,
        label,
        left + padding + iconWidth + gap,
        centerY,
        42,
        "sans-serif",
        "left",
        foreground,
    );
};

const roundedRectangle = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const drawStateIcon = (ctx, state, x, y, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    if (state === "sleep") {
        const outer = circlePoints(18, 18, 18, 0.465, 4.248);
        const inner = circlePoints(26, 10, 18, -2.676, -5.177);
        drawPolyline(ctx, outer.concat(inner, [outer[0]]));
    } else if (state === "off" || state === "starting") {
        drawPolyline(
            ctx,
            circlePoints(18, 20, 16, -Math.PI / 3, (Math.PI * 4) / 3),
        );
        drawLine(ctx, 18, 0, 18, 19, color, 3);
    } else if (state === "rebooting") {
        drawPolyline(ctx, circlePoints(18, 18, 16, -Math.PI / 2, Math.PI));
        drawPolyline(ctx, [[-5, 25], [2, 18], [9, 25]]);
    } else if (state === "overheating") {
        drawPolyline(ctx, [[18, 0], [36, 34], [0, 34], [18, 0]]);
        drawLine(ctx, 18, 10, 18, 21, color, 3);
        drawLine(ctx, 18, 26, 18, 29, color, 3);
    } else {
        ctx.strokeRect(0, 1, 43, 34);
        drawLine(ctx, 48, 12, 48, 24, color, 3);
    }
    ctx.restore();
};
