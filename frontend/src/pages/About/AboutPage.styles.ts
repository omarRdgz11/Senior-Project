import type { CSSProperties } from "react";
import { colors } from "../../styles/colors";

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
        borderColor: colors.olive,
        padding: "1rem",
    },

    teamCard: {
        backgroundColor: colors.cream,
        padding: "auto",
        borderColor: "transparent",
        textAlign: "center",
    },

    title: {
        fontSize: "1.5rem",
        fontWeight: 600,
        color: colors.brown,
        marginBottom: "0.5rem",
        fontFamily: "'Figtree', sans-serif",
    },

    subtitle: {
        color: colors.forest,
        fontSize: "1.2rem",
        fontFamily: "'Source Sans 3', sans-serif",
    },

    text: {
        color: colors.stone,
        fontSize: "1rem",
        fontFamily: "'Source Sans 3', sans-serif",
    },

    abtBtn: {
        transition: "all 0.25s ease",
        fontFamily: "'Source Sans 3', sans-serif",
        borderStyle: "solid",
        borderColor: colors.forest,
        color: colors.cream,
        backgroundColor: colors.stone,
        borderRadius: "1rem",
    },

    teamBtn: {
        transition: "all 0.25s ease",
        fontFamily: "'Source Sans 3', sans-serif",
        borderColor: "transparent",
        color: colors.cream,
        backgroundColor: colors.olive,
        borderRadius: "1rem",
        margin: "0 auto",
    },

    profileImg: {
        margin: "0 auto",
    }
};