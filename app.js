const express=require('express');
const userRoute = require('./routes/userRoutes');
const User= require('./models/userModel')
const Chat=require('./models/chatModel')
require("dotenv").config();
var mongoose = require('mongoose');



mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    })

    
const app=express();



const http= require('http').Server(app);

//monogdb url//



app.use('/',userRoute);

const io= require('socket.io')(http);


var usp= io.of('/user-namespace');
//user name space using own namespace



usp.on('connection',async function(socket)
{
    console.log('User Connected')


var userId=socket.handshake.auth.token;
//uer broadcast






await User.findByIdAndUpdate({_id:userId},{$set:{is_online:'1'}})

socket.broadcast.emit('getOnlineUser',{user_id:userId});

    socket.on('disconnect',async function(){
        console.log('User Disconnected');



        var userId=socket.handshake.auth.token;

await User.findByIdAndUpdate({_id:userId},{$set:{is_online:'0'}})




socket.broadcast.emit('getOfflineUser',{user_id:userId});
    })


    //Chatting implementation 


    socket.on('newChat',function(data){
        socket.broadcast.emit('loadNewChat',data);
    })



    //load old chats

    socket.on('existsChat',async function(data){
var chats= await Chat.find({  $or:[
    {sender_id:data.sender_id,receiver_id:data.receiver_id},
    {sender_id:data.receiver_id,receiver_id:data.sender_id},
    
]});
 
socket.emit('loadChats',{ chats:chats});




    })


socket.on('chatDeleted',function(id){
    socket.broadcast.emit('chatMessageDeleted',id)
})
socket.on('chatUpdated',function(data){
    socket.broadcast.emit('chatMessageUpdated',data)
})

});



//delete chats




http.listen(3000,function()
{
    console.log("Server is running at port 3000");
})