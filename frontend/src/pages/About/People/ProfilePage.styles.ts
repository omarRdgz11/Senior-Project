import type { CSSProperties } from "react";
import { colors } from "../../../styles/colors";

export const styles: Record<string, CSSProperties> = {
    container: {
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "left",
        padding: "2rem",
    },

    card: {
        backgroundColor: colors.cream,
        borderRadius: "1rem",
        borderStyle: "solid",
        borderWidth: "2px",
        borderColor: colors.forest,
        padding: "2rem 1rem",
    },

    title: {
        fontWeight: 600,
        color: colors.brown,
        marginBottom: "0.5rem",
        fontFamily: "'Figtree', sans-serif",
    },

    subtitle: {
        color: colors.forest,
        fontFamily: "'Source Sans 3', sans-serif",
    },

    text: {
        color: colors.stone,
        fontFamily: "'Source Sans 3', sans-serif",
    },

    buttons: {
        transition: "all 0.25s ease",
        fontFamily: "'Source Sans 3', sans-serif",
        borderColor: "transparent",
        color: colors.cream,
        backgroundColor: colors.stone,
        borderRadius: "1rem",
    },
}