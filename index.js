/*/▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱//
______     __     __     __    __        __  __     __    __     _____    
/\  == \   /\ \  _ \ \   /\ "-./  \      /\_\_\_\   /\ "-./  \   /\  __-.  
\ \  __<   \ \ \/ ".\ \  \ \ \-./\ \     \/_/\_\/_  \ \ \-./\ \  \ \ \/\ \ 
 \ \_____\  \ \__/".~\_\  \ \_\ \ \_\      /\_\/\_\  \ \_\ \ \_\  \ \____- 
  \/_____/   \/_/   \/_/   \/_/  \/_/      \/_/\/_/   \/_/  \/_/   \/____/ 
                                                                           
/▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰/*/

const { default: makeWASocket, isJidGroup, downloadMediaMessage, downloadAndSaveMediaMessage, superUser, imageMessage, CommandSystem, repondre, verifierEtatJid, recupererActionJid, DisconnectReason, getMessageText, commandRegistry, delay, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, useMultiFileAuthState, makeInMemoryStore, jidDecode, getContentType } = require("@whiskeysockets/baileys");
global.conf = require('./config');
const logger = require("@whiskeysockets/baileys/lib/Utils/logger").default.child({});
const { createContext } = require("./Ibrahim/helper");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const conf = require("./config");
const config = require("./config");
const abu = require("./config");
const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs-extra");
const path = require("path");
const https = require('https');
const FileType = require("file-type");
const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const evt = require("./Ibrahim/adams");
const rateLimit = new Map();
const MAX_RATE_LIMIT_ENTRIES = 100000;
const RATE_LIMIT_WINDOW = 3000; // 3 seconds
const express = require("express");
const { exec } = require("child_process");
const http = require("http");
const zlib = require('zlib');
const PREFIX = conf.PREFIX;
const { promisify } = require('util');
const stream = require('stream');
const AdmZip = require("adm-zip");
const { File } = require('megajs');
const pipeline = promisify(stream.pipeline);
const more = String.fromCharCode(8206);
const herokuAppName = process.env.HEROKU_APP_NAME || "Unknown App Name";
const herokuAppLink = process.env.HEROKU_APP_LINK || `https://dashboard.heroku.com/apps/${herokuAppName}`;
const botOwner = process.env.NUMERO_OWNER || "Unknown Owner";
const PORT = process.env.PORT || 3000;
const app = express();
let adams;
require("dotenv").config({ path: "./config.env" });
logger.level = "silent";

// Enhanced connection tracking and retry logic
let connectionRetries = 0;
const MAX_RETRIES = 10;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 15000, 30000, 60000]; // Progressive delays
let isReconnecting = false;
let connectionTimeout = null;
let heartbeatInterval = null;

// Enhanced rate limiting for groups and users
const groupRateLimits = new Map();
const userRateLimits = new Map();
const RATE_LIMIT_CONFIG = {
    GROUP_MESSAGE_DELAY: 1500,  // 1.5 seconds between group messages
    USER_MESSAGE_DELAY: 800,    // 0.8 seconds between user messages
    COMMAND_COOLDOWN: 2000,     // 2 seconds between commands
    MAX_MESSAGES_PER_MINUTE: 20, // Per user/group
    CLEANUP_INTERVAL: 300000    // 5 minutes
};

// Cleanup old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of groupRateLimits.entries()) {
        if (now - data.lastActivity > RATE_LIMIT_CONFIG.CLEANUP_INTERVAL) {
            groupRateLimits.delete(key);
        }
    }
    for (const [key, data] of userRateLimits.entries()) {
        if (now - data.lastActivity > RATE_LIMIT_CONFIG.CLEANUP_INTERVAL) {
            userRateLimits.delete(key);
        }
    }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

// Enhanced rate limiting function
function checkRateLimit(jid, isGroup = false) {
    const now = Date.now();
    const rateLimitMap = isGroup ? groupRateLimits : userRateLimits;
    const delay = isGroup ? RATE_LIMIT_CONFIG.GROUP_MESSAGE_DELAY : RATE_LIMIT_CONFIG.USER_MESSAGE_DELAY;
    
    if (!rateLimitMap.has(jid)) {
        rateLimitMap.set(jid, { 
            lastActivity: now, 
            messageCount: 1,
            lastMinute: now 
        });
        return false;
    }
    
    const userData = rateLimitMap.get(jid);
    
    // Check if within rate limit window
    if (now - userData.lastActivity < delay) {
        return true; // Rate limited
    }
    
    // Reset message count if minute has passed
    if (now - userData.lastMinute > 60000) {
        userData.messageCount = 0;
        userData.lastMinute = now;
    }
    
    // Check messages per minute limit
    if (userData.messageCount >= RATE_LIMIT_CONFIG.MAX_MESSAGES_PER_MINUTE) {
        return true; // Rate limited
    }
    
    userData.lastActivity = now;
    userData.messageCount++;
    return false;
}

app.use(express.static("adams"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// Enhanced health check endpoint
app.get("/health", (req, res) => {
    const status = {
        status: adams ? "online" : "offline",
        uptime: process.uptime(),
        retries: connectionRetries,
        timestamp: new Date().toISOString()
    };
    res.json(status);
});

const server = app.listen(PORT, () => console.log(`Bwm xmd is starting with a speed of ${PORT}ms🚀`));

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (connectionTimeout) clearTimeout(connectionTimeout);
    server.close(() => {
        process.exit(0);
    });
});

//============================================================================//

function atbverifierEtatJid(jid) {
    if (!jid.endsWith('@s.whatsapp.net')) {
        console.error('Your verified by Sir Ibrahim Adams', jid);
        return false;
    }
    console.log('Welcome to bwm xmd', jid);
    return true;
}

// Enhanced authentication with better error handling
async function authentification() {
    try {
        const credsPath = path.join(__dirname, "bwmxmd", "creds.json");
        
        if (!fs.existsSync(path.dirname(credsPath))) {
            fs.mkdirSync(path.dirname(credsPath), { recursive: true });
        }
        
        if (!fs.existsSync(credsPath)) {
            console.log("Bwm xmd session connected ✅");
            const [header, b64data] = conf.session.split(';;;'); 

            if (header === "BWM-XMD" && b64data) {
                let compressedData = Buffer.from(b64data.replace('...', ''), 'base64');
                let decompressedData = zlib.gunzipSync(compressedData);
                fs.writeFileSync(credsPath, decompressedData, "utf8");
            } else {
                throw new Error("Invalid session format");
            }
        } else if (fs.existsSync(credsPath) && conf.session !== "zokk") {
            console.log("Updating existing session...");
            const [header, b64data] = conf.session.split(';;;'); 

            if (header === "BWM-XMD" && b64data) {
                let compressedData = Buffer.from(b64data.replace('...', ''), 'base64');
                let decompressedData = zlib.gunzipSync(compressedData);
                fs.writeFileSync(credsPath, decompressedData, "utf8");
            } else {
                throw new Error("Invalid session format");
            }
        }
        return true;
    } catch (e) {
        console.log("Session Invalid: " + e.message);
        return false;
    }
}

module.exports = { authentification };
let zk;

//===============================================================================//

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

// Enhanced main function with better error handling and reconnection
async function main() {
    if (isReconnecting) {
        console.log("Already reconnecting, skipping...");
        return;
    }
    
    isReconnecting = true;
    
    try {
        // Clear any existing timeouts
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        // Authenticate first
        const authSuccess = await authentification();
        if (!authSuccess) {
            throw new Error("Authentication failed");
        }
        
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(__dirname + "/bwmxmd");
        
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['BWM XMD', "safari", "1.0.0"],
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            getMessage: async (key) => {
                try {
                    if (store) {
                        const msg = await store.loadMessage(key.remoteJid, key.id);
                        return msg?.message || undefined;
                    }
                    return { conversation: 'Error occurred' };
                } catch (error) {
                    console.error('getMessage error:', error);
                    return { conversation: 'Error occurred' };
                }
            }
        };

        adams = makeWASocket(sockOptions);
        store.bind(adams.ev);

        // Enhanced connection monitoring
        connectionTimeout = setTimeout(() => {
            console.log("Connection timeout, forcing reconnect...");
            if (adams && adams.end) adams.end();
        }, 120000); // 2 minutes timeout

        // Heartbeat to monitor connection health
        heartbeatInterval = setInterval(async () => {
            try {
                if (adams && adams.user) {
                    await adams.sendPresenceUpdate("available");
                }
            } catch (error) {
                console.error("Heartbeat failed:", error);
            }
        }, 60000); // Every minute

        const groupCooldowns = new Map();

        function isGroupSpamming(jid) {
            const now = Date.now();
            const lastTime = groupCooldowns.get(jid) || 0;
            if (now - lastTime < RATE_LIMIT_CONFIG.GROUP_MESSAGE_DELAY) return true;
            groupCooldowns.set(jid, now);
            return false;
        }

        // Enhanced anti-delete system with better error handling
        let ibraah = { chats: {} };
        const botJid = `${adams.user?.id.split(':')[0]}@s.whatsapp.net`;
        const botOwnerJid = `${adams.user?.id.split(':')[0]}@s.whatsapp.net`;

        // Enhanced media processing with retry logic
        const processMediaMessage = async (deletedMessage, retries = 3) => {
            let mediaType, mediaInfo;
            
            const mediaTypes = {
                imageMessage: 'image',
                videoMessage: 'video',
                audioMessage: 'audio',
                stickerMessage: 'sticker',
                documentMessage: 'document'
            };

            for (const [key, type] of Object.entries(mediaTypes)) {
                if (deletedMessage.message?.[key]) {
                    mediaType = type;
                    mediaInfo = deletedMessage.message[key];
                    break;
                }
            }

            if (!mediaType || !mediaInfo) return null;

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const mediaStream = await downloadMediaMessage(deletedMessage, { logger });
                    
                    const extensions = {
                        image: 'jpg',
                        video: 'mp4',
                        audio: mediaInfo.mimetype?.includes('mpeg') ? 'mp3' : 'ogg',
                        sticker: 'webp',
                        document: mediaInfo.fileName?.split('.').pop() || 'bin'
                    };
                    
                    const tempPath = path.join(__dirname, `temp_media_${Date.now()}_${attempt}.${extensions[mediaType]}`);
                    await pipeline(mediaStream, fs.createWriteStream(tempPath));
                    
                    return {
                        path: tempPath,
                        type: mediaType,
                        caption: mediaInfo.caption || '',
                        mimetype: mediaInfo.mimetype,
                        fileName: mediaInfo.fileName || `${mediaType}_${Date.now()}.${extensions[mediaType]}`,
                        ptt: mediaInfo.ptt
                    };
                } catch (error) {
                    console.error(`Media processing attempt ${attempt} failed:`, error);
                    if (attempt === retries) {
                        logger.error(`Media processing failed after ${retries} attempts:`, error);
                        return null;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
                }
            }
        };

        // Enhanced deleted message handler with rate limiting
        const handleDeletedMessage = async (deletedMsg, key, deleter) => {
            try {
                // Check rate limit for anti-delete
                if (checkRateLimit(`antidelete_${key.remoteJid}`, key.remoteJid.includes('@g.us'))) {
                    console.log("Anti-delete rate limited for:", key.remoteJid);
                    return;
                }

                const context = createContext(deleter, {
                    title: "Anti-Delete Protection",
                    body: "Deleted message detected",
                    thumbnail: "https://files.catbox.moe/sd49da.jpg"
                });

                const chatInfo = key.remoteJid.includes('@g.us') ? 
                    `Group: ${key.remoteJid}` : 
                    `DM with @${deleter.split('@')[0]}`;

                const promises = [];
                
                if (config.ANTIDELETE1 === "yes") {
                    promises.push((async () => {
                        try {
                            const baseAlert = `♻️ *Anti-Delete Alert* ♻️\n\n` +
                                            `🛑 Deleted by @${deleter.split('@')[0]}\n` +
                                            `💬 In: ${chatInfo}`;

                            if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text) {
                                const text = deletedMsg.message.conversation || 
                                            deletedMsg.message.extendedTextMessage.text;
                                
                                await adams.sendMessage(key.remoteJid, {
                                    text: `${baseAlert}\n\n📝 *Content:* ${text}`,
                                    mentions: [deleter],
                                    ...context
                                });
                            } else {
                                const media = await processMediaMessage(deletedMsg);
                                if (media) {
                                    await adams.sendMessage(key.remoteJid, {
                                        [media.type]: { url: media.path },
                                        caption: media.caption ? 
                                            `${baseAlert}\n\n📌 *Media Caption:* ${media.caption}` : 
                                            baseAlert,
                                        mentions: [deleter],
                                        ...context,
                                        ...(media.type === 'document' ? {
                                            mimetype: media.mimetype,
                                            fileName: media.fileName
                                        } : {}),
                                        ...(media.type === 'audio' ? {
                                            ptt: media.ptt,
                                            mimetype: media.mimetype
                                        } : {})
                                    });

                                    setTimeout(() => {
                                        if (fs.existsSync(media.path)) {
                                            fs.unlink(media.path, (err) => {
                                                if (err) logger.error('Cleanup failed:', err);
                                            });
                                        }
                                    }, 30000);
                                }
                            }
                        } catch (error) {
                            logger.error('Failed to process ANTIDELETE1:', error);
                        }
                    })());
                }

                if (config.ANTIDELETE2 === "yes") {
                    promises.push((async () => {
                        try {
                            const ownerContext = {
                                ...context,
                                text: `👤 Sender: ${deleter}\n💬 Chat: ${chatInfo}`
                            };

                            if (deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text) {
                                const text = deletedMsg.message.conversation || 
                                            deletedMsg.message.extendedTextMessage.text;
                                
                                await adams.sendMessage(botOwnerJid, { 
                                    text: `📩 *Forwarded Deleted Message*\n\n${text}\n\n${ownerContext.text}`,
                                    ...context
                                });
                            } else {
                                const media = await processMediaMessage(deletedMsg);
                                if (media) {
                                    await adams.sendMessage(botOwnerJid, {
                                        [media.type]: { url: media.path },
                                        caption: media.caption ? 
                                            `📩 *Forwarded Deleted Media*\n\n${media.caption}\n\n${ownerContext.text}` : 
                                            `📩 *Forwarded Deleted Media*\n\n${ownerContext.text}`,
                                        ...context,
                                        ...(media.type === 'document' ? {
                                            mimetype: media.mimetype,
                                            fileName: media.fileName
                                        } : {}),
                                        ...(media.type === 'audio' ? {
                                            ptt: media.ptt,
                                            mimetype: media.mimetype
                                        } : {})
                                    });

                                    setTimeout(() => {
                                        if (fs.existsSync(media.path)) {
                                            fs.unlink(media.path, (err) => {
                                                if (err) logger.error('Cleanup failed:', err);
                                            });
                                        }
                                    }, 30000);
                                }
                            }
                        } catch (error) {
                            logger.error('Failed to process ANTIDELETE2:', error);
                            try {
                                await adams.sendMessage(botOwnerJid, {
                                    text: `⚠️ Failed to forward deleted message from ${deleter}\n\nError: ${error.message}`,
                                    ...context
                                });
                            } catch (sendErr) {
                                console.error("Failed to send error notification:", sendErr);
                            }
                        }
                    })());
                }

                await Promise.allSettled(promises);
            } catch (error) {
                logger.error('Anti-delete handling failed:', error);
            }
        };

        // Enhanced message upsert handler with better error recovery
        adams.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const ms = messages[0];
                if (!ms?.message) return;

                const { key } = ms;
                if (!key?.remoteJid) return;

                if (key.remoteJid === 'status@broadcast') return;

                const sender = key.participant || key.remoteJid;
                if (sender === botJid || sender === botOwnerJid || key.fromMe) return;

                // Enhanced message storage with size limits
                if (!ibraah.chats[key.remoteJid]) ibraah.chats[key.remoteJid] = [];
                ibraah.chats[key.remoteJid].push({
                    ...ms,
                    timestamp: Date.now()
                });

                // Keep only last 50 messages per chat to prevent memory issues
                if (ibraah.chats[key.remoteJid].length > 50) {
                    ibraah.chats[key.remoteJid] = ibraah.chats[key.remoteJid].slice(-50);
                }

                // Enhanced deletion detection
                if (ms.message?.protocolMessage?.type === 0) {
                    const deletedId = ms.message.protocolMessage.key.id;
                    const deletedMsg = ibraah.chats[key.remoteJid]?.find(m => m.key.id === deletedId);
                    if (!deletedMsg?.message) return;

                    const deleter = ms.key.participant || ms.key.remoteJid;
                    if (deleter === botJid || deleter === botOwnerJid) return;

                    await handleDeletedMessage(deletedMsg, key, deleter);
                    
                    if (ibraah.chats[key.remoteJid]) {
                        ibraah.chats[key.remoteJid] = ibraah.chats[key.remoteJid].filter(m => m.key.id !== deletedId);
                    }
                }
            } catch (error) {
                console.error('Anti-delete system error:', error);
            }
        });

        // Time-based quotes system (unchanged but with error handling)
        function getTimeBlock() {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 11) return "morning";
            if (hour >= 11 && hour < 16) return "afternoon";
            if (hour >= 16 && hour < 21) return "evening";
            if (hour >= 21 || hour < 2) return "night";
            return "latenight";
        }

        const quotes = {
            morning: ["☀️ ʀɪsᴇ ᴀɴᴅ sʜɪɴᴇ. ɢʀᴇᴀᴛ ᴛʜɪɴɢs ɴᴇᴠᴇʀ ᴄᴀᴍᴇ ғʀᴏᴍ ᴄᴏᴍғᴏʀᴛ ᴢᴏɴᴇs.", "🌅 ᴇᴀᴄʜ ᴍᴏʀɴɪɴɢ ᴡᴇ ᴀʀᴇ ʙᴏʀɴ ᴀɢᴀɪɴ. ᴡʜᴀᴛ ᴡᴇ ᴅᴏ ᴛᴏᴅᴀʏ ɪs ᴡʜᴀᴛ ᴍᴀᴛᴛᴇʀs ᴍᴏsᴛ.", "⚡ sᴛᴀʀᴛ ʏᴏᴜʀ ᴅᴀʏ ᴡɪᴛʜ ᴅᴇᴛᴇʀᴍɪɴᴀᴛɪᴏɴ, ᴇɴᴅ ɪᴛ ᴡɪᴛʜ sᴀᴛɪsғᴀᴄᴛɪᴏɴ.", "🌞 ᴛʜᴇ sᴜɴ ɪs ᴜᴘ, ᴛʜᴇ ᴅᴀʏ ɪs ʏᴏᴜʀs.", "📖 ᴇᴠᴇʀʏ ᴍᴏʀɴɪɴɢ ɪs ᴀ ɴᴇᴡ ᴘᴀɢᴇ ᴏғ ʏᴏᴜʀ sᴛᴏʀʏ. ᴍᴀᴋᴇ ɪᴛ ᴄᴏᴜɴᴛ."],
            afternoon: ["⏳ ᴋᴇᴇᴘ ɢᴏɪɴɢ. ʏᴏᴜ'ʀᴇ ʜᴀʟғᴡᴀʏ ᴛᴏ ɢʀᴇᴀᴛɴᴇss.", "🔄 sᴛᴀʏ ғᴏᴄᴜsᴇᴅ. ᴛʜᴇ ɢʀɪɴᴅ ᴅᴏᴇsɴ'ᴛ sᴛᴏᴘ ᴀᴛ ɴᴏᴏɴ.", "🏗️ sᴜᴄᴄᴇss ɪs ʙᴜɪʟᴛ ɪɴ ᴛʜᴇ ʜᴏᴜʀs ɴᴏʙᴏᴅʏ ᴛᴀʟᴋs ᴀʙᴏᴜᴛ.", "🔥 ᴘᴜsʜ ᴛʜʀᴏᴜɢʜ. ᴄʜᴀᴍᴘɪᴏɴs ᴀʀᴇ ᴍᴀᴅᴇ ɪɴ ᴛʜᴇ ᴍɪᴅᴅʟᴇ ᴏғ ᴛʜᴇ ᴅᴀʏ.", "⏰ ᴅᴏɴ'ᴛ ᴡᴀᴛᴄʜ ᴛʜᴇ ᴄʟᴏᴄᴋ, ᴅᴏ ᴡʜᴀᴛ ɪᴛ ᴅᴏᴇs—ᴋᴇᴇᴘ ɢᴏɪɴɢ."],
            evening: ["🛌 ʀᴇsᴛ ɪs ᴘᴀʀᴛ ᴏғ ᴛʜᴇ ᴘʀᴏᴄᴇss. ʀᴇᴄʜᴀʀɢᴇ ᴡɪsᴇʟʏ.", "🌇 ᴇᴠᴇɴɪɴɢ ʙʀɪɴɢꜱ ꜱɪʟᴇɴᴄᴇ ᴛʜᴀᴛ ꜱᴘᴇᴀᴋꜱ ʟᴏᴜᴅᴇʀ ᴛʜᴀɴ ᴅᴀʏʟɪɢʜᴛ.", "✨ ʏᴏᴜ ᴅɪᴅ ᴡᴇʟʟ ᴛᴏᴅᴀʏ. ᴘʀᴇᴘᴀʀᴇ ғᴏʀ ᴀɴ ᴇᴠᴇɴ ʙᴇᴛᴛᴇʀ ᴛᴏᴍᴏʀʀᴏᴡ.", "🌙 ʟᴇᴛ ᴛʜᴇ ɴɪɢʜᴛ sᴇᴛᴛʟᴇ ɪɴ, ʙᴜᴛ ᴋᴇᴇᴘ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴡɪᴅᴇ ᴀᴡᴀᴋᴇ.", "🧠 ɢʀᴏᴡᴛʜ ᴅᴏᴇsɴ'ᴛ ᴇɴᴅ ᴀᴛ sᴜɴsᴇᴛ. ɪᴛ sʟᴇᴇᴘs ᴡɪᴛʜ ʏᴏᴜ."],
            night: ["🌌 ᴛʜᴇ ɴɪɢʜᴛ ɪs sɪʟᴇɴᴛ, ʙᴜᴛ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴀʀᴇ ʟᴏᴜᴅ.", "⭐ sᴛᴀʀs sʜɪɴᴇ ʙʀɪɢʜᴛᴇsᴛ ɪɴ ᴛʜᴇ ᴅᴀʀᴋ. sᴏ ᴄᴀɴ ʏᴏᴜ.", "🧘‍♂️ ʟᴇᴛ ɢᴏ ᴏғ ᴛʜᴇ ɴᴏɪsᴇ. ᴇᴍʙʀᴀᴄᴇ ᴛʜᴇ ᴘᴇᴀᴄᴇ.", "✅ ʏᴏᴜ ᴍᴀᴅᴇ ɪᴛ ᴛʜʀᴏᴜɢʜ ᴛʜᴇ ᴅᴀʏ. ɴᴏᴡ ᴅʀᴇᴀᴍ ʙɪɢ.", "🌠 ᴍɪᴅɴɪɢʜᴛ ᴛʜᴏᴜɢʜᴛs ᴀʀᴇ ᴛʜᴇ ʙʟᴜᴇᴘʀɪɴᴛ ᴏғ ᴛᴏᴍᴏʀʀᴏᴡ's ɢʀᴇᴀᴛɴᴇss."],
            latenight: ["🕶️ ᴡʜɪʟᴇ ᴛʜᴇ ᴡᴏʀʟᴅ sʟᴇᴇᴘs, ᴛʜᴇ ᴍɪɴᴅs ᴏғ ʟᴇɢᴇɴᴅs ᴡᴀɴᴅᴇʀ.", "⏱️ ʟᴀᴛᴇ ɴɪɢʜᴛs ᴛᴇᴀᴄʜ ᴛʜᴇ ᴅᴇᴇᴘᴇsᴛ ʟᴇssᴏɴs.", "🔕 sɪʟᴇɴᴄᴇ ɪsɴ'ᴛ ᴇᴍᴘᴛʏ—ɪᴛ's ғᴜʟʟ ᴏғ ᴀɴsᴡᴇʀs.", "✨ ᴄʀᴇᴀᴛɪᴠɪᴛʏ ᴡʜɪsᴘᴇʀs ᴡʜᴇɴ ᴛʜᴇ ᴡᴏʀʟᴅ ɪs ǫᴜɪᴇᴛ.", "🌌 ʀᴇsᴛ ᴏʀ ʀᴇғʟᴇᴄᴛ, ʙᴜᴛ ɴᴇᴠᴇʀ ᴡᴀsᴛᴇ ᴛʜᴇ ɴɪɢʜᴛ."]
        };

        function getCurrentDateTime() {
            return new Intl.DateTimeFormat("en", {
                year: "numeric",
                month: "long",
                day: "2-digit"
            }).format(new Date());
        }

        // Enhanced auto bio update with error recovery
        if (conf.AUTO_BIO === "yes") {
            const updateBio = async () => {
                try {
                    if (!adams || !adams.user) return;
                    
                    const block = getTimeBlock();
                    const timeDate = getCurrentDateTime();
                    const timeQuotes = quotes[block];
                    const quote = timeQuotes[Math.floor(Math.random() * timeQuotes.length)];

                    const bioText = `ʙᴡᴍ xᴍᴅ ᴏɴʟɪɴᴇ\n➤ ${quote}\n📅 ${timeDate}`;

                    await adams.updateProfileStatus(bioText);
                } catch (error) {
                    console.error('Bio update failed:', error.message);
                }
            };

            setTimeout(updateBio, 10000);
            setInterval(updateBio, 3600000);
        }

        // Enhanced anti-call system
        if (conf.ANTICALL === 'yes') {
            adams.ev.on("call", async (callData) => {
                try {
                    for (const call of callData) {
                        await adams.rejectCall(call.id, call.from);
                        console.log('Call blocked from:', call.from.slice(0, 6) + '...');
                    }
                } catch (error) {
                    console.error('Call block failed:', error.message);
                }
            });
        }

        // Enhanced presence management
        const updatePresence = async (jid) => {
            try {
                if (!adams || !adams.user) return;
                
                const etat = config.ETAT || 0;
                
                if (etat == 1) {
                    await adams.sendPresenceUpdate("available", jid);
                } else if (etat == 2) {
                    await adams.sendPresenceUpdate("composing", jid);
                } else if (etat == 3) {
                    await adams.sendPresenceUpdate("recording", jid);
                } else {
                    await adams.sendPresenceUpdate("unavailable", jid);
                }
            } catch (e) {
                console.error('Presence update failed:', e.message);
            }
        };

        // Enhanced chatbot system with better API handling
        const googleTTS = require("google-tts-api");
        const { createContext2 } = require("./Ibrahim/helper2");

        const availableApis = [
            "https://bk9.fun/ai/google-thinking?q=",
            "https://bk9.fun/ai/llama?q=",
            "https://bk9.fun/ai/Aoyo?q="
        ];

        function getRandomApi() {
            return availableApis[Math.floor(Math.random() * availableApis.length)];
        }

        function processForTTS(text) {
            if (!text || typeof text !== 'string') return '';
            return text.replace(/[\[\]\(\)\{\}]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .substring(0, 190);
        }

        // Enhanced AI response with retry logic
        async function getAIResponse(query, retries = 2) {
            const identityPatterns = [
                /who\s*(made|created|built)\s*you/i,
                /who\s*is\s*your\s*(creator|developer|maker|owner|father|parent)/i,
                /what('?s| is)\s*your\s*name\??/i,
                /who\s*are\s*you\??/i,
                /who\s*a?you\??/i,
                /who\s*au\??/i,
                /what('?s| is)\s*ur\s*name\??/i,
                /wat('?s| is)\s*(ur|your)\s*name\??/i,
                /wats?\s*(ur|your)\s*name\??/i,
                /wot('?s| is)\s*(ur|your)\s*name\??/i,
                /hoo\s*r\s*u\??/i,
                /who\s*u\??/i,
                /whos\s*u\??/i,
                /whos?\s*this\??/i,
                /you\s*called\s*bwm/i,
                /are\s*you\s*bwm/i,
                /are\s*u\s*bwm/i,
                /u\s*bwm\??/i,
                /who\s*is\s*your\s*boss\??/i,
                /who\s*ur\s*boss\??/i,
                /who\s*your\s*boss\??/i,
                /whoa\s*created\s*you\??/i,
                /who\s*made\s*u\??/i,
                /who\s*create\s*u\??/i,
                /who\s*built\s*u\??/i,
                /who\s*ur\s*owner\??/i,
                /who\s*is\s*u\??/i,
                /what\s*are\s*you\??/i,
                /what\s*r\s*u\??/i,
                /wat\s*r\s*u\??/i
            ];

            const isIdentityQuestion = identityPatterns.some(pattern => 
                typeof query === 'string' && pattern.test(query)
            );

            if (isIdentityQuestion) {
                return 'I am BWM XMD, created by Ibrahim Adams! 🚀';
            }

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const apiUrl = getRandomApi();
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                    const response = await fetch(apiUrl + encodeURIComponent(query), {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'BWM-XMD/1.0'
                        }
                    });

                    clearTimeout(timeout);

                    if (!response.ok) {
                        throw new Error(`API responded with status: ${response.status}`);
                    }
                    
                    let aiResponse;
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        aiResponse = data.BK9 || data.result || data.response || data.message || 
                                   (data.data && (data.data.text || data.data.message)) || 
                                   JSON.stringify(data);
                    } else {
                        aiResponse = await response.text();
                    }

                    if (typeof aiResponse === 'object') {
                        aiResponse = JSON.stringify(aiResponse);
                    }

                    return String(aiResponse) || "I couldn't generate a response.";
                    
                } catch (error) {
                    console.error(`AI API attempt ${attempt} failed:`, error.message);
                    if (attempt === retries) {
                        return "Sorry, I couldn't get a response right now. Please try again later.";
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        // Enhanced chatbot listener with rate limiting
        if (conf.CHATBOT === "yes" || conf.CHATBOT1 === "yes") {
            adams.ev.on("messages.upsert", async ({ messages }) => {
                try {
                    const msg = messages[0];
                    if (!msg?.message || msg.key.fromMe) return;

                    const jid = msg.key.remoteJid;
                    
                    // Rate limit chatbot responses
                    if (checkRateLimit(`chatbot_${jid}`, jid.includes('@g.us'))) {
                        return;
                    }

                    let text = '';
                    
                    if (msg.message.conversation) {
                        text = msg.message.conversation;
                    } else if (msg.message.extendedTextMessage?.text) {
                        text = msg.message.extendedTextMessage.text;
                    } else if (msg.message.imageMessage?.caption) {
                        text = msg.message.imageMessage.caption;
                    }

                    if (!text || typeof text !== 'string' || text.length < 2) return;

                    const aiResponse = await getAIResponse(text);

                    if (conf.CHATBOT === "yes") {
                        await adams.sendMessage(jid, { 
                            text: String(aiResponse),
                            ...createContext(jid, {
                                title: "ʙᴡᴍ xᴍᴅ ᴄʜᴀᴛʙᴏᴛ ᴄᴏɴᴠᴇʀsᴀᴛɪᴏɴ",
                                body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs"
                            })
                        }, { quoted: msg });
                    }

                    if (conf.CHATBOT1 === "yes") {
                        const ttsText = processForTTS(String(aiResponse));
                        if (ttsText) {
                            try {
                                const audioUrl = googleTTS.getAudioUrl(ttsText, {
                                    lang: "en",
                                    slow: false,
                                    host: "https://translate.google.com",
                                });

                                await adams.sendMessage(jid, {
                                    audio: { url: audioUrl },
                                    mimetype: "audio/mpeg",
                                    ptt: true,
                                    ...createContext2(jid, {
                                        title: "ʙᴡᴍ xᴍᴅ ᴀᴜᴅɪᴏ_ᴄʜᴀᴛʙᴏᴛ",
                                        body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs"
                                    })
                                }, { quoted: msg });
                            } catch (ttsError) {
                                console.error("TTS failed:", ttsError);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Chatbot processing error:", error);
                }
            });
        }

        // Enhanced anti-link system
        const isAnyLink = (message) => {
            const linkPattern = /https?:\/\/[^\s]+/;
            return linkPattern.test(message);
        };

        adams.ev.on('messages.upsert', async (msg) => {
            try {
                const { messages } = msg;
                const message = messages[0];

                if (!message.message || message.key.fromMe) return;

                const from = message.key.remoteJid;
                const sender = message.key.participant || message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');

                if (!isGroup) return;

                // Rate limit anti-link actions
                if (checkRateLimit(`antilink_${from}`, true)) {
                    return;
                }

                if (conf.GROUP_ANTILINK === 'yes') {
                    try {
                        const groupMetadata = await adams.groupMetadata(from);
                        const groupAdmins = groupMetadata.participants
                            .filter((member) => member.admin)
                            .map((admin) => admin.id);

                        if (groupAdmins.includes(sender)) return;

                        const messageType = Object.keys(message.message)[0];
                        const body = messageType === 'conversation'
                            ? message.message.conversation
                            : message.message[messageType]?.text || '';

                        if (!body || typeof body !== 'string') return;

                        if (isAnyLink(body)) {
                            await adams.sendMessage(from, { delete: message.key });
                            await adams.groupParticipantsUpdate(from, [sender], 'remove');
                            
                            await adams.sendMessage(from, {
                                text: `⚠️Bwm xmd anti-link online!\nUser @${sender.split('@')[0]} has been removed for sharing a link.`,
                                mentions: [sender],
                            });
                        }
                    } catch (antiLinkError) {
                        console.error('Anti-link error:', antiLinkError);
                    }
                }
            } catch (err) {
                console.error('Error handling anti-link message:', err);
            }
        });

        // Enhanced listener manager with better error handling
        class ListenerManager {
            constructor() {
                this.activeListeners = new Map();
                this.targetListeners = new Set([
                    'Welcome_Goodbye.js',
                    'Status_update.js',
                    'Autoreact_status.js'
                ]);
            }

            async loadListeners(adams, store, commands) {
                const listenerDir = path.join(__dirname, 'bwmxmd');
                
                this.cleanupListeners();
                
                if (!fs.existsSync(listenerDir)) {
                    console.log("Listener directory not found, skipping...");
                    return;
                }
                
                const files = fs.readdirSync(listenerDir).filter(f => 
                    this.targetListeners.has(f)
                );
                
                for (const file of files) {
                    try {
                        const listenerPath = path.join(listenerDir, file);
                        
                        // Clear cache first
                        delete require.cache[require.resolve(listenerPath)];
                        
                        const { setup } = require(listenerPath);
                        
                        if (typeof setup === 'function') {
                            const cleanup = await setup(adams, { 
                                store,
                                commands,
                                logger,
                                config: conf
                            });
                            
                            this.activeListeners.set(file, cleanup);
                        }
                    } catch (e) {
                        console.error(`Error loading listener ${file}:`, e.message);
                    }
                }
            }

            cleanupListeners() {
                for (const [name, cleanup] of this.activeListeners) {
                    try {
                        if (typeof cleanup === 'function') cleanup();
                    } catch (e) {
                        console.error(`Error cleaning up listener ${name}:`, e);
                    }
                }
                this.activeListeners.clear();
            }
        }

        const listenerManager = new ListenerManager();

        // Enhanced command loading with error recovery
        console.log("Loading all commands successfully 🤗\n");
        try {
            const taskflowPath = path.join(__dirname, "adams");
            if (fs.existsSync(taskflowPath)) {
                fs.readdirSync(taskflowPath).forEach((fichier) => {
                    if (path.extname(fichier).toLowerCase() === ".js") {
                        try {
                            delete require.cache[require.resolve(path.join(taskflowPath, fichier))];
                            require(path.join(taskflowPath, fichier));
                        } catch (e) {
                            console.error(`❌ Failed to load ${fichier}: ${e.message}`);
                        }
                    }
                });
            }
        } catch (error) {
            console.error("❌ Error reading Taskflow folder:", error.message);
        }

        // Enhanced message processing with queue system
        const messageQueues = {
            highPriority: [],
            normal: [],
            lowPriority: []
        };
        let isProcessing = false;
        const RATE_LIMITS = {
            highPriority: 10,
            normal: 5,
            lowPriority: 2
        };

        function getPriorityLevel(verifAdmin, isCommandMessage) {
            if (verifAdmin && isCommandMessage) return 'highPriority';
            if (isCommandMessage) return 'normal';
            return 'lowPriority';
        }

        async function processQueues() {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const highPriorityBatch = messageQueues.highPriority.splice(0, RATE_LIMITS.highPriority);
                const normalBatch = messageQueues.normal.splice(0, RATE_LIMITS.normal);
                const lowPriorityBatch = messageQueues.lowPriority.splice(0, RATE_LIMITS.lowPriority);

                await Promise.allSettled([
                    ...highPriorityBatch.map(processMessage),
                    ...normalBatch.map(processMessage),
                    ...lowPriorityBatch.map(processMessage)
                ]);
            } catch (error) {
                console.error('Queue processing error:', error);
            } finally {
                isProcessing = false;
                
                const totalQueued = Object.values(messageQueues).reduce((sum, queue) => sum + queue.length, 0);
                if (totalQueued > 0) {
                    const delay = totalQueued > 100 ? 1000 : 100;
                    setTimeout(processQueues, delay);
                }
            }
        }

        async function processMessage({ handler, resolve }) {
            try {
                await handler();
            } catch (error) {
                console.error('Message processing failed:', error);
            } finally {
                resolve();
            }
        }

        // Enhanced main message handler
        adams.ev.on("messages.upsert", async ({ messages }) => {
            const ms = messages[0];
            if (!ms?.message || !ms?.key) return;

            function standardizeJid(jid) {
                if (!jid) return '';
                try {
                    jid = typeof jid === 'string' ? jid : 
                         (jid.decodeJid ? jid.decodeJid() : String(jid));
                    jid = jid.split(':')[0].split('/')[0];
                    if (!jid.includes('@')) jid += '@s.whatsapp.net';
                    return jid.toLowerCase();
                } catch (e) {
                    console.error("JID standardization error:", e);
                    return '';
                }
            }

            const origineMessage = standardizeJid(ms.key.remoteJid);
            const idBot = standardizeJid(adams.user?.id);
            const verifGroupe = origineMessage.endsWith("@g.us");
            
            // Rate limit based on sender
            if (checkRateLimit(origineMessage, verifGroupe)) {
                return;
            }
            
            let infosGroupe = null;
            let nomGroupe = '';
            try {
                infosGroupe = verifGroupe ? await adams.groupMetadata(origineMessage).catch(() => null) : null;
                nomGroupe = infosGroupe?.subject || '';
            } catch (err) {
                console.error("Group metadata error:", err);
            }

            const msgRepondu = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
            const auteurMsgRepondu = standardizeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            const mentionedJids = (ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || []).map(standardizeJid);

            let auteurMessage = verifGroupe 
                ? standardizeJid(ms.key.participant || ms.participant || origineMessage)
                : origineMessage;
            if (ms.key.fromMe) auteurMessage = idBot;

            const utilisateur = mentionedJids.length > 0 
                ? mentionedJids[0] 
                : msgRepondu 
                    ? auteurMsgRepondu 
                    : '';

            const SUDO_NUMBERS = [
                "254710772666",
                "254106727593",
                "254727716045"
            ];

            const botJid = idBot;
            const ownerJid = standardizeJid(conf.OWNER_NUMBER);

            const superUser = [
                ownerJid,
                botJid,
                ...SUDO_NUMBERS.map(num => standardizeJid(num))
            ];

            const isSuperUser = superUser.includes(auteurMessage);

            let verifAdmin = false;
            let botIsAdmin = false;
            if (verifGroupe && infosGroupe) {
                const admins = infosGroupe.participants
                    .filter(p => p.admin)
                    .map(p => standardizeJid(p.id));
                verifAdmin = admins.includes(standardizeJid(auteurMessage));
                botIsAdmin = admins.includes(botJid);
            }

            const texte = ms.message?.conversation || 
                         ms.message?.extendedTextMessage?.text || 
                         ms.message?.imageMessage?.caption || 
                         '';
            const arg = typeof texte === 'string' ? texte.trim().split(/\s+/).slice(1) : [];
            const verifCom = typeof texte === 'string' && texte.startsWith(PREFIX);
            const com = verifCom ? texte.slice(PREFIX.length).trim().split(/\s+/)[0]?.toLowerCase() : null;

            if (verifCom && com) {
                const cmd = Array.isArray(evt.cm) 
                    ? evt.cm.find((c) => 
                        c?.nomCom === com || 
                        (Array.isArray(c?.aliases) && c.aliases.includes(com))
                    )
                    : null;

                if (cmd) {
                    if (conf.MODE?.toLowerCase() === "no" && !isSuperUser) {
                        return;
                    }

                    // Add command to appropriate queue
                    const priority = getPriorityLevel(verifAdmin, true);
                    
                    return new Promise((resolve) => {
                        const handler = async () => {
                            try {
                                const repondre = async (text, options = {}) => {
                                    if (typeof text !== 'string') return;
                                    try {
                                        await adams.sendMessage(origineMessage, { 
                                            text,
                                            ...createContext(auteurMessage, {
                                                title: options.title || nomGroupe || "BWM-XMD",
                                                body: options.body || ""
                                            })
                                        }, { quoted: ms });
                                    } catch (err) {
                                        console.error("Reply error:", err);
                                    }
                                };

                                if (cmd.reaction) {
                                    try {
                                        await adams.sendMessage(origineMessage, {
                                            react: { 
                                                key: ms.key, 
                                                text: cmd.reaction 
                                            }
                                        });
                                    } catch (err) {
                                        console.error("Reaction error:", err);
                                    }
                                }

                                const context = {
                                    ms,
                                    arg,
                                    repondre,
                                    superUser,
                                    verifAdmin,
                                    botIsAdmin,
                                    verifGroupe,
                                    infosGroupe,
                                    nomGroupe,
                                    auteurMessage,
                                    utilisateur: utilisateur || '',
                                    membreGroupe: verifGroupe ? auteurMessage : '',
                                    origineMessage,
                                    msgRepondu,
                                    auteurMsgRepondu: auteurMsgRepondu || '',
                                    isSuperUser
                                };

                                await cmd.fonction(origineMessage, adams, context);

                            } catch (error) {
                                console.error(`Command error [${com}]:`, error);
                                try {
                                    await adams.sendMessage(origineMessage, {
                                        text: `🚨 Command failed: ${error.message}`,
                                        ...createContext(auteurMessage, {
                                            title: "Error",
                                            body: "Command execution failed"
                                        })
                                    }, { quoted: ms });
                                } catch (sendErr) {
                                    console.error("Error sending error message:", sendErr);
                                }
                            }
                        };

                        messageQueues[priority].push({ handler, resolve });
                        
                        if (!isProcessing) {
                            process.nextTick(processQueues);
                        }
                    });
                }
            }
        });

        // Enhanced connection handlers
        adams.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                console.log("Connected to WhatsApp");
                connectionRetries = 0; // Reset retry counter
                
                // Clear timeouts
                if (connectionTimeout) clearTimeout(connectionTimeout);
                
                setTimeout(async () => {
                    try {
                        if (conf.DP === "yes" && adams && adams.user) {
                            const md = conf.MODE === "yes" ? "public" : "private";
                            const connectionMsg = `┌─❖
│ 𝐁𝐖𝐌 𝐗𝐌𝐃 𝐎𝐍𝐋𝐈𝐍𝐄
└┬❖  
┌┤ ǫᴜᴀɴᴛᴜᴍ ᴠᴇʀsɪᴏɴ
│└────────┈ ⳹  
│ ✅ Prefix: [ ${conf.PREFIX} ] 
│ ☣️ Mode: *${md}*
└────────────┈ ⳹  
│ *ғᴏʀ ᴍᴏʀᴇ ɪɴғᴏ, ᴠɪsɪᴛ*
│ https://business.bwmxmd.online
│ App Name: ${herokuAppName}
└───────────────┈ ⳹  
│  ©ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs
└─────────────────┈ ⳹`;

                            await adams.sendMessage(
                                adams.user.id,
                                {
                                    text: connectionMsg,
                                    ...createContext("BWM XMD", {
                                        title: "SYSTEM ONLINE",
                                        body: "Quantum Version Activated"
                                    })
                                },
                                {
                                    disappearingMessagesInChat: true,
                                    ephemeralExpiration: 600,
                                }
                            );
                        }
                    } catch (err) {
                        console.error("Status message error after delay:", err);
                    }
                }, 5000);

                // Load listeners
                listenerManager.loadListeners(adams, store, commandRegistry)
                    .then(() => console.log('🚀 Enjoy quantum speed 🌎'))
                    .catch(console.error);

                // Update presence
                updatePresence("status@broadcast");

                // Follow newsletter with delay
                setTimeout(() => {
                    try {
                        adams.newsletterFollow("120363285388090068@newsletter");
                    } catch (error) {
                        console.error("Newsletter follow failed:", error);
                    }
                }, 3000);
            }
        });

        // Enhanced connection update handler with exponential backoff
        adams.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (connection === "connecting") {
                console.log("🪩 Bot scanning 🪩");
            }

            if (connection === "open") {
                console.log("🌎 BWM XMD ONLINE 🌎");
                isReconnecting = false;
            }

            if (connection === "close") {
                const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                console.log("Connection closed, reconnecting...");

                if (shouldReconnect && connectionRetries < MAX_RETRIES) {
                    const delay = RETRY_DELAYS[Math.min(connectionRetries, RETRY_DELAYS.length - 1)];
                    console.log(`Reconnecting in ${delay}ms... (attempt ${connectionRetries + 1}/${MAX_RETRIES})`);
                    
                    setTimeout(() => {
                        connectionRetries++;
                        isReconnecting = false;
                        main();
                    }, delay);
                } else if (connectionRetries >= MAX_RETRIES) {
                    console.error("Max reconnection attempts reached. Manual intervention required.");
                    process.exit(1);
                } else {
                    console.log("Logged out, stopping reconnection attempts.");
                }

                // Cleanup listeners
                listenerManager.cleanupListeners();
            }
        });

        // Save credentials
        adams.ev.on("creds.update", saveCreds);

        // Hot reload for listeners
        if (fs.existsSync(path.join(__dirname, 'bwmxmd'))) {
            fs.watch(path.join(__dirname, 'bwmxmd'), (eventType, filename) => {
                if (eventType === 'change' && listenerManager.targetListeners.has(filename)) {
                    console.log(`♻️ Reloading listener: ${filename}`);
                    delete require.cache[require.resolve(path.join(__dirname, 'bwmxmd', filename))];
                    listenerManager.loadListeners(adams, store, commandRegistry)
                        .catch(console.error);
                }
            });
        }

    } catch (error) {
        console.error("Main function error:", error);
        isReconnecting = false;
        
        if (connectionRetries < MAX_RETRIES) {
            const delay = RETRY_DELAYS[Math.min(connectionRetries, RETRY_DELAYS.length - 1)];
            console.log(`Retrying main function in ${delay}ms...`);
            setTimeout(() => {
                connectionRetries++;
                main();
            }, delay);
        } else {
            console.error("Max retries reached in main function. Exiting.");
            process.exit(1);
        }
    }
}

// Enhanced startup with delay
setTimeout(() => {
    main().catch(err => {
        console.log("Initialization error:", err);
        setTimeout(() => {
            console.log("Retrying initialization...");
            main().catch(console.error);
        }, 5000);
    });
}, 5000);
