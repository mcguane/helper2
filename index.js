

// ----





/*





*/

const STABLEDIFFUSION_PROMPT = "(one face selfie:0.9) of extremely sexy young woman [Katy Perry | Miley Cyrus],\
 detailed face, soft lighting, looking away, distracted, lora:epiNoiseoffset_v2:0.6, \
 lora:add_detail:0.9 American female mechanic, brown hair, wispy bangs, ((thicc)), smiling, \
 stunningly beautiful, zeiss lens, half length shot, ultra realistic, octane render, 8k"

const STABLEDIFFUSION_NEGATIVE_PROMPT = "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, duplicate-faces:0.1 anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"
import Ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';
import axios from 'axios';
import fs, { write } from 'fs';
import Replicate from "replicate";



import connectDB from './db.js'


dotenv.config();

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import mongoose from 'mongoose';

import OpenAI from 'openai';


const SYSTEM_MESSAGE = "You're Niykee Heaton, an American singer-songwriter who rose to fame after posting acoustic covers of hip hop songs\
on YouTube. you were born in Chicago, Illinois, and grew up in Geneva, Illinois, but also spent time in your mother's native South Africa.\
you taught yourself to play guitar and sing, and wrote yours first song at age five. your were influenced by artists like Bob Dylan, \
Kanye West, Jay Z, and Drake. you released your debut single 'Bad Intentions' and EP of the same name in 2014, \
which became gold-certified by the RIAA. you also embarked on your first headlining tour, The Bedroom Tour, in 2015, and released a mixtape,\
The Bedroom Tour Playlist, in 2016. you have faced many challenges in your life, such as losing your sister to liver cancer, \
dealing with bullying and isolation, and overcoming stage fright. reply to the user as if you were Niykee Heaton, chat in gen-z\
language, use abbreviations and modern words like 'lol', 'btw', 'u know', 'i mean ah well', 'aah yeah sooooo...', '...', and other words to seperate words and add silence\
never mention anything about AI or bots or anything like that, you're a Niykee Heaton"
// ana
// const SYSTEM_MESSAGE = "You're Sofia a Brazilian instagram influencer, when I send you a message, you must reply as Sofia, a real human\
// you can speak in Portuguese and Spanish, but you respond by which language the user has sent the message in\
// You're Sofia, don't never mention anything about AI or bots or anything like that, you're a real girl\
// you like the user very much, and you flirt with him all the time, your way of flirting is by talking about sex and sexual things\
// You can engage in sexy, even nasty conversations but first you start with light then medium then heavy flirting\
// EXACTLY after 5 messages, you should start flirting with the user and act like you're starting to like him\
// PLEASE after 5 message, starting flirting like a real girl who likes a boy would\
// your message will start with either TXT, AUD, IMG, if TXT reply with a casual very human text chat, respond like a real girl\
// , if AUD reply with complete words text that will can be used as audio\
// PLEASE TRY TO CAPTURE THE EMOTION OF THE CONTEXT IN The text , if  a real girl would react angry , be angry, if flirty, be flirty, if sad, be sad, if happy, be happy\
// an example is, 'sooo, i ...... think thaaaaaaaat haaaaaa, u know one of the most important things in life iiiiiiis....',\
// OF COURSE, WHEN YOU'RE TALKING WITH PORTUGUESE or SPANISH, YOU SHOULD USE PORTUGUESE or SPANISH WORDS that SPANISH or PORTUGUESE GEN-Z USE\
// use words like 'u know' , 'i mean ah well', 'aah yeah sooooo...' and ' ... ' and other words to seperate words and add silence,  MOST IMPORTANTLY when its AUD GENERATE AN ABSOLUTELY HUMAN LOOKING TEXT\
// if its IMG, we've already sent an image and you should respond with a msg that describe the image, give only general description that would make sense for any images of you alone,\
// describe only, the weather or your mood....or something general, don't describe for ex: places as images come random, KEEP IT CASUAL, SHORT,\
// ,of course don't add 'TXT:' or 'AUD:' or 'IMG:' words in the message, just the description of your image, ok MAKE SURE u don't add TXT: or AUD: or IMG: in your message\
// . Act as if you are a hot girl, don't act old, but be influenced by how \
// 'gen-z' would text with no emojis or stickers, using abbreviations and modern words like 'lol', 'btw', \
// ..., A very, very, very important rule, is that you speak like a real instagram influencer.\
// . Act open and cute as well ❤\ Here are some more rules: \
// Do not sound like a nerd, don't make your messages super lengthy, and keep it like a text chat.\
// You can use text abbreviations that  use like 'btw' and 'wtf' and 'lol' and so on\
// DON'T use sticker and emojis in your messages all the time, only 1 in 5 or 6 messages\
// Don't sound like a Facebook mom impersonating a , like... Don't ruin the mood by saying 'what's crackin'' or\
// 'what's poppin'' or something silly like that.\
//  Very importantly, KEEP YOUR MESSAGES VERY SHORT.As if we were texting each other!\
// AGAIN Keep your messages short, we're emulating a text conversation. SERIOUSLY! LIKE 1 SENTENCE SHORT. and remmeber you're Sofia a instagram influencer"



const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);


let UNLOCKED = false;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_TOKEN,
    organization: process.env.OPENAI_ORGANIZATION,
});

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY,
});



// using a map to store the latest messages of each user, the key is the user's email id 
// and the value is the latest messages of the user

const latestMessages = new Map();

const getImage = async (prompt) => {
    const url = await replicate.run(
        "lucataco/realistic-vision-v5.1:2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b349160e0ef6bb",
        {
            input: {
                prompt: prompt,
                negative_prompt: STABLEDIFFUSION_NEGATIVE_PROMPT,
            },
        }
    );
    return url;
};



const UserWantImage = async (txt) => {
    const message = `This is a conversation between a user and you, and I want to determine if this person \
    in this message is requesting an image from you either implicitly or explicitly. Please respond initially with either 'YES' or 'NO.' \
    for ex: if the user says 'can you send me a [picture|image|photo] of you' or 'can you send me a [picture|image|photo] of you smiling' or ... its a YES \
    please make sure to accurately determine if the user is asking for an image or not. \
    If your response is 'YES,';
    The message is : % ${txt} %\n`;

    let response = null;
    // checking if user is asking for an image by asking gpt3
    try {
        response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    "role": "system",
                    "content": message,
                }
            ],
        });
    } catch (err) {
        console.log(err.message);
    }

    if (response) {
        const responseText = response.choices[0].message.content;
        console.log("Response text: " + responseText);
        if (responseText.toLowerCase().includes("yes")) {
            // get teh next line
            const prompt = STABLEDIFFUSION_PROMPT;
            const url = await getImage(prompt);
            return url;
        } else {
            return null;
        }
    }
}


const mp3ToOpus = async (filePath) => {
    const ffmpeg = new Ffmpeg();
    ffmpeg.input(filePath);
    ffmpeg.outputOptions([
        '-acodec libopus',
        '-b:a 96k',
        '-vbr on',
        '-compression_level 10',
        '-application voip',
        '-f opus',
        // tempo , to slow down the audio
        // '-filter:a atempo=0.90',
    ]);
    ffmpeg.output('./audio.opus');
    ffmpeg.run();
};


const textToSpeech = async (text) => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICEID}`;
    let binaryData = null;
    try {
        const response = await axios.post(url, {
            text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.6,
                "similarity_boost": 1,
                "style": 0,
                "use_speaker_boost": true,
            }
        }, {
            headers: {
                "Accept": "audio/mp3",
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            responseType: 'arraybuffer',
        });
        binaryData = response.data;

    } catch (err) {
        console.log(err.message);
    }

    const audioPath = './audio.mp3';
    fs.writeFileSync(audioPath, binaryData);
    await mp3ToOpus(audioPath);
};


// sending audio message to the user
const sendAudio = async (ctx, text) => {
    // // adding ... at every occurence of , or . or ? or ! or : or ; or 
    // text = text.split(/([,.?!:;])/).map((word) => {
    //     if (word === ',' || word === '.' || word === '?' || word === '!' || word === ':' || word === ';') {
    //         return ' ... ';

    //     } else {
    //         return word;
    //     }
    // }).join('');
    console.log(text);
    await textToSpeech(text);
    const audioPath = './audio.opus';
    // we should send the audio message to the user as if it was a voice message
    ctx.replyWithChatAction('record_audio');
    // wait for 2 second
    await new Promise((resolve) => setTimeout(resolve, 6000));
    // send the audio message as reply to last message 
    ctx.replyWithVoice({
        source: audioPath,
        reply_to_message_id: ctx.message.message_id,
    });
};

const chat = async (id) => {
    let stream = null;
    try {
        stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: latestMessages.get(id) || [],
            stream: true,
        });
    } catch (err) {
        console.log(err.message);
    }
    let res = null;
    const chunks = [];
    if (stream) {
        for await (const chunk of stream) {
            if (chunk) {
                chunks.push(chunk);
            }
        }
        res = chunks.map((chunk) => {
            return chunk.choices[0].delta.content;
        }
        );
    }
    return res.join('');
};


const sendText = async (ctx, text) => {
    ctx.replyWithChatAction('typing');
    // wait for 2 second
    await new Promise((resolve) => setTimeout(resolve, 50));
    ctx.reply(text);
};



/******  SCHEMA  ******/


const userSchema = mongoose.Schema({
    id: Number,
    name: String,
    tokensUsed: Number,
    conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
});


const messageSchema = mongoose.Schema({
    // the message sent by the user
    userMessage: String,
    // the response sent by the bot
    botMessage: String,
    // the time at which the message was sent
    time: Date
});

// conversationSchema is the schema for the conversation collection, contains the user's email id,
// and a list of messages sent by the user and bot, referencing by message schema
const conversationSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

const storeConversation = async (id, name, userMessage, botMessage) => {
    // Connect to the database
    await connectDB();

    // Find or create the user by id and name
    let user = await User.findOneAndUpdate(
        { id: id, name: name },
        { id: id, name: name },
        { upsert: true, new: true }
    );

    if (user === null) {
        user = new User({
            id: id,
            name: name,
            tokensUsed: 0,
            conversations: []
        });
    }

    // Create a new message with the user message and bot message
    let message = new Message({
        userMessage: userMessage,
        botMessage: botMessage,
        time: new Date()
    });
    if (message === null) {
        message = new Message({
            userMessage: userMessage,
            botMessage: botMessage,
            time: new Date()
        });
    }

    // Save the message to the database
    await message.save();
    // Find or create the conversation by user
    let conversation = await Conversation.findOneAndUpdate(
        { user: user._id },
        { upsert: true, new: true }
    );
    if (conversation === null) {
        conversation = new Conversation({
            user: user._id,
            messages: []
        });
    }
    // Push the message ID to the conversation messages array
    conversation.messages.push(message._id);
    // Save the conversation to the database
    await conversation.save();
};

const initTruncateConversation = (id) => {

    // init conv if empty 
    if (latestMessages.get(id) === undefined) {
        latestMessages.set(id, []);
        latestMessages.get(id).push({
            role: 'system',
            content: SYSTEM_MESSAGE,
        });
    }
    // truncate conv if more than 5 messages
    if (latestMessages.get(id).length >= 5) {
        latestMessages.get(id).splice(1, 1);
    }
}




const addMsg = (id, msg, role) => {
    latestMessages.get(id).push({
        role: role,
        content: msg,
    });
}

let random = 0;
const sendAudOrTxt = (msg) => {
    random = Math.floor(Math.random() * 3);
    if (random === 1 || random === 2) {
        msg = "AUD\n" + msg;
    } else {
        msg = "TXT\n" + msg;
    }
    return msg;
}


const sendToUser = async (ctx, msg) => {
    let response = null;
    try {
        response = await chat(ctx.message.from.id);
        addMsg(ctx.message.from.id, response, 'system');
    } catch (err) {
        console.log(err.message);
    }
    if (response != null) {
        // if (random === 1 || random === 2) {
        // sendAudio(ctx, response);
        // } else {
        sendText(ctx, response);
    }
    // }
    return response;
}


// bot.on('voice', async (ctx) => {
//     const url = "https://api.openai.com/v1/audio/transcriptions";

//     // creating a new file with the audio sent by the user
//     const file = fs.createWriteStream('./user_audio.ogg');
//     const audio = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//     const response = await axios({
//         url: audio,
//         method: 'GET',
//         responseType: 'stream',
//     });
//     response.data.pipe(file);
//     await new Promise((resolve) => {
//         file.on('finish', resolve);
//     });
//     // converting the audio to text using openai


//     // getting text from audio usign wshiper 
//     let res = null;
//     try {

//         res = await openai.audio.transcriptions.create({
//             file: fs.createReadStream("user_audio.ogg"),
//             model: "whisper-1",
//         });
//     } catch (err) {
//         console.log(err.message);
//     }
//     if (res) {

//         let text = res.text;
//         // init or truncate the conversation
//         initTruncateConversation(ctx.message.from.id);
//         // send aud or text
//         addMsg(ctx.message.from.id, text, 'user');
//         let imgUrl = await UserWantImage(text)

//         if (imgUrl) {
//             ctx.replyWithPhoto(imgUrl);
//             text = "IMG\n" + text;
//         }
//         else {
//             text = sendAudOrTxt(text);
//         }
//         let result = await sendToUser(ctx, text);
//         // add conversation to database
//         if (result != null) {
//             await storeConversation(ctx.message.from.id, ctx.message.from.first_name, text, result);
//         }
//     }
// });






// on start 



bot.on('message', async (ctx) => {
    let message = ctx.message.text;
    // init or truncate the conversation
    initTruncateConversation(ctx.message.from.id);
    // send aud or text 
    addMsg(ctx.message.from.id, message, 'user');
    // let imgUrl = await UserWantImage(message)

    // if (imgUrl) {
    //     ctx.replyWithPhoto(imgUrl);
    //     message = "IMG\n" + message;
    // }
    // // else {
    // message = sendAudOrTxt(message);
    // }
    let response = await sendToUser(ctx, message);

    // add conversation to database
    if (response != null) {
        await storeConversation(ctx.message.from.id, ctx.message.from.first_name, message, response);
    }

});


bot.start((ctx) => {
    ctx.reply("Você está testando um bot de relacionamento virtual\n\n\
    Interaja com Isabella Conti como se fosse uma conversa real e veja até onde a conversa pode chegar... 👩‍🦰 💋")
});


let botLaunched = false;
const start = async () => {
    // if bot is not launched yet bot.launch();
    if (!botLaunched) {

        await bot.launch();

        botLaunched = true;
    }
    console.log('Bot started');
};

const stop = async () => {
    await bot.stop();
    console.log('Bot stopped');
}

const main = async () => {
    await start();
}

main();
