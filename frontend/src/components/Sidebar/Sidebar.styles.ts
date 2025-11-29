import type { CSSProperties } from "react";
import { colors } from "../../styles/colors";

export const styles: Record<string, CSSProperties> = {
    sidebar: {
        backgroundColor: colors.cream,
    },

    title: {
        fontSize: "1.5rem",
        fontWeight: 750,
        color: colors.brown,
        marginBottom: "0.5rem",
        fontFamily: "'Figtree', sans-serif",
    },

    subtitle: {
        color: colors.forest,
        marginBottom: "2rem",
        fontSize: "1.2rem",
        fontFamily: "'Source Sans 3', sans-serif",
    }
};