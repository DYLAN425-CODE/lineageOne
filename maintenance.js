/**
 * This script checks for a maintenance mode flag in `server.properties`.
 * If maintenance mode is active, it replaces the entire page content
 * with a maintenance message. This script should be placed in the <head>
 * of every HTML document to execute before the body is rendered.
 */
(async function() {
    try {
        // Use a cache-busting query parameter to ensure we always get the latest file
        const response = await fetch('server.properties?v=' + Date.now());

        // If the file can't be fetched, assume the site is not in maintenance
        if (!response.ok) return;

        const text = await response.text();

        // Parse the properties file into a key-value object
        const properties = {};
        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex > -1) {
                    const key = line.substring(0, separatorIndex).trim();
                    const value = line.substring(separatorIndex + 1).trim();
                    properties[key] = value;
                }
            }
        });

        const isMaintenance = properties['MAINTENANCE_MODE'] === 'true';

        if (isMaintenance) {            
            const whitelist = (properties['MAINTENANCE_WHITELIST_IP'] || '').split(',').map(ip => ip.trim()).filter(Boolean);

            // If there's a whitelist, try to check the user's IP.
            if (whitelist.length > 0) {
                try {
                    const ipResponse = await fetch(properties['IP_API_URL'] || 'https://api.ipify.org');
                    const userIp = await ipResponse.text();
                    if (whitelist.includes(userIp)) {
                        console.log(`Maintenance mode bypassed for whitelisted IP: ${userIp}`);
                        return; // IP is on the list, so we stop and let the site load.
                    }
                } catch (ipError) {
                    console.error("Could not verify user IP for maintenance bypass. Proceeding with maintenance mode.", ipError);
                }
            }

             // Stop the browser from trying to load/render more of the page
            window.stop();

            const defaultMessage = 'The server is currently undergoing scheduled maintenance. We will be back online shortly. Thank you for your patience.';
            const maintenanceMessage = properties['MAINTENANCE_MESSAGE'] || defaultMessage;

            // Replace the entire document's HTML with the maintenance page
            document.documentElement.innerHTML = `
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Under Maintenance</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
                    <link rel="stylesheet" href="style.css">
                </head>
                <body class="bg-black text-gray-200 flex items-center justify-center min-h-screen text-center p-4">
                    <div id="bg-video-container" style="filter: grayscale(80%); opacity: 0.5;">
                        <video src="media/lineage2.mp4" autoplay muted loop playsinline preload="metadata"></video>
                    </div>
                    <div class="maintenance-panel ui-panel max-w-2xl">
                        <h1 class="text-4xl font-bold text-yellow-400 mb-4 text-shadow">Under Maintenance</h1>
                        <p class="text-lg text-gray-300">${maintenanceMessage.replace(/\n/g, '<br>')}</p>
                    </div>
                </body>
            `;
        }
    } catch (error) {
        console.error("Maintenance check failed:", error);
        // If an error occurs, proceed as normal.
    }
})();