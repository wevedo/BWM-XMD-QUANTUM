

/*/▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱//
______     __     __     __    __        __  __     __    __     _____    
/\  == \   /\ \  _ \ \   /\ "-./  \      /\_\_\_\   /\ "-./  \   /\  __-.  
\ \  __<   \ \ \/ ".\ \  \ \ \-./\ \     \/_/\_\/_  \ \ \-./\ \  \ \ \/\ \ 
 \ \_____\  \ \__/".~\_\  \ \_\ \ \_\      /\_\/\_\  \ \_\ \ \_\  \ \____- 
  \/_____/   \/_/   \/_/   \/_/  \/_/      \/_/\/_/   \/_/  \/_/   \/____/ 
                                                                           
/▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰/*/
    



                   
                   
const { default: makeWASocket, isJidGroup, downloadMediaMessage, downloadAndSaveMediaMessage, superUser, imageMessage, CommandSystem, repondre,  verifierEtatJid, recupererActionJid, DisconnectReason, getMessageText, commandRegistry, delay, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, useMultiFileAuthState, makeInMemoryStore, jidDecode, getContentType } = require("@whiskeysockets/baileys");
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
            // Split the session strihhhhng into header and Base64 data
            const [header, b64data] = conf.session.split(';;;'); 

            // Validate the session format
            if (header === "BWM-XMD" && b64data) {
                let compressedData = Buffer.from(b64data.replace('...', ''), 'base64'); // Decode and truncate
                let decompressedData = zlib.gunzipSync(compressedData); // Decompress session
                fs.writeFileSync(__dirname + "/bwmxmd/creds.json", decompressedData, "utf8"); // Save to file
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
let zk;

//===============================================================================//

const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

async function main() {
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
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
            return { conversation: 'Error occurred' };
        }
    };

    adams = makeWASocket(sockOptions);
    store.bind(adams.ev);

 const groupCooldowns = new Map();

function isGroupSpamming(jid) {
    const now = Date.now();
    const lastTime = groupCooldowns.get(jid) || 0;
    if (now - lastTime < 1500) return true; // 1.5 seconds between reactions/messages
    groupCooldowns.set(jid, now);
    return false;
}
 //============================================================================//

 
 let ibraah = { chats: {} };
const botJid = `${adams.user?.id.split(':')[0]}@s.whatsapp.net`;
const botOwnerJid = `${adams.user?.id.split(':')[0]}@s.whatsapp.net`; // Fixed: Changed from adams.user to config

// Improved media processing function with better error handling
const processMediaMessage = async (deletedMessage) => {
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

    try {
        const mediaStream = await downloadMediaMessage(deletedMessage, { logger });
        
        const extensions = {
            image: 'jpg',
            video: 'mp4',
            audio: mediaInfo.mimetype?.includes('mpeg') ? 'mp3' : 'ogg',
            sticker: 'webp',
            document: mediaInfo.fileName?.split('.').pop() || 'bin'
        };
        
        const tempPath = path.join(__dirname, `temp_media_${Date.now()}.${extensions[mediaType]}`);
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
        logger.error(`Media processing failed:`, error);
        return null;
    }
};

// Enhanced message forwarding function with better synchronization
const handleDeletedMessage = async (deletedMsg, key, deleter) => {
    const context = createContext(deleter, {
        title: "Anti-Delete Protection",
        body: "Deleted message detected",
        thumbnail: "https://files.catbox.moe/sd49da.jpg"
    });

    const chatInfo = key.remoteJid.includes('@g.us') ? 
        `Group: ${key.remoteJid}` : 
        `DM with @${deleter.split('@')[0]}`;

    try {
        // Handle both ANTIDELETE1 and ANTIDELETE2 in parallel for better performance
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
                        // Handle media in chat
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

                            // Cleanup temp file
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

                            // Cleanup temp file
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
                    await adams.sendMessage(botOwnerJid, {
                        text: `⚠️ Failed to forward deleted message from ${deleter}\n\nError: ${error.message}`,
                        ...context
                    });
                }
            })());
        }

        await Promise.all(promises);
    } catch (error) {
        logger.error('Anti-delete handling failed:', error);
    }
};

adams.ev.on("messages.upsert", async ({ messages }) => {
    try {
        const ms = messages[0];
        if (!ms?.message) return;

        const { key } = ms;
        if (!key?.remoteJid) return;

        // Skip status updates (status@broadcast)
        if (key.remoteJid === 'status@broadcast') return;

        const sender = key.participant || key.remoteJid;
        if (sender === botJid || sender === botOwnerJid || key.fromMe) return;

        // Store message with timestamp
        if (!ibraah.chats[key.remoteJid]) ibraah.chats[key.remoteJid] = [];
        ibraah.chats[key.remoteJid].push({
            ...ms,
            timestamp: Date.now()
        });

        // Cleanup old messages (keep only last 100 messages per chat)
        if (ibraah.chats[key.remoteJid].length > 100) {
            ibraah.chats[key.remoteJid].shift();
        }

        // Check for deletion
        if (ms.message?.protocolMessage?.type === 0) {
            const deletedId = ms.message.protocolMessage.key.id;
            const deletedMsg = ibraah.chats[key.remoteJid].find(m => m.key.id === deletedId);
            if (!deletedMsg?.message) return;

            const deleter = ms.key.participant || ms.key.remoteJid;
            if (deleter === botJid || deleter === botOwnerJid) return;

            // Immediately handle the deleted message
            await handleDeletedMessage(deletedMsg, key, deleter);

            // Remove the deleted message from ibraah
            ibraah.chats[key.remoteJid] = ibraah.chats[key.remoteJid].filter(m => m.key.id !== deletedId);
        }
    } catch (error) {
        logger.error('Anti-delete system error:', error);
    }
});


// Get current time of day
function getTimeBlock() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 16) return "afternoon";
    if (hour >= 16 && hour < 21) return "evening";
    if (hour >= 21 || hour < 2) return "night";
    return "latenight";
}

// Quotes per time block
const quotes = {
  morning: [ "☀️ ʀɪsᴇ ᴀɴᴅ sʜɪɴᴇ. ɢʀᴇᴀᴛ ᴛʜɪɴɢs ɴᴇᴠᴇʀ ᴄᴀᴍᴇ ғʀᴏᴍ ᴄᴏᴍғᴏʀᴛ ᴢᴏɴᴇs.", "🌅 ᴇᴀᴄʜ ᴍᴏʀɴɪɴɢ ᴡᴇ ᴀʀᴇ ʙᴏʀɴ ᴀɢᴀɪɴ. ᴡʜᴀᴛ ᴡᴇ ᴅᴏ ᴛᴏᴅᴀʏ ɪs ᴡʜᴀᴛ ᴍᴀᴛᴛᴇʀs ᴍᴏsᴛ.", "⚡ sᴛᴀʀᴛ ʏᴏᴜʀ ᴅᴀʏ ᴡɪᴛʜ ᴅᴇᴛᴇʀᴍɪɴᴀᴛɪᴏɴ, ᴇɴᴅ ɪᴛ ᴡɪᴛʜ sᴀᴛɪsғᴀᴄᴛɪᴏɴ.", "🌞 ᴛʜᴇ sᴜɴ ɪs ᴜᴘ, ᴛʜᴇ ᴅᴀʏ ɪs ʏᴏᴜʀs.", "📖 ᴇᴠᴇʀʏ ᴍᴏʀɴɪɴɢ ɪs ᴀ ɴᴇᴡ ᴘᴀɢᴇ ᴏғ ʏᴏᴜʀ sᴛᴏʀʏ. ᴍᴀᴋᴇ ɪᴛ ᴄᴏᴜɴᴛ." ], 
 afternoon: [ "⏳ ᴋᴇᴇᴘ ɢᴏɪɴɢ. ʏᴏᴜ'ʀᴇ ʜᴀʟғᴡᴀʏ ᴛᴏ ɢʀᴇᴀᴛɴᴇss.", "🔄 sᴛᴀʏ ғᴏᴄᴜsᴇᴅ. ᴛʜᴇ ɢʀɪɴᴅ ᴅᴏᴇsɴ’ᴛ sᴛᴏᴘ ᴀᴛ ɴᴏᴏɴ.", "🏗️ sᴜᴄᴄᴇss ɪs ʙᴜɪʟᴛ ɪɴ ᴛʜᴇ ʜᴏᴜʀs ɴᴏʙᴏᴅʏ ᴛᴀʟᴋs ᴀʙᴏᴜᴛ.", "🔥 ᴘᴜsʜ ᴛʜʀᴏᴜɢʜ. ᴄʜᴀᴍᴘɪᴏɴs ᴀʀᴇ ᴍᴀᴅᴇ ɪɴ ᴛʜᴇ ᴍɪᴅᴅʟᴇ ᴏғ ᴛʜᴇ ᴅᴀʏ.", "⏰ ᴅᴏɴ’ᴛ ᴡᴀᴛᴄʜ ᴛʜᴇ ᴄʟᴏᴄᴋ, ᴅᴏ ᴡʜᴀᴛ ɪᴛ ᴅᴏᴇs—ᴋᴇᴇᴘ ɢᴏɪɴɢ." ],
 evening: [ "🛌 ʀᴇsᴛ ɪs ᴘᴀʀᴛ ᴏғ ᴛʜᴇ ᴘʀᴏᴄᴇss. ʀᴇᴄʜᴀʀɢᴇ ᴡɪsᴇʟʏ.", "🌇 ᴇᴠᴇɴɪɴɢ ʙʀɪɴɢꜱ ꜱɪʟᴇɴᴄᴇ ᴛʜᴀᴛ ꜱᴘᴇᴀᴋꜱ ʟᴏᴜᴅᴇʀ ᴛʜᴀɴ ᴅᴀʏʟɪɢʜᴛ.", "✨ ʏᴏᴜ ᴅɪᴅ ᴡᴇʟʟ ᴛᴏᴅᴀʏ. ᴘʀᴇᴘᴀʀᴇ ғᴏʀ ᴀɴ ᴇᴠᴇɴ ʙᴇᴛᴛᴇʀ ᴛᴏᴍᴏʀʀᴏᴡ.", "🌙 ʟᴇᴛ ᴛʜᴇ ɴɪɢʜᴛ sᴇᴛᴛʟᴇ ɪɴ, ʙᴜᴛ ᴋᴇᴇᴘ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴡɪᴅᴇ ᴀᴡᴀᴋᴇ.", "🧠 ɢʀᴏᴡᴛʜ ᴅᴏᴇsɴ’ᴛ ᴇɴᴅ ᴀᴛ sᴜɴsᴇᴛ. ɪᴛ sʟᴇᴇᴘs ᴡɪᴛʜ ʏᴏᴜ." ],
 night: [ "🌌 ᴛʜᴇ ɴɪɢʜᴛ ɪs sɪʟᴇɴᴛ, ʙᴜᴛ ʏᴏᴜʀ ᴅʀᴇᴀᴍs ᴀʀᴇ ʟᴏᴜᴅ.", "⭐ sᴛᴀʀs sʜɪɴᴇ ʙʀɪɢʜᴛᴇsᴛ ɪɴ ᴛʜᴇ ᴅᴀʀᴋ. sᴏ ᴄᴀɴ ʏᴏᴜ.", "🧘‍♂️ ʟᴇᴛ ɢᴏ ᴏғ ᴛʜᴇ ɴᴏɪsᴇ. ᴇᴍʙʀᴀᴄᴇ ᴛʜᴇ ᴘᴇᴀᴄᴇ.", "✅ ʏᴏᴜ ᴍᴀᴅᴇ ɪᴛ ᴛʜʀᴏᴜɢʜ ᴛʜᴇ ᴅᴀʏ. ɴᴏᴡ ᴅʀᴇᴀᴍ ʙɪɢ.", "🌠 ᴍɪᴅɴɪɢʜᴛ ᴛʜᴏᴜɢʜᴛs ᴀʀᴇ ᴛʜᴇ ʙʟᴜᴇᴘʀɪɴᴛ ᴏғ ᴛᴏᴍᴏʀʀᴏᴡ's ɢʀᴇᴀᴛɴᴇss." ],
 latenight: [ "🕶️ ᴡʜɪʟᴇ ᴛʜᴇ ᴡᴏʀʟᴅ sʟᴇᴇᴘs, ᴛʜᴇ ᴍɪɴᴅs ᴏғ ʟᴇɢᴇɴᴅs ᴡᴀɴᴅᴇʀ.", "⏱️ ʟᴀᴛᴇ ɴɪɢʜᴛs ᴛᴇᴀᴄʜ ᴛʜᴇ ᴅᴇᴇᴘᴇsᴛ ʟᴇssᴏɴs.", "🔕 sɪʟᴇɴᴄᴇ ɪsɴ'ᴛ ᴇᴍᴘᴛʏ—ɪᴛ's ғᴜʟʟ ᴏғ ᴀɴsᴡᴇʀs.", "✨ ᴄʀᴇᴀᴛɪᴠɪᴛʏ ᴡʜɪsᴘᴇʀs ᴡʜᴇɴ ᴛʜᴇ ᴡᴏʀʟᴅ ɪs ǫᴜɪᴇᴛ.", "🌌 ʀᴇsᴛ ᴏʀ ʀᴇғʟᴇᴄᴛ, ʙᴜᴛ ɴᴇᴠᴇʀ ᴡᴀsᴛᴇ ᴛʜᴇ ɴɪɢʜᴛ." ] };

// Enhanced global date formatter (date only)
function getCurrentDateTime() {
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "2-digit"
    }).format(new Date());
}

// Auto Bio Update System
if (conf.AUTO_BIO === "yes") {
    const updateBio = async () => {
        try {
            const block = getTimeBlock();
            const timeDate = getCurrentDateTime();
            const timeQuotes = quotes[block];
            const quote = timeQuotes[Math.floor(Math.random() * timeQuotes.length)];

            const bioText = `ʙᴡᴍ xᴍᴅ ᴏɴʟɪɴᴇ\n➤ ${quote}\n📅 ${timeDate}`;

            await adams.updateProfileStatus(bioText);
            //console.log('Bio updated at:', new Date().toLocaleString());
        } catch (error) {
            //console.error('Bio update failed:', error.message);
        }
    };

    // Initial update after 10 seconds
    setTimeout(updateBio, 10000);

    // Update every 60 minutes
    setInterval(updateBio, 3600000);
}

// Silent Anti-Call System (unchanged)
if (conf.ANTICALL === 'yes') {
    adams.ev.on("call", async (callData) => {
        try {
            await adams.rejectCall(callData[0].id, callData[0].from);
            console.log('Call blocked from:', callData[0].from.slice(0, 6) + '...');
        } catch (error) {
            console.error('Call block failed:', error.message);
        }
    });
}


   const updatePresence = async (jid) => {
            try {
                // Get presence state from config
                const etat = config.ETAT || 0; // Default to 0 (unavailable) if not set
                
                // Set presence based on ETAT value
                if (etat == 1) {
                    await adams.sendPresenceUpdate("available", jid);
                } else if (etat == 2) {
                    await adams.sendPresenceUpdate("composing", jid);
                } else if (etat == 3) {
                    await adams.sendPresenceUpdate("recording", jid);
                } else {
                    await adams.sendPresenceUpdate("unavailable", jid);
                }
                
                logger.debug(`Presence updated based on ETAT: ${etat}`);
            } catch (e) {
                logger.error('Presence update failed:', e.message);
            }
        };

        // Update presence on connection
        adams.ev.on("connection.update", ({ connection }) => {
            if (connection === "open") {
                logger.info("Connection established - updating presence");
                updatePresence("status@broadcast");
            }
        });

        // Update presence when receiving a message
        adams.ev.on("messages.upsert", async ({ messages }) => {
            if (messages && messages.length > 0) {
                await updatePresence(messages[0].key.remoteJid);
            }
        });
      // Chatbot System with Integrated Identity Response


const googleTTS = require("google-tts-api");
const { createContext2 } = require("./Ibrahim/helper2");

const availableApis = [
   // "https://bk9.fun/ai/jeeves-chat2?q=",
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
        
        // First try to parse as JSON
        try {
            const data = await response.json();
            // Handle different API response formats
            let aiResponse = data.BK9 || data.result || data.response || data.message || 
                           (data.data && (data.data.text || data.data.message)) || 
                           JSON.stringify(data);
            
            // If we got an object, stringify it
            if (typeof aiResponse === 'object') {
                aiResponse = JSON.stringify(aiResponse);
            }

            if (isIdentityQuestion) {
                aiResponse = 'I am BWM XMD, created by Ibrahim Adams! 🚀';
            }
            
            return aiResponse;
        } catch (jsonError) {
            // If JSON parse fails, try to get as text
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

            // Text response
            if (conf.CHATBOT === "yes") {
                await adams.sendMessage(jid, { 
                    text: String(aiResponse),
                    ...createContext(jid, {
                        title: "ʙᴡᴍ xᴍᴅ ᴄʜᴀᴛʙᴏᴛ ᴄᴏɴᴠᴇʀsᴀᴛɪᴏɴ",
                        body: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs"
                    })
                }, { quoted: msg });
            }

            // Voice response
            if (conf.CHATBOT1 === "yes") {
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
                }
            }
        } catch (error) {
            console.error("Message processing error:", error);
        }
    });
}

 const isAnyLink = (message) => {
    // Regex pattern to detect any link
    const linkPattern = /https?:\/\/[^\s]+/;
    return linkPattern.test(message);
};

adams.ev.on('messages.upsert', async (msg) => {
    try {
        const { messages } = msg;
        const message = messages[0];

        if (!message.message) return; // Skip empty messages

        const from = message.key.remoteJid; // Chat ID
        const sender = message.key.participant || message.key.remoteJid; // Sender ID
        const isGroup = from.endsWith('@g.us'); // Check if the message is from a group

        if (!isGroup) return; // Skip non-group messages

        const groupMetadata = await adams.groupMetadata(from); // Fetch group metadata
        const groupAdmins = groupMetadata.participants
            .filter((member) => member.admin)
            .map((admin) => admin.id);

        // Check if ANTI-LINK is enabled for the group
        if (conf.GROUP_ANTILINK === 'yes') {
            const messageType = Object.keys(message.message)[0];
            const body =
                messageType === 'conversation'
                    ? message.message.conversation
                    : message.message[messageType]?.text || '';

            if (!body) return; // Skip if there's no text

            // Skip messages from admins
            if (groupAdmins.includes(sender)) return;

            // Check for any link
            if (isAnyLink(body)) {
                // Delete the message
                await adams.sendMessage(from, { delete: message.key });

                // Remove the sender from the group
                await adams.groupParticipantsUpdate(from, [sender], 'remove');

                // Send a notification to the group
                await adams.sendMessage(
                    from,
                    {
                        text: `⚠️Bwm xmd anti-link online!\n User @${sender.split('@')[0]} has been removed for sharing a link.`,
                        mentions: [sender],
                    }
                );
            }
        }
    } catch (err) {
        console.error('Error handling message:', err);
    }
});
// Listener Manager Class (Updated to load specific files only)
class ListenerManager {
    constructor() {
        this.activeListeners = new Map();
        this.targetListeners = new Set([
            'Welcome_Goodbye.js',
            'Status_update.js',
           // 'Group_antilink.js',
            'Autoreact_status.js'
        ]);
    }

    async loadListeners(adams, store, commands) {
        const listenerDir = path.join(__dirname, 'bwmxmd');
        
        // Clear existing listeners first
        this.cleanupListeners();
        
        // Load only target listeners
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
                    //console.log(`🚀 Loaded listener: ${file}`);
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
                console.log(`♻️ Cleaned up listener: ${name}`);
            } catch (e) {
                console.error(`Error cleaning up listener ${name}:`, e);
            }
        }
        this.activeListeners.clear();
    }
}

// Initialize listener manager
const listenerManager = new ListenerManager();

// Connection handler (unchanged)
adams.ev.on('connection.update', ({ connection }) => {
    if (connection === 'open') {
        listenerManager.loadListeners(adams, store, commandRegistry)
            .then(() => console.log('🚀 Enjoy quantum speed 🌎'))
            .catch(console.error);
    }
    
    if (connection === 'close') {
        listenerManager.cleanupListeners();
    }
});

// Selective hot reload - only for our target listeners
fs.watch(path.join(__dirname, 'bwmxmd'), (eventType, filename) => {
    if (eventType === 'change' && listenerManager.targetListeners.has(filename)) {
        console.log(`♻️ Reloading listener: ${filename}`);
        delete require.cache[require.resolve(path.join(__dirname, 'bwmxmd', filename))];
        listenerManager.loadListeners(adams, store, commandRegistry)
            .catch(console.error);
    }
});


 

 //============================================================================================================

console.log("lorded all commands successfully 🤗\n");
try {
    const taskflowPath = path.join(__dirname, "adams");
    fs.readdirSync(taskflowPath).forEach((fichier) => {
        if (path.extname(fichier).toLowerCase() === ".js") {
            try {
                require(path.join(taskflowPath, fichier));
              //  console.log(`✔️ ${fichier} installed successfully.`);
            } catch (e) {
                console.error(`❌ Failed to load ${fichier}: ${e.message}`);
            }
        }
    });
} catch (error) {
    console.error("❌ Error reading Taskflow folder:", error.message);
}
 //============================================================================/

adams.ev.on("messages.upsert", async ({ messages }) => {
    const ms = messages[0];
    if (!ms?.message || !ms?.key) return;

    // FIXED JID STANDARDIZATION (ONLY THIS FUNCTION CHANGED)
    function standardizeJid(jid) {
        if (!jid) return '';
        try {
            jid = typeof jid === 'string' ? jid : 
                 (jid.decodeJid ? jid.decodeJid() : String(jid));
            jid = jid.split(':')[0].split('/')[0]; // Remove device/resource
            if (!jid.includes('@')) jid += '@s.whatsapp.net';
            return jid.toLowerCase();
        } catch (e) {
            console.error("JID standardization error:", e);
            return '';
        }
    }

    // ORIGINAL CODE BELOW (EXACTLY AS WAS)
    const origineMessage = standardizeJid(ms.key.remoteJid);
    const idBot = standardizeJid(adams.user?.id);
    const verifGroupe = origineMessage.endsWith("@g.us");
    
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

// ===== CORE ADMIN VERIFICATION (UNCHANGED) ===== //
let verifAdmin = false;
let botIsAdmin = false;
if (verifGroupe && infosGroupe) {
    const admins = infosGroupe.participants
        .filter(p => p.admin)
        .map(p => standardizeJid(p.id));
    verifAdmin = admins.includes(standardizeJid(auteurMessage));
    botIsAdmin = admins.includes(botJid);
}

// ===== SCALABLE MESSAGE PROCESSING SYSTEM ===== //
const messageQueues = {
    highPriority: [], // For admin messages
    normal: [],       // For regular messages
    lowPriority: []   // For non-command messages
};
let isProcessing = false;
const RATE_LIMITS = {
    highPriority: 100,  // messages/second
    normal: 50,
    lowPriority: 20
};

// Classify message priority
function getPriorityLevel() {
    if (verifAdmin && isCommandMessage) return 'highPriority';
    if (isCommandMessage) return 'normal';
    return 'lowPriority';
}

// Enhanced queue processor
async function processQueues() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Process high priority first
        const highPriorityBatch = messageQueues.highPriority.splice(0, RATE_LIMITS.highPriority);
        const normalBatch = messageQueues.normal.splice(0, RATE_LIMITS.normal);
        const lowPriorityBatch = messageQueues.lowPriority.splice(0, RATE_LIMITS.lowPriority);

        await Promise.all([
            ...highPriorityBatch.map(processMessage),
            ...normalBatch.map(processMessage),
            ...lowPriorityBatch.map(processMessage)
        ]);
    } catch (error) {
        console.error('Queue processing error:', error);
    } finally {
        isProcessing = false;
        
        // Schedule next batch with dynamic delay
        const totalQueued = Object.values(messageQueues).reduce((sum, queue) => sum + queue.length, 0);
        const delay = totalQueued > 1000 ? 100 : 10; // Faster processing when overloaded
        setTimeout(processQueues, delay);
    }
}

// Message processor with error handling
async function processMessage({ handler, resolve }) {
    try {
        await handler();
    } catch (error) {
        console.error('Message processing failed:', error);
    } finally {
        resolve();
    }
}

// Main entry point for messages
function handleIncomingMessage(handler) {
    return new Promise((resolve) => {
        const priority = getPriorityLevel();
        messageQueues[priority].push({ handler, resolve });
        
        if (!isProcessing) {
            process.nextTick(processQueues);
        }
    });
}

// ===== USAGE EXAMPLE ===== //
// Instead of direct processing:
// handleIncomingMessage(async () => {
//     if (!verifAdmin) {
//         return reply("❌ You need admin privileges");
//     }
//     // Your command logic here
// });
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
        }
    }
});
//===============================================================================================================

// Handle connection updates
adams.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
        console.log("Connected to WhatsApp");

        // Wait 2 seconds to ensure socket is fully initialized
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
        }, 2000); // 2-second delay after socket opens
    }
});

// Event Handlers with reconnection delay
adams.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
        console.log("🪩 Bot scanning 🪩");
    }

    if (connection === "open") {
        console.log("🌎 BWM XMD ONLINE 🌎");

        // Slight delay to allow internal subsystems to sync
        setTimeout(() => {
            adams.newsletterFollow("120363285388090068@newsletter");
        }, 1500); // Delay to avoid race condition
    }

    if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log("Connection closed, reconnecting...");

        if (shouldReconnect) {
            setTimeout(() => {
                main(); // Restart after 3 seconds
            }, 3000);
        }
    }
});
}

setTimeout(() => {
    main().catch(err => console.log("Initialization error:", err));
}, 5000);
