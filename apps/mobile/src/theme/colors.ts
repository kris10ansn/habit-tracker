import { useColorScheme } from "react-native";

import { dark, light } from "./palette";

// Subscribe directly to the system appearance used by NativeWind's media queries.
// Native APIs cannot resolve className colors (navigation, inputs, animations).
export function useColors() {
    const colorScheme = useColorScheme();
    return colorScheme === "dark" ? dark : light;
}
