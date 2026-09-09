function installFrozenDate(instant) {
    if (!Number.isFinite(instant)) {
        throw new TypeError("Frozen date must be a finite timestamp");
    }

    const NativeDate = globalThis.Date;
    const FrozenDate = new Proxy(NativeDate, {
        apply(target, thisArgument, argumentsList) {
            if (argumentsList.length === 0) {
                return new NativeDate(instant).toString();
            }
            return Reflect.apply(target, thisArgument, argumentsList);
        },
        construct(target, argumentsList, newTarget) {
            const arguments_ =
                argumentsList.length === 0 ? [instant] : argumentsList;
            return Reflect.construct(target, arguments_, newTarget);
        },
        get(target, property, receiver) {
            if (property === "now") return () => instant;
            return Reflect.get(target, property, receiver);
        },
    });

    globalThis.Date = FrozenDate;
    return () => {
        if (globalThis.Date === FrozenDate) globalThis.Date = NativeDate;
    };
}

module.exports = { installFrozenDate };
