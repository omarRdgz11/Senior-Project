import type { CSSProperties } from "react";

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
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    title: {
        color: '#333',
        marginBottom: '10px'
    },
    subtitle: {
        color: '#666',
        marginBottom: '20px'
    },
    button: {
        padding: '15px 30px',
        fontSize: '18px',
        background: '#ff6b6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '20px'
    },
    buttonDisabled: {
        padding: '15px 30px',
        fontSize: '18px',
        background: '#ccc',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'not-allowed',
        marginBottom: '20px'
    },
    errorBox: {
        padding: '15px',
        background: '#f8d7da',
        color: '#721c24',
        borderRadius: '5px',
        marginBottom: '20px',
        borderLeft: '4px solid #f5c6cb'
    },
    infoBox: {
        padding: '15px',
        background: '#d1ecf1',
        color: '#0c5460',
        borderRadius: '5px',
        marginBottom: '20px',
        borderLeft: '4px solid #bee5eb'
    },
    alertBoxDanger: {
        padding: '20px',
        background: '#ff4444',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    alertBoxSafe: {
        padding: '20px',
        background: '#44ff44',
        color: '#004400',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    alertTitle: {
        marginTop: 0,
        marginBottom: '15px'
    },
    mapContainer: {
        height: '500px',
        width: '100%',
        border: '2px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    instructionsBox: {
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '5px',
        borderLeft: '4px solid #dee2e6'
    },
    instructionsTitle: {
        marginTop: 0,
        color: '#495057'
    },
    instructionsList: {
        marginBottom: 0,
        color: '#6c757d'
    }
};
