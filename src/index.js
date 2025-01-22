require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const keepAlive = require("./server");
const fs = require('fs');
// const AlexaBot = require('alexa-bot-api');

require('./server');
const { spawn } = require("child_process");
const express = require("express");
const app = express();


// Spawn the scanner.js process
const scannerProcess = spawn("node", ["scanner.js"], {
    stdio: "inherit", // Redirect scanner.js output to the console
});

// Handle errors in scanner.js
scannerProcess.on("error", (err) => {
    console.error(`Failed to start scanner.js: ${err}`);
});

// Handle scanner.js process exit
scannerProcess.on("exit", (code, signal) => {
    if (code !== 0) {
        console.error(
            `scanner.js exited with code ${code} or signal ${signal}`,
        );
    } else {
        console.log("scanner.js exited successfully.");
    }
});

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
    ],
});




// Function to create or fetch a webhook for the channel
async function getOrCreateWebhook(channel) {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.owner.id === client.user.id);

    if (!webhook) {
        // Create a new webhook if none exists
        webhook = await channel.createWebhook({
            name: "Proxy Bot",
            avatar: client.user.displayAvatarURL(),
        });
    }

    return webhook;
}

client.on("guildMemberAdd", member => {
    console.log(`New member joined: ${member.user.tag}`);
    const channel = client.channels.cache.get('1322596914553950319');
    if (channel) {
        console.log(`Sending welcome message to ${channel.name}`);
          channel.send(`Greetings Postulate <@${member.id}>! Welcome to the church, here get baptized.\n https://media.discordapp.net/attachments/1330259814579699786/1331181901607735391/84bc89fb498ea7edfb594869f0324297.jpg?ex=6790af41&is=678f5dc1&hm=0987603e0747a7b59555974c5059f65175926b16960aeafadb3209c55521d106&=`);
    } else {
        console.error('Channel not found or bot lacks access.');
    }
});



// Array of Command objects
const cmds = [
    {
        name: "help", // Command name for help
        description: "Shows a list of available commands.",
        async execute(interaction) {
            // List all commands
            const helpMessage = "\n**Available Commands:**\n\n1. **!help** - Shows a list of available commands.\n2. **!rand <file-type>** - Get a random file link.\n- <file-type> can be: **mp4, png, jpeg, gif, pdf**\n**Usage:**\n- To get a random file link, use `!rand mp4`, `!rand png`, etc.";

            // Send the help message
            await interaction.reply({
                content: helpMessage,
                ephemeral: true, // Make it visible only to the user who asked
            });
        },
    },
    {
        name: "ping", // Command name
        description: "Get the bot latency in milliseconds.", // Command description
        async execute(interaction) {
            // Execute function
            const sent = await interaction.reply({
                content: "Pinging...",
                fetchReply: true,
            });

            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const websocketPing = client.ws.ping;

            await interaction.editReply({
                content: `🏓 Pong!\nLatency: \`${latency}ms\`\nWebSocket Ping: \`${websocketPing}ms\``,
            });
        },
    },
    {
        name: "rand", // Command name for random mp4
        description: "Get a random mp4 link", // Command description
        options: [
            {
                type: 3, // String option
                name: "type",
                description: "Type of link",
                required: true,
                choices: [
                    { name: "mp4", value: "mp4" },
                ],
            },
        ],
        async execute(interaction) {
            const type = interaction.options.getString("type");

            if (type === "mp4") {
                // Load valid links
                const validLinks = loadValidLinks();
                if (validLinks.length === 0) {
                    return interaction.reply("No valid mp4 links found!");
                }

                // Get a random link
                const randomLink = validLinks[Math.floor(Math.random() * validLinks.length)];

                // Reply with the random link
                await interaction.reply(randomLink);
            }
        },
    },
];

client.on("messageCreate", async (message) => {
    if (message.content.toLowerCase() === "!help") {
        const helpMessage = `
**Available Commands:**

1. **!help** - Shows a list of available commands.
2. **!rand <file-type>** - Get a random file link.
   - <file-type> can be: **mp4, png, jpeg, gif, pdf**

**Usage:**
- To get a random file link, use \`!rand mp4\`, \`!rand png\`, etc.
        `;

        // Send the help message to the channel
        await message.reply(helpMessage);
    }
});

// Interaction Create Event
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = cmds.find((cmd) => cmd.name === interaction.commandName);
    if (command) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error("Error executing command:", error);
            await interaction.reply({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    }
});

// Load valid links from valid.json
// Load valid links from the specified file
function loadValidLinks(fileName) {
    try {
        const data = fs.readFileSync(fileName, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return [];
    }
}

// Command to randomly get a valid link based on file type
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;  // Prevent the bot from responding to its own messages

    const args = message.content.trim().split(" ");

    if (args[0].toLowerCase() === "!rand" && args[1]) {
        const fileType = args[1].toLowerCase(); // Get the file type (mp4, png, etc.)

        // Map file types to their respective JSON files
        const validFiles = {
            mp4: 'validmp4.json',
            png: 'validpng.json',
            jpeg: 'validjpeg.json',
            gif: 'validgif.json',
            pdf: 'validpdf.json',
        };

        // Check if the file type is valid
        if (!validFiles[fileType]) {
            return message.reply("Please provide a valid file type: mp4, png, jpeg, gif, or pdf.");
        }

        // Load the valid links for the requested file type
        const validLinks = loadValidLinks(validFiles[fileType]);

        if (validLinks.length === 0) {
            return message.reply(`No valid ${fileType} links found!`);
        }

        // Get a random link from the validLinks array
        const randomLink = validLinks[Math.floor(Math.random() * validLinks.length)];

        // Send the random link
        message.reply(`${randomLink}`);
    }
});

// Message Create Event for `!alt` command
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("!alt")) return;

    const args = message.content.split(" ").slice(1);
    const mentionedUser = message.mentions.users.first();

    if (!mentionedUser || args.length < 2) {
        await message.reply("Usage: `!alt @mention <message>`");
        return;
    }

    const userMessage = args.slice(1).join(" ");

    try {
        // Delete the original message safely
        try {
            await message.delete();
        } catch (deleteError) {
            console.warn(
                "Unable to delete message (possibly already deleted):",
                deleteError.message,
            );
        }

        // Determine the display name:
        const member = message.guild.members.cache.get(mentionedUser.id);
        const displayName =
            (member && member.displayName) || // Server nickname
            mentionedUser.globalName || // Global name
            mentionedUser.username; // Default username

        // Get or create a webhook for the channel
        const webhook = await getOrCreateWebhook(message.channel);

        // Send a message via the webhook
        await webhook.send({
            content: userMessage,
            username: displayName,
            avatarURL: mentionedUser.displayAvatarURL({ dynamic: true }),
        });
    } catch (error) {
        console.error("Error handling !alt command:", error);

        // Send a fallback error message
        try {
            await message.channel.send(
                "There was an error processing your command!",
            );
        } catch (fallbackError) {
            console.error("Error sending fallback message:", fallbackError);
        }
    }
});

// Message Delete Event to proxy deleted messages
client.on("messageDelete", async (deletedMessage) => {
    if (deletedMessage.author.bot || deletedMessage.content.startsWith("!alt")) return;

    const args = deletedMessage.content.split(" ").slice(1);
    const mentionedUser = deletedMessage.mentions.users.first();

    if (!mentionedUser || args.length < 2) return;

    const userMessage = args.slice(1).join(" ");

    try {
        // Determine the display name:
        const member = deletedMessage.guild.members.cache.get(mentionedUser.id);
        const displayName =
            (member && member.displayName) || // Server nickname
            mentionedUser.globalName || // Global name
            mentionedUser.username; // Default username

        // Get or create a webhook for the channel
        const webhook = await getOrCreateWebhook(deletedMessage.channel);

        // Send a message via the webhook
        await webhook.send({
            content: userMessage,
            username: displayName,
            avatarURL: mentionedUser.displayAvatarURL({ dynamic: true }),
        });
    } catch (error) {
        console.error("Error handling !alt command on message delete:", error);

        // Send a fallback error message
        try {
            await deletedMessage.channel.send(
                "There was an error processing your deleted message!",
            );
        } catch (fallbackError) {
            console.error("Error sending fallback message on delete:", fallbackError);
        }
    }
});


// Ready Event
client.on("ready", async () => {
    console.log(`Bot is now online successfully!`);

    const rest = new REST({ version: "10" }).setToken(process.env["token"]);

    try {
        console.log("Started refreshing application (global) commands.");

        // Register global commands
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: cmds,
        });

        console.log("Successfully reloaded application (global) commands.");
    } catch (error) {
        console.error("Error registering commands:", error);
    }
});

// Bot Login
client.login(process.env["token"]);
keepAlive();
