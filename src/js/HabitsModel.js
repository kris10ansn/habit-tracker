function toArray(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const h = model.get(i);
        out.push({
            name: h.name,
            negative: !!h.negative,
            hideFromSleep: !!h.hideFromSleep,
            entries: h.entries || {}
        });
    }
    return out;
}
