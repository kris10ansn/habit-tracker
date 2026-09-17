function rowHeight(count, viewportHeight, minimum, maximum, gap) {
    if (count < 1) return maximum;

    return Math.max(
        minimum,
        Math.min(
            maximum,
            Math.floor((viewportHeight - (count - 1) * gap) / count),
        ),
    );
}

function contentHeight(count, height, gap) {
    return Math.max(0, count * (height + gap) - gap);
}

function visibleCount(model, showPrivate) {
    let count = 0;
    for (let index = 0; index < model.count; index++) {
        if (showPrivate || !model.get(index).isPrivate) count++;
    }
    return count;
}

function pageRows(viewportHeight, height, gap) {
    return Math.max(1, Math.floor(viewportHeight / (height + gap)) - 1);
}
