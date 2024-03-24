function log(message, type) {
    const colors = {
        info: "\x1b[34m", // Blue
        success: "\x1b[32m", // Green
        error: "\x1b[31m", // Red
    };

    const resetColor = "\x1b[0m";
    const color = colors[type] || resetColor; // Default to white

    const formattedTimestamp = `[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}] - `;
    const coloredMessage = `${color}${formattedTimestamp}${formatMessage(message)}${resetColor}`;

    console.log(coloredMessage);
}

function formatMessage(message) {
    if (Array.isArray(message)) {
        return formatArray(message);
    } else if (typeof message === 'object' && message !== null) {
        return formatObject(message);
    } else {
        return message;
    }
}

function formatArray(arr) {
    return `[${arr.map(formatMessage).join(', ')}]`;
}

function formatObject(obj) {
    const entries = Object.entries(obj).map(([key, value]) => `${key}: ${formatMessage(value)}`);
    return `{ ${entries.join(', ')} }`;
}

module.exports = { log };