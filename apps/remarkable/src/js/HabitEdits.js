const FIELDS = ["name", "polarity", "isPrivate"];

function visibleNeighborIndex(model, index, direction) {
    let target = index + direction;
    while (target >= 0 && target < model.count && !model.get(target).editVisible) {
        target += direction;
    }

    return target >= 0 && target < model.count ? target : -1;
}

function snapshot(model) {
    const rows = [];
    for (let index = 0; index < model.count; index++) {
        const habit = model.get(index);
        rows.push({
            id: habit.id,
            name: habit.name,
            polarity: habit.polarity,
            isPrivate: habit.isPrivate,
        });
    }
    return rows;
}

function changes(original, draft) {
    const originalIds = original.map((habit) => habit.id);
    const draftIds = draft.map((habit) => habit.id);
    const additions = draft.filter((habit) => !originalIds.includes(habit.id));
    const naturalOrder = originalIds
        .filter((id) => draftIds.includes(id))
        .concat(additions.map((habit) => habit.id));
    return {
        removed: originalIds.filter((id) => !draftIds.includes(id)),
        added: additions,
        updated: draft
            .filter((habit) => originalIds.includes(habit.id))
            .map((habit) =>
                changedFields(
                    original.find((row) => row.id === habit.id),
                    habit,
                ),
            )
            .filter((change) => Object.keys(change.fields).length),
        order: draftIds,
        reordered: naturalOrder.join("|") !== draftIds.join("|"),
    };
}

function changedFields(original, draft) {
    const fields = {};
    FIELDS.forEach((field) => {
        if (original[field] !== draft[field]) fields[field] = draft[field];
    });
    return { id: draft.id, fields: fields };
}
