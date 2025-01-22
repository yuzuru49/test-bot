const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
require('./server');

const CONCURRENT_CHECKS = 1000; // Adjust concurrency for your system
const SAVE_INTERVAL = 100; // Save progress every 100 checks

// Function to generate a high-quality random 6-character string
function generateRandomCombination() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 6 }, () =>
        chars[crypto.randomInt(0, chars.length)]
    ).join('');
}

// Function to check if a URL is valid
async function checkUrl(url) {
    try {
        const response = await axios.get(url, { timeout: 2000 });
        return response.status === 200;
    } catch {
        return false;
    }
}

// Load previously checked combinations
function loadCheckedCombinations() {
    try {
        const data = fs.readFileSync('checked.json', 'utf8');
        return new Set(JSON.parse(data));
    } catch {
        return new Set(); // Default to an empty set if checked.json doesn't exist
    }
}

// Save checked combinations to file
function saveCheckedCombinations(checkedCombinations) {
    fs.writeFileSync('checked.json', JSON.stringify([...checkedCombinations], null, 2));
}

// Load valid links from file or initialize an empty array for each file type
function loadValidLinks(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch {
        return []; // Default to an empty array if the file doesn't exist
    }
}

// Save valid links to file
function saveValidLinks(validLinks, filename) {
    fs.writeFileSync(filename, JSON.stringify(validLinks, null, 2));
}

// Main function to scan and store valid links for different formats
async function storeValidLinks() {
    const validLinksMP4 = loadValidLinks('validmp4.json');
    const validLinksPNG = loadValidLinks('validpng.json');
    const validLinksJPEG = loadValidLinks('validjpeg.json');
    const validLinksGIF = loadValidLinks('validgif.json');
    const validLinksPDF = loadValidLinks('validpdf.json');
    const checkedCombinations = loadCheckedCombinations();
    let totalChecked = 0;

    while (true) {
        const tasks = [];

        for (let i = 0; i < CONCURRENT_CHECKS; i++) {
            const randomCombination = generateRandomCombination();

            // Skip already-checked combinations
            if (checkedCombinations.has(randomCombination)) continue;

            checkedCombinations.add(randomCombination);
            const baseUrl = `https://files.catbox.moe/${randomCombination}`;

            const urls = [
                `${baseUrl}.mp4`,
                `${baseUrl}.png`,
                `${baseUrl}.jpeg`,
                `${baseUrl}.gif`,
                `${baseUrl}.pdf`
            ];

            tasks.push(
                (async () => {
                    for (const url of urls) {
                        const isValid = await checkUrl(url);
                        totalChecked++;

                        if (isValid) {
                            // Store the valid link in the appropriate array
                            if (url.endsWith('.mp4')) {
                                validLinksMP4.push(url);
                                console.log(`Valid MP4 link found: ${url}`);
                            } else if (url.endsWith('.png')) {
                                validLinksPNG.push(url);
                                console.log(`Valid PNG link found: ${url}`);
                            } else if (url.endsWith('.jpeg')) {
                                validLinksJPEG.push(url);
                                console.log(`Valid JPEG link found: ${url}`);
                            } else if (url.endsWith('.gif')) {
                                validLinksGIF.push(url);
                                console.log(`Valid GIF link found: ${url}`);
                            } else if (url.endsWith('.pdf')) {
                                validLinksPDF.push(url);
                                console.log(`Valid PDF link found: ${url}`);
                            }
                        }

                        // Periodically log progress
                        if (totalChecked % SAVE_INTERVAL === 0) {
                            console.log(
                                `Checked: ${totalChecked} URLs, Valid MP4: ${validLinksMP4.length} links, Valid PNG: ${validLinksPNG.length} links, Valid JPEG: ${validLinksJPEG.length} links, Valid GIF: ${validLinksGIF.length} links, Valid PDF: ${validLinksPDF.length} links`
                            );
                            saveCheckedCombinations(checkedCombinations);
                            saveValidLinks(validLinksMP4, 'validmp4.json');
                            saveValidLinks(validLinksPNG, 'validpng.json');
                            saveValidLinks(validLinksJPEG, 'validjpeg.json');
                            saveValidLinks(validLinksGIF, 'validgif.json');
                            saveValidLinks(validLinksPDF, 'validpdf.json');
                        }
                    }
                })()
            );
        }

        // Await completion of all tasks and clear the array
        await Promise.allSettled(tasks);

        // Save progress after every batch
        saveCheckedCombinations(checkedCombinations);
        saveValidLinks(validLinksMP4, 'validmp4.json');
        saveValidLinks(validLinksPNG, 'validpng.json');
        saveValidLinks(validLinksJPEG, 'validjpeg.json');
        saveValidLinks(validLinksGIF, 'validgif.json');
        saveValidLinks(validLinksPDF, 'validpdf.json');
    }
}

(async () => {
    await storeValidLinks();
})();
