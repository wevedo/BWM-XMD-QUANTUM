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

// 🚀 ENHANCED CONNECTION & RATE LIMITING SYSTEM
let connectionRetries = 0;
const MAX_RETRIES = 15;
const RETRY_DELAYS = [2000, 5000, 10000, 15000, 30000, 60000, 120000]; // Progressive delays
let isReconnecting = false;
let connectionTimeout = null;
let heartbeatInterval = null;
let lastHeartbeat = Date.now();

// 🔥 ADVANCED RATE LIMITING FOR GROUPS AND SESSIONS
const groupRateLimits = new Map();
const userRateLimits = new Map();
const sessionCooldowns = new Map();
const commandQueue = new Map();

const RATE_LIMITS = {
    GROUP_MESSAGE_DELAY: 2500,     // 2.5 seconds between group messages
    USER_MESSAGE_DELAY: 1200,      // 1.2 seconds between user messages
    COMMAND_COOLDOWN: 3000,        // 3 seconds between commands per user
    SESSION_RETRY_DELAY: 5000,     // 5 seconds before session retry
    MAX_MESSAGES_PER_MINUTE: 15,   // Reduced to prevent rate limiting
    MAX_QUEUE_SIZE: 50,            // Maximum queue size per chat
    CLEANUP_INTERVAL: 600000,      // 10 minutes cleanup
    HEARTBEAT_INTERVAL: 45000,     // 45 seconds heartbeat
    CONNECTION_TIMEOUT: 180000     // 3 minutes connection timeout
};

// 🛡️ SESSION ERROR RECOVERY SYSTEM
const sessionErrors = new Map();
const MAX_SESSION_ERRORS = 3;

function handleSessionError(jid, error) {
    const now = Date.now();
    if (!sessionErrors.has(jid)) {
        sessionErrors.set(jid, { count: 0, lastError: now });
    }
    
    const errorData = sessionErrors.get(jid);
    errorData.count++;
    errorData.lastError = now;
    
    console.log(`Session error for ${jid}: ${error.message} (Count: ${errorData.count})`);
    
    if (errorData.count >= MAX_SESSION_ERRORS) {
        console.log(`Too many session errors for ${jid}, cooling down...`);
        sessionCooldowns.set(jid, now + RATE_LIMITS.SESSION_RETRY_DELAY * errorData.count);
        return true; // Should skip this chat
    }
    
    return false;
}

// 🔄 ENHANCED RATE LIMITING WITH SESSION AWARENESS
function checkRateLimit(jid, isGroup = false, isCommand = false) {
    const now = Date.now();
    
    // Check session cooldown first
    if (sessionCooldowns.has(jid)) {
        const cooldownEnd = sessionCooldowns.get(jid);
        if (now < cooldownEnd) {
            return true; // Still in cooldown
        }
        sessionCooldowns.delete(jid);
        // Reset session errors when cooldown ends
        if (sessionErrors.has(jid)) {
            sessionErrors.get(jid).count = 0;
        }
    }
    
    const rateLimitMap = isGroup ? groupRateLimits : userRateLimits;
    const baseDelay = isGroup ? RATE_LIMITS.GROUP_MESSAGE_DELAY : RATE_LIMITS.USER_MESSAGE_DELAY;
    const delay = isCommand ? Math.max(baseDelay, RATE_LIMITS.COMMAND_COOLDOWN) : baseDelay;
    
    if (!rateLimitMap.has(jid)) {
        rateLimitMap.set(jid, { 
            lastActivity: now, 
            messageCount: 1,
            lastMinute: now,
            commandCount: isCommand ? 1 : 0
        });
        return false;
    }
    
    const userData = rateLimitMap.get(jid);
    
    // Check activity delay
    if (now - userData.lastActivity < delay) {
        return true; // Rate limited
    }
    
    // Reset counters if minute has passed
    if (now - userData.lastMinute > 60000) {
        userData.messageCount = 0;
        userData.commandCount = 0;
        userData.lastMinute = now;
    }
    
    // Check message limits
    if (userData.messageCount >= RATE_LIMITS.MAX_MESSAGES_PER_MINUTE) {
        return true; // Rate limited
    }
    
    // Special command rate limiting
    if (isCommand && userData.commandCount >= 8) { // Max 8 commands per minute
        return true;
    }
    
    userData.lastActivity = now;
    userData.messageCount++;
    if (isCommand) userData.commandCount++;
    
    return false;
}

// 🧹 ENHANCED CLEANUP SYSTEM
setInterval(() => {
    const now = Date.now();
    
    // Clean rate limits
    [groupRateLimits, userRateLimits].forEach(map => {
        for (const [key, data] of map.entries()) {
            if (now - data.lastActivity > RATE_LIMITS.CLEANUP_INTERVAL) {
                map.delete(key);
            }
        }
    });
    
    // Clean session errors
    for (const [key, data] of sessionErrors.entries()) {
        if (now - data.lastError > RATE_LIMITS.CLEANUP_INTERVAL) {
            sessionErrors.delete(key);
        }
    }
    
    // Clean session cooldowns
    for (const [key, cooldownEnd] of sessionCooldowns.entries()) {
        if (now > cooldownEnd) {
            sessionCooldowns.delete(key);
        }
    }
    
    console.log(`Cleanup: ${groupRateLimits.size} groups, ${userRateLimits.size} users, ${sessionErrors.size} session errors`);
}, RATE_LIMITS.CLEANUP_INTERVAL);

app.use(express.static("adams"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// 🏥 ENHANCED HEALTH CHECK
app.get("/health", (req, res) => {
    const status = {
        status: adams ? "online" : "offline",
        uptime: process.uptime(),
        retries: connectionRetries,
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
        activeGroups: groupRateLimits.size,
        activeUsers: userRateLimits.size,
        sessionErrors: sessionErrors.size,
        timestamp: new Date().toISOString()
    };
    res.json(status);
});

const server = app.listen(PORT, () => console.log(`Bwm xmd is starting with a speed of ${PORT}ms🚀`));

// 🔄 GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (adams && adams.end) adams.end();
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (adams && adams.end) adams.end();
    server.close(() => process.exit(0));
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

// 🔐 ENHANCED AUTHENTICATION WITH RETRY
async function authentification() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
            console.log(`Session attempt ${attempt} failed: ${e.message}`);
            if (attempt === maxRetries) {
                console.log("All authentication attempts failed");
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}

module.exports = { authentification };
let zk;

//===============================================================================//

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

// 🚀 SUPER ENHANCED MAIN FUNCTION WITH BULLETPROOF ERROR HANDLING
async function main() {
    if (isReconnecting) {
        console.log("Already reconnecting, skipping...");
        return;
    }
    
    isReconnecting = true;
    
    try {
        // Clear existing intervals/timeouts
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        // Enhanced authentication
        const authSuccess = await authentification();
        if (!authSuccess) {
            throw new Error("Authentication failed after multiple attempts");
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
            connectTimeoutMs: RATE_LIMITS.CONNECTION_TIMEOUT,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: RATE_LIMITS.HEARTBEAT_INTERVAL,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            maxMsgRetryCount: 3,
            transactionOpts: {
                maxCommitRetries: 10,
                delayBetweenTriesMs: 3000
            },
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
        
        // Reset connection state
        connectionRetries = 0;
        lastHeartbeat = Date.now();

        // 💗 ENHANCED HEARTBEAT SYSTEM
        heartbeatInterval = setInterval(async () => {
            try {
                if (adams && adams.user) {
                    await adams.sendPresenceUpdate("available");
                    lastHeartbeat = Date.now();
                    
                    // Check if connection is still alive
                    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
                    if (timeSinceLastHeartbeat > RATE_LIMITS.HEARTBEAT_INTERVAL * 2) {
                        console.log("Heartbeat timeout detected, reconnecting...");
                        throw new Error("Heartbeat timeout");
                    }
                }
            } catch (error) {
                console.error("Heartbeat failed, connection may be lost:", error);
                if (adams && adams.end) adams.end();
            }
        }, RATE_LIMITS.HEARTBEAT_INTERVAL);

        // 🔄 CONNECTION TIMEOUT HANDLER
        connectionTimeout = setTimeout(() => {
            console.log("Connection establishment timeout, forcing reconnect...");
            if (adams && adams.end) adams.end();
        }, RATE_LIMITS.CONNECTION_TIMEOUT);

        const groupCooldowns = new Map();

        function isGroupSpamming(jid) {
            const now = Date.now();
            const lastTime = groupCooldowns.get(jid) || 0;
            if (now - lastTime < RATE_LIMITS.GROUP_MESSAGE_DELAY) return true;
            groupCooldowns.set(jid, now);
            return false;
        }

        // 🔄 ENHANCED ANTI-DELETE SYSTEM WITH SESSION RECOVERY
        let ibraah = { chats: {} };
        const botJid = adams.user?.id ? `${adams.user.id.split(':')[0]}@s.whatsapp.net` : '';
        const botOwnerJid = adams.user?.id ? `${adams.user.id.split(':')[0]}@s.whatsapp.net` : '';

        // 🎯 ENHANCED MEDIA PROCESSING WITH SESSION ERROR HANDLING
        const processMediaMessage = async (deletedMessage, retries = 2) => {
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
                    if (attempt === retries) return null;
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        };

        // 🛡️ ENHANCED DELETED MESSAGE HANDLER WITH SESSION ERROR RECOVERY
        const handleDeletedMessage = async (deletedMsg, key, deleter) => {
            try {
                // Check if this chat has session errors
                if (handleSessionError(key.remoteJid, new Error("Checking session"))) {
                    console.log(`Skipping anti-delete for ${key.remoteJid} due to session errors`);
                    return;
                }

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
                            
                            // Clear session errors on successful send
                            if (sessionErrors.has(key.remoteJid)) {
                                sessionErrors.get(key.remoteJid).count = 0;
                            }
                        } catch (error) {
                            console.error('Failed to process ANTIDELETE1:', error);
                            if (error.message.includes('No sessions')) {
                                handleSessionError(key.remoteJid, error);
                            }
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
                            console.error('Failed to process ANTIDELETE2:', error);
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
                console.error('Anti-delete handling failed:', error);
                if (error.message.includes('No sessions')) {
                    handleSessionError(key.remoteJid, error);
                }
            }
        };

        // 🔄 ENHANCED MESSAGE UPSERT WITH SESSION ERROR RECOVERY
        adams.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const ms = messages[0];
                if (!ms?.message || !ms?.key) return;

                const { key } = ms;
                if (!key?.remoteJid || key.remoteJid === 'status@broadcast') return;

                const sender = key.participant || key.remoteJid;
                if (sender === botJid || sender === botOwnerJid || key.fromMe) return;

                // Check for session errors before processing
                if (sessionCooldowns.has(key.remoteJid)) {
                    console.log(`Skipping message from ${key.remoteJid} due to session cooldown`);
                    return;
                }

                // Enhanced message storage with better memory management
                if (!ibraah.chats[key.remoteJid]) ibraah.chats[key.remoteJid] = [];
                ibraah.chats[key.remoteJid].push({
                    ...ms,
                    timestamp: Date.now()
                });

                // Keep only last 30 messages per chat to prevent memory issues
                if (ibraah.chats[key.remoteJid].length > 30) {
                    ibraah.chats[key.remoteJid] = ibraah.chats[key.remoteJid].slice(-30);
                }

                // Enhanced deletion detection with session error handling
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
                console.error('Message upsert error:', error);
                if (error.message.includes('No sessions')) {
                    const key = messages[0]?.key;
                    if (key?.remoteJid) {
                        handleSessionError(key.remoteJid, error);
                    }
                }
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

        // Enhanced auto bio update with session error handling
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
                    if (error.message.includes('No sessions')) {
                        console.log('Bio update failed due to session error, will retry later');
                    }
                }
            };

            setTimeout(updateBio, 15000); // Increased delay
            setInterval(updateBio, 3600000);
        }

        // Enhanced anti-call system with session error handling
        if (conf.ANTICALL === 'yes') {
            adams.ev.on("call", async (callData) => {
                try {
                    for (const call of callData) {
                        await adams.rejectCall(call.id, call.from);
                        console.log('Call blocked from:', call.from.slice(0, 6) + '...');
                    }
                } catch (error) {
                    console.error('Call block failed:', error.message);
                    if (error.message.includes('No sessions')) {
                        handleSessionError('call_reject', error);
                    }
                }
            });
        }

        // Enhanced presence update with session error handling
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
                if (e.message.includes('No sessions')) {
                    handleSessionError(jid || 'presence', e);
                }
            }
        };

        // Enhanced presence event handlers
        adams.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                setTimeout(() => updatePresence("status@broadcast"), 3000);
            }
        });

        adams.ev.on("messages.upsert", async ({ messages }) => {
            if (messages && messages.length > 0) {
                const jid = messages[0].key.remoteJid;
                if (!sessionCooldowns.has(jid)) {
                    await updatePresence(jid);
                }
            }
        });

        // 🤖 ENHANCED CHATBOT SYSTEM WITH SESSION ERROR RECOVERY
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

        async function getAIResponse(query) {
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
            
            try {
                const apiUrl = getRandomApi();
                const response = await fetch(apiUrl + encodeURIComponent(query));
                
                try {
                    const data = await response.json();
                    let aiResponse = data.BK9 || data.result || data.response || data.message || 
                                   (data.data && (data.data.text || data.data.message)) || 
                                   JSON.stringify(data);
                    
                    if (typeof aiResponse === 'object') {
                        aiResponse = JSON.stringify(aiResponse);
                    }

                    if (isIdentityQuestion) {
                        aiResponse = 'I am BWM XMD, created by Ibrahim Adams! 🚀';
                    }
                    
                    return aiResponse;
                } catch (jsonError) {
                    const textResponse = await response.text();
                    return isIdentityQuestion 
                        ? `I am BWM XMD, created by Ibrahim Adams! 🚀`
                        : textResponse;
                }
            } catch (error) {
                console.error("API Error:", error);
                return isIdentityQuestion 
                    ? "I'm BWM XMD, created by Ibrahim Adams! 🚀"
                    : "Sorry, I couldn't get a response right now";
            }
        }

        if (conf.CHATBOT === "yes" || conf.CHATBOT1 === "yes") {
            adams.ev.on("messages.upsert", async ({ messages }) => {
                try {
                    const msg = messages[0];
                    if (!msg?.message || msg.key.fromMe) return;

                    const jid = msg.key.remoteJid;
                    
                    // Check for session errors before processing chatbot
                    if (sessionCooldowns.has(jid)) {
                        console.log(`Skipping chatbot for ${jid} due to session cooldown`);
                        return;
                    }
                    
                    // Enhanced rate limiting for chatbot
                    if (checkRateLimit(jid, jid.includes('@g.us'))) {
                        console.log(`Chatbot rate limited for ${jid}`);
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

                    if (!text || typeof text !== 'string') return;

                    const aiResponse = await getAIResponse(text);

                    // Text response with session error handling
                    if (conf.CHATBOT === "yes") {
                        try {
                            await adams.sendMessage(jid, { 
                                text: String(aiResponse),
                                ...createContext(jid, {
                                    title: "ʙᴡᴍ xᴍᴅ ᴄʜᴀᴛʙᴏᴛ ᴄᴏɴᴠᴇʀsᴀᴛɪᴏɴ",
                                    body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs"
                                })
                            }, { quoted: msg });
                            
                            // Clear session errors on successful send
                            if (sessionErrors.has(jid)) {
                                sessionErrors.get(jid).count = 0;
                            }
                        } catch (error) {
                            console.error("Chatbot text response error:", error);
                            if (error.message.includes('No sessions')) {
                                handleSessionError(jid, error);
                            }
                        }
                    }

                    // Voice response with session error handling
                    if (conf.CHATBOT1 === "yes") {
                        try {
                            const ttsText = processForTTS(String(aiResponse));
                            if (ttsText) {
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
                                
                                // Clear session errors on successful send
                                if (sessionErrors.has(jid)) {
                                    sessionErrors.get(jid).count = 0;
                                }
                            }
                        } catch (error) {
                            console.error("Chatbot voice response error:", error);
                            if (error.message.includes('No sessions')) {
                                handleSessionError(jid, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Chatbot processing error:", error);
                }
            });
        }

        // 🔗 ENHANCED ANTI-LINK SYSTEM WITH SESSION ERROR RECOVERY
        const isAnyLink = (message) => {
            const linkPattern = /https?:\/\/[^\s]+/;
            return linkPattern.test(message);
        };

        adams.ev.on('messages.upsert', async (msg) => {
            try {
                const { messages } = msg;
                const message = messages[0];

                if (!message.message) return;

                const from = message.key.remoteJid;
                const sender = message.key.participant || message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');

                if (!isGroup) return;

                // Check for session errors before processing anti-link
                if (sessionCooldowns.has(from)) {
                    console.log(`Skipping anti-link for ${from} due to session cooldown`);
                    return;
                }

                // Enhanced rate limiting for anti-link
                if (checkRateLimit(`antilink_${from}`, true)) {
                    console.log(`Anti-link rate limited for ${from}`);
                    return;
                }

                let groupMetadata, groupAdmins;
                try {
                    groupMetadata = await adams.groupMetadata(from);
                    groupAdmins = groupMetadata.participants
                        .filter((member) => member.admin)
                        .map((admin) => admin.id);
                } catch (error) {
                    console.error("Group metadata error:", error);
                    if (error.message.includes('No sessions') || error.message.includes('rate-overlimit')) {
                        handleSessionError(from, error);
                    }
                    return;
                }

                if (conf.GROUP_ANTILINK === 'yes') {
                    const messageType = Object.keys(message.message)[0];
                    const body =
                        messageType === 'conversation'
                            ? message.message.conversation
                            : message.message[messageType]?.text || '';

                    if (!body) return;
                    if (groupAdmins.includes(sender)) return;

                    if (isAnyLink(body)) {
                        try {
                            await adams.sendMessage(from, { delete: message.key });
                            
                            await adams.groupParticipantsUpdate(from, [sender], 'remove');

                            await adams.sendMessage(
                                from,
                                {
                                    text: `⚠️Bwm xmd anti-link online!\n User @${sender.split('@')[0]} has been removed for sharing a link.`,
                                    mentions: [sender],
                                }
                            );
                            
                            // Clear session errors on successful anti-link action
                            if (sessionErrors.has(from)) {
                                sessionErrors.get(from).count = 0;
                            }
                        } catch (error) {
                            console.error('Anti-link action failed:', error);
                            if (error.message.includes('No sessions') || error.message.includes('rate-overlimit')) {
                                handleSessionError(from, error);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Anti-link handler error:', err);
            }
        });

        // 🎧 ENHANCED LISTENER MANAGER WITH SESSION ERROR RECOVERY
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
                
                const files = fs.readdirSync(listenerDir).filter(f => 
                    this.targetListeners.has(f)
                );
                
                for (const file of files) {
                    try {
                        const listenerPath = path.join(listenerDir, file);
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
                        console.error(`Error loading listener ${file}:`, e);
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

        // Enhanced connection handler with session error recovery
        adams.ev.on('connection.update', ({ connection }) => {
            if (connection === 'open') {
                // Clear connection timeout since we're connected
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                
                // Reset session errors on successful connection
                sessionErrors.clear();
                sessionCooldowns.clear();
                
                listenerManager.loadListeners(adams, store, commandRegistry)
                    .then(() => console.log('🚀 Enjoy quantum speed 🌎'))
                    .catch(console.error);
            }
            
            if (connection === 'close') {
                listenerManager.cleanupListeners();
            }
        });

        // Enhanced file watcher with session error handling
        fs.watch(path.join(__dirname, 'bwmxmd'), (eventType, filename) => {
            if (eventType === 'change' && listenerManager.targetListeners.has(filename)) {
                console.log(`♻️ Reloading listener: ${filename}`);
                delete require.cache[require.resolve(path.join(__dirname, 'bwmxmd', filename))];
                
                // Only reload if we don't have session issues
                if (sessionErrors.size === 0) {
                    listenerManager.loadListeners(adams, store, commandRegistry)
                        .catch(console.error);
                }
            }
        });

        // 🔧 LOAD COMMANDS WITH ERROR HANDLING
        console.log("Loading all commands successfully 🤗\n");
        try {
            const taskflowPath = path.join(__dirname, "adams");
            fs.readdirSync(taskflowPath).forEach((fichier) => {
                if (path.extname(fichier).toLowerCase() === ".js") {
                    try {
                        require(path.join(taskflowPath, fichier));
                    } catch (e) {
                        console.error(`❌ Failed to load ${fichier}: ${e.message}`);
                    }
                }
            });
        } catch (error) {
            console.error("❌ Error reading Taskflow folder:", error.message);
        }

        // 🚀 ENHANCED MESSAGE PROCESSING WITH BULLETPROOF SESSION ERROR RECOVERY
        adams.ev.on("messages.upsert", async ({ messages }) => {
            const ms = messages[0];
            if (!ms?.message || !ms?.key) return;

            // Enhanced JID standardization with better error handling
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
            
            // Check for session errors before processing commands
            if (sessionCooldowns.has(origineMessage)) {
                console.log(`Skipping command processing for ${origineMessage} due to session cooldown`);
                return;
            }
            
            let infosGroupe = null;
            let nomGroupe = '';
            try {
                if (verifGroupe) {
                    infosGroupe = await adams.groupMetadata(origineMessage);
                    nomGroupe = infosGroupe?.subject || '';
                }
            } catch (err) {
                console.error("Group metadata error:", err);
                if (err.message.includes('No sessions') || err.message.includes('rate-overlimit')) {
                    handleSessionError(origineMessage, err);
                    return;
                }
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

            // Enhanced admin verification with session error handling
            let verifAdmin = false;
            let botIsAdmin = false;
            if (verifGroupe && infosGroupe) {
                try {
                    const admins = infosGroupe.participants
                        .filter(p => p.admin)
                        .map(p => standardizeJid(p.id));
                    verifAdmin = admins.includes(standardizeJid(auteurMessage));
                    botIsAdmin = admins.includes(botJid);
                } catch (error) {
                    console.error("Admin verification error:", error);
                }
            }

            // Enhanced message processing with command detection
            const texte = ms.message?.conversation || 
                         ms.message?.extendedTextMessage?.text || 
                         ms.message?.imageMessage?.caption || 
                         '';
            const arg = typeof texte === 'string' ? texte.trim().split(/\s+/).slice(1) : [];
            const verifCom = typeof texte === 'string' && texte.startsWith(PREFIX);
            const com = verifCom ? texte.slice(PREFIX.length).trim().split(/\s+/)[0]?.toLowerCase() : null;

            if (verifCom && com) {
                // Enhanced rate limiting for commands
                if (checkRateLimit(auteurMessage, verifGroupe, true)) {
                    console.log(`Command rate limited for ${auteurMessage}: ${com}`);
                    return;
                }

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

                    try {
                        // Enhanced reply function with session error handling
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
                                
                                // Clear session errors on successful send
                                if (sessionErrors.has(origineMessage)) {
                                    sessionErrors.get(origineMessage).count = 0;
                                }
                            } catch (err) {
                                console.error("Reply error:", err);
                                if (err.message.includes('No sessions') || err.message.includes('rate-overlimit')) {
                                    handleSessionError(origineMessage, err);
                                }
                            }
                        };

                        // Enhanced reaction with session error handling
                        if (cmd.reaction) {
                            try {
                                await adams.sendMessage(origineMessage, {
                                    react: { 
                                        key: ms.key, 
                                        text: cmd.reaction 
                                    }
                                });
                                
                                // Clear session errors on successful reaction
                                if (sessionErrors.has(origineMessage)) {
                                    sessionErrors.get(origineMessage).count = 0;
                                }
                            } catch (err) {
                                console.error("Reaction error:", err);
                                if (err.message.includes('No sessions') || err.message.includes('rate-overlimit')) {
                                    handleSessionError(origineMessage, err);
                                }
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
                        
                        if (error.message.includes('No sessions') || error.message.includes('rate-overlimit')) {
                            handleSessionError(origineMessage, error);
                        } else {
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
                                if (sendErr.message.includes('No sessions')) {
                                    handleSessionError(origineMessage, sendErr);
                                }
                            }
                        }
                    }
                }
            }
        });

        // 🔗 ENHANCED CONNECTION HANDLERS WITH BULLETPROOF RECOVERY
        adams.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                console.log("Connected to WhatsApp");

                setTimeout(async () => {
                    try {
                        if (conf.DP === "yes") {
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
                }, 8000); // Increased delay for better stability
            }
        });

        // 🔄 ENHANCED CONNECTION UPDATE HANDLER WITH PROGRESSIVE RETRY
        adams.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "connecting") {
                console.log("🪩 Bot scanning 🪩");
            }

            if (connection === "open") {
                console.log("🌎 BWM XMD ONLINE 🌎");
                
                // Reset connection retry counter
                connectionRetries = 0;
                isReconnecting = false;
                
                // Clear timeouts since we're connected
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }

                setTimeout(() => {
                    try {
                        adams.newsletterFollow("120363285388090068@newsletter");
                    } catch (error) {
                        console.error("Newsletter follow error:", error);
                    }
                }, 5000);
            }

            if (connection === "close") {
                const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                console.log("Connection closed, reconnecting...");
                
                isReconnecting = false; // Reset flag to allow reconnection

                if (shouldReconnect && connectionRetries < MAX_RETRIES) {
                    connectionRetries++;
                    const delay = RETRY_DELAYS[Math.min(connectionRetries - 1, RETRY_DELAYS.length - 1)];
                    
                    console.log(`Reconnection attempt ${connectionRetries}/${MAX_RETRIES} in ${delay}ms`);
                    
                    setTimeout(() => {
                        main().catch(err => {
                            console.log("Reconnection failed:", err.message);
                            isReconnecting = false;
                        });
                    }, delay);
                } else if (connectionRetries >= MAX_RETRIES) {
                    console.log("Max reconnection attempts reached. Waiting 5 minutes before trying again...");
                    setTimeout(() => {
                        connectionRetries = 0;
                        main().catch(err => console.log("Final reconnection attempt failed:", err.message));
                    }, 300000); // 5 minutes
                }
            }
        });

        // Enhanced credential saving with error handling
        adams.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error("Main function error:", error);
        isReconnecting = false;
        
        if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            const delay = RETRY_DELAYS[Math.min(connectionRetries - 1, RETRY_DELAYS.length - 1)];
            console.log(`Retrying main function in ${delay}ms (attempt ${connectionRetries}/${MAX_RETRIES})`);
            
            setTimeout(() => {
                main().catch(err => {
                    console.log("Retry failed:", err.message);
                    isReconnecting = false;
                });
            }, delay);
        }
    }
}

// 🚀 ENHANCED STARTUP WITH DELAY
setTimeout(() => {
    main().catch(err => {
        console.log("Initialization error:", err.message);
        isReconnecting = false;
        
        // Try again after 10 seconds if initial startup fails
        setTimeout(() => {
            main().catch(finalErr => console.log("Final startup attempt failed:", finalErr.message));
        }, 10000);
    });
}, 8000); // Increased startup delay for better stability
