import type { CSSProperties } from "react";
import { colors } from "../../styles/colors";

interface Styles {
    container: CSSProperties;
    title: CSSProperties;
    subtitle: CSSProperties;
    button: CSSProperties;
    buttonDisabled: CSSProperties;
    errorBox: CSSProperties;
    infoBox: CSSProperties;
    alertBoxDanger: CSSProperties;
    alertBoxSafe: CSSProperties;
    alertTitle: CSSProperties;
    mapContainer: CSSProperties;
    instructionsBox: CSSProperties;
    instructionsTitle: CSSProperties;
    instructionsList: CSSProperties;
}

export const styles: Styles = {
    container: {
        backgroundColor: colors.green,
        fontFamily: "'Figtree', sans-serif",
        color: colors.brown,
        padding: "2rem",
    },
    title: {
        fontSize: "2rem",
        fontWeight: 700,
        color: colors.brown,
        marginBottom: "0.5rem",
    },
    subtitle: {
        color: colors.forest,
        fontSize: "1.2rem",
        fontFamily: "'Source Sans 3', sans-serif",
    },
    button: {
        padding: "0.75rem",
        border: "none",
        backgroundColor: colors.red,
        color: colors.cream,
        fontWeight: 600,
        fontSize: "1rem",
        cursor: "pointer",
        transition: "0.2s",
        borderRadius: "1rem",
        margin: "0 auto",
    },

    buttonDisabled: {
        padding: "0.75rem",
        border: "none",
        backgroundColor: colors.stone,
        color: colors.cream,
        fontWeight: 600,
        fontSize: "1rem",
        cursor: "not-allowed",
        borderRadius: "1rem",
        margin: "0 auto",
    },
    errorBox: {
        padding: '15px',
        background: '#f8d7da',
        color: '#721c24',
        borderRadius: '5px',
        margin: '20px auto',
        borderLeft: '4px solid #f5c6cb'
    },
    infoBox: {
        padding: '15px',
        background: '#d1ecf1',
        color: '#0c5460',
        borderRadius: '5px',
        margin: '20px',
        borderLeft: '4px solid #bee5eb'
    },
    alertBoxDanger: {
        padding: '20px',
        background: '#ff4444',
        color: colors.cream,
        borderRadius: '8px',
        margin: '20px auto',
        fontFamily: "'Source Sans 3', sans-serif",
    },
    alertBoxSafe: {
        padding: '20px',
        background: '#44ff44',
        color: '#004400',
        borderRadius: '8px',
        margin: '20px auto',
        fontFamily: "'Source Sans 3', sans-serif",
    },
    alertTitle: {
        color: colors.cream,
        fontSize: "1.4rem",
        fontWeight: 600,
        fontFamily: "'Source Sans 3', sans-serif",
    },
    mapContainer: {
        height: '500px',
        border: '1px solid #ddd',
        borderRadius: '2px',
        margin: '20px auto'
    },
    instructionsBox: {
        backgroundColor: colors.cream,
        borderRadius: "1rem",
        borderStyle: "solid",
        borderWidth: "2px",
        borderColor: colors.olive,
        padding: "1rem",
        margin: '20px auto'
    },
    instructionsTitle: {
        color: colors.forest,
        fontSize: "1.2rem",
        fontFamily: "'Source Sans 3', sans-serif",
    },
    instructionsList: {
        color: colors.stone,
        fontSize: "1rem",
        fontFamily: "'Source Sans 3', sans-serif",
    }
};
