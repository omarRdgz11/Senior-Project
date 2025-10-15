import type { CSSProperties } from "react";
import { colors } from "../../styles/colors";

export const styles: Record<string, CSSProperties> = {
    container: {
        position: "relative",
        color: colors.brown,
    },

    sidebar: {
        position: "fixed",
        zIndex: "40",
        right: "0",
    },

    buttons: {
        color: colors.cream,
        backgroundColor: colors.red,
        transition: "all 0.25s ease",
        fontFamily: "'Source Sans 3', sans-serif",
        borderStyle: "solid",
        borderColor: colors.stone,
    }
};