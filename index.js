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
const RATE_LIMIT_WINDOW = 3000;
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

// 🔥 GROUP SESSION BUILDING - ONLY FOR GROUPS
const groupSessionsBuilt = new Set();

async function buildGroupSessionLikeEtat(groupJid) {
    if (groupSessionsBuilt.has(groupJid)) {
        return true;
    }
    
    try {
        groupSessionsBuilt.add(groupJid);
        
        // Method 1: Send presence update (like ETAT)
        await adams.sendPresenceUpdate("available", groupJid);
        
        // Method 2: Subscribe to presence 
        if (adams.presenceSubscribe) {
            await adams.presenceSubscribe(groupJid);
        }
        
        // Method 3: Get group metadata
        await adams.groupMetadata(groupJid);
        
        return true;
    } catch (error) {
        groupSessionsBuilt.delete(groupJid);
        return false;
    }
}

// 🛡️ IMMEDIATE ANTILINK - ALL LINK TYPES
const linkPatterns = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[^\s]+\.(com|org|net|co|io|me|ly|app|dev|tech|info|biz|tv|fm|gg|cc|tk|ml|ga|cf|xyz|site|online|store|shop)[^\s]*/gi,
    /t\.me\/[^\s]+/gi,
    /telegram\.me\/[^\s]+/gi,
    /discord\.gg\/[^\s]+/gi,
    /discord\.com\/[^\s]+/gi,
    /whatsapp\.com\/[^\s]+/gi,
    /chat\.whatsapp\.com\/[^\s]+/gi,
    /wa\.me\/[^\s]+/gi,
    /youtube\.com\/[^\s]+/gi,
    /youtu\.be\/[^\s]+/gi,
    /facebook\.com\/[^\s]+/gi,
    /fb\.com\/[^\s]+/gi,
    /instagram\.com\/[^\s]+/gi,
    /twitter\.com\/[^\s]+/gi,
    /tiktok\.com\/[^\s]+/gi,
    /snapchat\.com\/[^\s]+/gi,
    /linkedin\.com\/[^\s]+/gi,
    /pinterest\.com\/[^\s]+/gi,
    /reddit\.com\/[^\s]+/gi,
    /github\.com\/[^\s]+/gi,
    /[^\s]+\.link[^\s]*/gi,
    /bit\.ly\/[^\s]+/gi,
    /tinyurl\.com\/[^\s]+/gi,
    /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]*/gi
];

function containsLink(text) {
    if (!text || typeof text !== 'string') return false;
    return linkPatterns.some(pattern => pattern.test(text));
}

const groupRateLimits = new Map();
const userRateLimits = new Map();

function checkRateLimit(jid, isGroup = false) {
    const now = Date.now();
    const rateLimitMap = isGroup ? groupRateLimits : userRateLimits;
    const delay = isGroup ? 1000 : 800;
    
    if (!rateLimitMap.has(jid)) {
        rateLimitMap.set(jid, { lastActivity: now });
        return false;
    }
    
    const userData = rateLimitMap.get(jid);
    if (now - userData.lastActivity < delay) {
        return true;
    }
    
    userData.lastActivity = now;
    return false;
}

setInterval(() => {
    const now = Date.now();
    [groupRateLimits, userRateLimits].forEach(map => {
        for (const [key, data] of map.entries()) {
            if (now - data.lastActivity > 300000) {
                map.delete(key);
            }
        }
    });
}, 300000);

let connectionRetries = 0;
const MAX_RETRIES = 10;
let isReconnecting = false;
let heartbeatInterval = null;

app.use(express.static("adams"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.listen(PORT, () => console.log(`Bwm xmd is starting with a speed of ${PORT}ms🚀`));

//============================================================================//

function atbverifierEtatJid(jid) {
    if (!jid.endsWith('@s.whatsapp.net')) {
        console.error('Your verified by Sir Ibrahim Adams', jid);
        return false;
    }
    console.log('Welcome to bwm xmd', jid);
    return true;
}

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/bwmxmd/creds.json")) {
            console.log("Bwm xmd session connected ✅");
            const [header, b64data] = conf.session.split(';;;'); 

            if (header === "BWM-XMD" && b64data) {
                let compressedData = Buffer.from(b64data.replace('...', ''), 'base64');
                let decompressedData = zlib.gunzipSync(compressedData);
                fs.writeFileSync(__dirname + "/bwmxmd/creds.json", decompressedData, "utf8");
            } else {
                throw new Error("Invalid session format");
            }
        } else if (fs.existsSync(__dirname + "/bwmxmd/creds.json") && conf.session !== "zokk") {
            console.log("Updating existing session...");
            const [header, b64data] = conf.session.split(';;;'); 

            if (header === "BWM-XMD" && b64data) {
                let compressedData = Buffer.from(b64data.replace('...', ''), 'base64');
                let decompressedData = zlib.gunzipSync(compressedData);
                fs.writeFileSync(__dirname + "/bwmxmd/creds.json", decompressedData, "utf8");
            } else {
                throw new Error("Invalid session format");
            }
        }
    } catch (e) {
        console.log("Session Invalid: " + e.message);
        return;
    }
}
module.exports = { authentification };
authentification();

//===============================================================================//

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

async function main() {
    if (isReconnecting) {
        return;
    }
    
    isReconnecting = true;
    
    try {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
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
            getMessage: async (key) => {
                try {
                    if (store) {
                        const msg = await store.loadMessage(key.remoteJid, key.id);
                        return msg?.message || undefined;
                    }
                    return { conversation: 'Error occurred' };
                } catch (error) {
                    return { conversation: 'Error occurred' };
                }
            }
        };

        adams = makeWASocket(sockOptions);
        store.bind(adams.ev);
        
        connectionRetries = 0;

        heartbeatInterval = setInterval(async () => {
            try {
                if (adams && adams.user) {
                    await adams.sendPresenceUpdate("available");
                }
            } catch (error) {
                // Silent
            }
        }, 30000);

        let ibraah = { chats: {} };
        const botJid = adams.user?.id;
        const botOwnerJid = `${adams.user?.id.split(':')[0]}@s.whatsapp.net`;

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
                    if (attempt === retries) return null;
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        };

        const handleDeletedMessage = async (deletedMsg, key, deleter) => {
            try {
                if (checkRateLimit(`antidelete_${key.remoteJid}`, key.remoteJid.includes('@g.us'))) {
                    return;
                }

                const context = createContext(deleter, {
                    title: "Anti-Delete Protection",
                    body: "Deleted message detected",
                    thumbnail: "https://files.catbox.moe/sd49da.jpg"
                });

                // 🔗 FIX WHATSAPP LINKS - Make them clickable
                const deleterPhone = deleter.split('@')[0];
                const whatsappLink = `https://wa.me/${deleterPhone}`;
                const chatInfo = key.remoteJid.includes('@g.us') ? 
                    `Group: ${key.remoteJid}` : 
                    `DM with wa.me/${deleterPhone}`;

                const promises = [];
                
                if (config.ANTIDELETE1 === "yes") {
                    promises.push((async () => {
                        try {
                            const baseAlert = `♻️ *Anti-Delete Alert* ♻️\n\n` +
                                            `🛑 Deleted by: ${whatsappLink}\n` +
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
                                            fs.unlink(media.path, () => {});
                                        }
                                    }, 30000);
                                }
                            }
                        } catch (error) {
                            // Silent
                        }
                    })());
                }

                if (config.ANTIDELETE2 === "yes") {
                    promises.push((async () => {
                        try {
                            const ownerContext = {
                                ...context,
                                text: `👤 Sender: ${whatsappLink}\n💬 Chat: ${chatInfo}`
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
                                            fs.unlink(media.path, () => {});
                                        }
                                    }, 30000);
                                }
                            }
                        } catch (error) {
                            // Silent
                        }
                    })());
                }

                await Promise.allSettled(promises);
            } catch (error) {
                // Silent
            }
        };

        // 🔥 MAIN MESSAGE HANDLER WITH GROUP SESSION BUILDING
        adams.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const ms = messages[0];
                if (!ms?.message) return;

                const { key } = ms;
                if (!key?.remoteJid) return;
                if (key.remoteJid === 'status@broadcast') return;

                const sender = key.participant || key.remoteJid;
                const from = key.remoteJid;
                const isGroup = from.includes('@g.us');
                
                if (key.fromMe) return;

                // 🚀 BUILD SESSION FOR GROUPS ONLY (NOT PRIVATE CHATS)
                if (isGroup) {
                    buildGroupSessionLikeEtat(from);
                }

                // Store message
                if (!ibraah.chats[from]) ibraah.chats[from] = [];
                ibraah.chats[from].push({ ...ms, timestamp: Date.now() });

                if (ibraah.chats[from].length > 100) {
                    ibraah.chats[from].shift();
                }

                // 🛡️ IMMEDIATE ANTILINK CHECK
                if (isGroup && config.ANTILINK === "yes") {
                    const messageText = ms.message?.conversation || 
                                      ms.message?.extendedTextMessage?.text || 
                                      ms.message?.imageMessage?.caption || 
                                      ms.message?.videoMessage?.caption || '';

                    if (containsLink(messageText)) {
                        try {
                            // Check if user is admin
                            const groupData = await adams.groupMetadata(from);
                            const isAdmin = groupData.participants.find(p => 
                                p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
                            );

                            if (!isAdmin) {
                                // Delete message immediately
                                await adams.sendMessage(from, { delete: key });

                                // Remove user
                                await adams.groupParticipantsUpdate(from, [sender], 'remove');

                                // Send warning
                                await adams.sendMessage(from, {
                                    text: `🚫 *ANTILINK ACTIVATED*\n\n👤 User: wa.me/${sender.split('@')[0]}\n🔗 Shared unauthorized link\n⚡ Action: Removed immediately`,
                                    mentions: [sender]
                                });
                            }
                        } catch (error) {
                            // Silent
                        }
                        return;
                    }
                }

                // Check for deletion
                if (ms.message?.protocolMessage?.type === 0) {
                    const deletedId = ms.message.protocolMessage.key.id;
                    const deletedMsg = ibraah.chats[from].find(m => m.key.id === deletedId);
                    if (!deletedMsg?.message) return;

                    const deleter = ms.key.participant || ms.key.remoteJid;
                    if (deleter === botJid) return;

                    await handleDeletedMessage(deletedMsg, key, deleter);
                    ibraah.chats[from] = ibraah.chats[from].filter(m => m.key.id !== deletedId);
                }

                // 🎯 PROCESS COMMANDS
                const messageContent = ms.message?.conversation || 
                                     ms.message?.extendedTextMessage?.text || '';

                if (messageContent.startsWith(PREFIX)) {
                    // Build session before processing command (groups only)
                    if (isGroup) {
                        await buildGroupSessionLikeEtat(from);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Process the command
                    await evt(adams, ms, {
                        from,
                        sender,
                        isGroup,
                        messageContent,
                    });
                }

            } catch (error) {
                // Silent
            }
        });

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

        if (conf.AUTO_BIO === "yes") {
            const updateBio = async () => {
                try {
                    const block = getTimeBlock();
                    const timeDate = getCurrentDateTime();
                    const timeQuotes = quotes[block];
                    const quote = timeQuotes[Math.floor(Math.random() * timeQuotes.length)];

                    const bioText = `ʙᴡᴍ xᴍᴅ ᴏɴʟɪɴᴇ\n➤ ${quote}\n📅 ${timeDate}`;

                    await adams.updateProfileStatus(bioText);
                } catch (error) {
                    // Silent
                }
            };

            setTimeout(updateBio, 10000);
            setInterval(updateBio, 3600000);
        }

        if (conf.ANTICALL === 'yes') {
            adams.ev.on("call", async (callData) => {
                try {
                    await adams.rejectCall(callData[0].id, callData[0].from);
                } catch (error) {
                    // Silent
                }
            });
        }

        // 🎯 PRESENCE UPDATE SYSTEM
        const updatePresence = async (jid) => {
            try {
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
                // Silent
            }
        };

        adams.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                updatePresence("status@broadcast");
            }
        });

        adams.ev.on("messages.upsert", async ({ messages }) => {
            if (messages && messages.length > 0) {
                await updatePresence(messages[0].key.remoteJid);
            }
        });

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

                    if (isIdentityQuestion) {
                        aiResponse = `🤖 *I'm BWM XMD* - A WhatsApp AI assistant created by Ibrahim Adams.\n\n💡 *Original Query Response:*\n${aiResponse}`;
                    }

                    return aiResponse;
                } catch (parseError) {
                    const textResponse = await response.text();
                    
                    if (isIdentityQuestion) {
                        return `🤖 *I'm BWM XMD* - A WhatsApp AI assistant created by Ibrahim Adams.\n\n💡 *Original Query Response:*\n${textResponse}`;
                    }
                    
                    return textResponse;
                }
            } catch (error) {
                if (isIdentityQuestion) {
                    return `🤖 *I'm BWM XMD* - A WhatsApp AI assistant created by Ibrahim Adams.\n\n⚠️ I'm currently having trouble accessing external AI services, but I'm here to help you!`;
                }
                
                return `⚠️ I'm currently having trouble accessing AI services. Please try again later!`;
            }
        }

        adams.ev.on("messages.upsert", async ({ messages }) => {
            const ms = messages[0];
            if (!ms.message || ms.key.fromMe) return;

            const messageType = Object.keys(ms.message)[0];
            if (messageType === 'ephemeralMessage') {
                ms.message = ms.message.ephemeralMessage.message;
            }

            const messageText = ms.message.conversation || 
                              ms.message.extendedTextMessage?.text || 
                              ms.message.imageMessage?.caption ||
                              ms.message.videoMessage?.caption || '';

            if (!messageText || messageText.startsWith(PREFIX)) return;

            const from = ms.key.remoteJid;
            const sender = ms.key.participant || ms.key.remoteJid;
            const isGroup = from.includes('@g.us');

            // 🔥 BUILD SESSION FOR GROUPS WHEN PROCESSING AI
            if (isGroup) {
                buildGroupSessionLikeEtat(from);
            }

            const botMentions = [
                `@${adams.user.id.split(':')[0]}`,
                'bwm', 'xmd', 'bot', 'ai'
            ];

            const isMentioned = isGroup ? 
                (ms.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(`${adams.user.id.split(':')[0]}@s.whatsapp.net`) ||
                 botMentions.some(mention => messageText.toLowerCase().includes(mention.toLowerCase()))) :
                true;

            if (!isMentioned) return;

            if (checkRateLimit(sender, isGroup)) return;

            try {
                await adams.sendPresenceUpdate("composing", from);

                const cleanQuery = messageText.replace(/@\d+/g, '').trim();
                if (!cleanQuery) return;

                const aiResponse = await getAIResponse(cleanQuery);
                
                if (conf.AUTO_VOICE_AI === "yes") {
                    try {
                        const ttsText = processForTTS(aiResponse);
                        if (ttsText) {
                            const ttsUrl = googleTTS.getAudioUrl(ttsText, {
                                lang: 'en',
                                slow: false,
                                host: 'https://translate.google.com'
                            });

                            await adams.sendMessage(from, {
                                audio: { url: ttsUrl },
                                mimetype: 'audio/mpeg',
                                ptt: true
                            }, { quoted: ms });
                            return;
                        }
                    } catch (ttsError) {
                        // Fallback to text
                    }
                }

                const contextInfo = createContext2("AI Assistant", {
                    title: "BWM XMD AI",
                    body: "Powered by Multiple AI Models",
                    thumbnail: "https://files.catbox.moe/sd49da.jpg"
                });

                await adams.sendMessage(from, {
                    text: aiResponse,
                    ...contextInfo
                }, { quoted: ms });

            } catch (error) {
                await adams.sendMessage(from, {
                    text: "⚠️ Something went wrong while processing your request. Please try again!"
                }, { quoted: ms });
            }
        });

        adams.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;

                mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? 
                    mek.message.ephemeralMessage.message : mek.message;

                if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
                
                const m = mek;
                require("./Ibrahim/adams")(adams, m, chatUpdate, store, conf);
                
            } catch (err) {
                // Silent
            }
        });

        adams.ev.on("groups.update", (updates) => {
            for (const update of updates) {
                const jid = update.id;
                if (update.subject) {
                    // Group subject changed
                }
            }
        });

        adams.ev.on("group-participants.update", (update) => {
            if (conf.WELCOME === "yes") {
                require("./Ibrahim/adams")(adams, update, store);
            }
        });

        adams.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "close") {
                let reason = new Boom(lastDisconnected?.error)?.output.statusCode;
                
                if (reason === DisconnectReason.badSession) {
                    console.log("Bad Session File, Please Delete Session and Scan Again");
                    adams.logout();
                } else if (reason === DisconnectReason.connectionClosed) {
                    console.log("Connection closed, reconnecting....");
                    main();
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log("Connection Lost from Server, reconnecting...");
                    main();
                } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
                    adams.logout();
                } else if (reason === DisconnectReason.loggedOut) {
                    console.log("Device Logged Out, Please Scan Again And Run.");
                    adams.logout();
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log("Restart Required, Restarting...");
                    main();
                } else if (reason === DisconnectReason.timedOut) {
                    console.log("Connection TimedOut, Reconnecting...");
                    main();
                } else if (reason === DisconnectReason.Multidevicemismatch) {
                    console.log("Multi device mismatch, please scan again");
                    adams.logout();
                } else {
                    adams.end(`Unknown DisconnectReason: ${reason}|${connection}`);
                }
            } else if (connection === "open") {
                console.log('✅ Bot Connected to WhatsApp successfully');
                await adams.sendMessage(botOwnerJid, {
                    text: `*🚀 BWM XMD CONNECTED*\n\n✅ Bot is online and ready\n⏰ Time: ${new Date().toLocaleString()}\n📱 Session: Active`
                });
            }
        });

        adams.ev.on("creds.update", saveCreds);
        isReconnecting = false;

    } catch (error) {
        console.error("Main function error:", error);
        isReconnecting = false;
        
        setTimeout(() => {
            if (connectionRetries < MAX_RETRIES) {
                connectionRetries++;
                main();
            }
        }, 5000);
    }
}

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

main();
