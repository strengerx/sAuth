export const logInfo = (event, context = {}) => {
    console.log(JSON.stringify({ level: "info", event, timestamp: new Date().toISOString(), ...context }));
};

export const logError = (event, context = {}) => {
    console.error(JSON.stringify({ level: "error", event, timestamp: new Date().toISOString(), ...context }));
};
