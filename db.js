

// Here we will write code to connect to MongoDB database and stor messages of each user in a collection named after the user's email id


import dotenv from 'dotenv';
import mongoose from 'mongoose';
// Connect to MongoDB database

/*

follow ups:

1 - after one hour of inactivity
2 - after one day of inactivity
3 - after two days of inactivity
4 - after 3 days of inactivity 
5 - after 6 days of inactivity
6 - after 9 days of inactivity


*/


export const planSchema = mongoose.Schema({
    // name of the plan
    name: String,
    // the price of the plan
    price: Number,
    // package name 
    packageName: String,
    // number of messages
    messagesNum: Number,
    // date of paying the plan
    payingDate: Date,
    // consumed-audio
    consumedAudio: Number,
});



// userSchema is the schema for the user collection, contains name, emaile, TokensUsed, 
// and a list of conversations with the bot, referenecing by conversation schema
export const userSchema = mongoose.Schema({
    id: Number,
    name: String,
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
});


export const messageSchema = mongoose.Schema({
    // the message sent by the user
    userMessage: String,
    // the response sent by the bot
    botMessage: String,
    // the time at which the message was sent
    time: Date
});

// conversationSchema is the schema for the conversation collection, contains the user's email id,
// and a list of messages sent by the user and bot, referencing by message schema

export const conversationSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});



dotenv.config();


// singelton pattern
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        // creating a model of our schema
        console.log('MongoDB connected');
    } catch (error) {
        console.log(error);
    }
};


export default connectDB;




