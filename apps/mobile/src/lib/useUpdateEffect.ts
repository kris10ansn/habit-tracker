import { DependencyList, EffectCallback, useEffect, useRef } from "react";

export const useUpdateEffect = (
    effect: EffectCallback,
    deps: DependencyList,
) => {
    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        return effect();
    }, deps);
};
