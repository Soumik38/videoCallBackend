// const {Server}=require('socket.io')
const express = require('express')
const app = express()
const cors=require('cors')
app.use(express.json())
app.use(express.urlencoded({extended:false}))
const server=require('http').createServer(app)
require('./db/connection')
const Users=require('./models/Users')

const io=require('socket.io')(server,{  //socket io server
    cors:true
})

app.use(cors())

const emailToSocket=new Map()
const socketToEmail=new Map()

io.on('connection', (socket) => {

    console.log(`${socket.id} is connected`)
    
	socket.emit('me', socket.id);

    socket.on('join_room',(data)=>{
        const {roomNo,email}=data
        emailToSocket.set(email,socket.id)
        socketToEmail.set(socket.id,email)
        io.to(roomNo).emit('user_joined',{email,id:socket.id}) //alert everyone in the room that a user has joined
        socket.join(roomNo)
        io.to(socket.id).emit('join_room',data)
    })

	socket.on('call_user', ({sendTo,offer}) => {
		io.to(sendTo).emit('call_incoming', {receivedFrom:socket.id, offer})
	})

	socket.on('call_accepted',({sendTo,ans}) => {
		io.to(sendTo).emit('call_accepted', {receivedFrom:socket.id, ans})
	})

    socket.on('negotiation_needed',({sendTo,offer})=>{
        io.to(sendTo).emit('negotiation_needed', {receivedFrom:socket.id,offer})
    })

    socket.on('negotiation_done', ({sendTo, ans }) => {
        // console.log('neg done',ans)
        io.to(sendTo).emit('negotiation_complete', {receivedFrom: socket.id, ans })
    })
})

app.get('/',cors(),(req,res)=>{
    res.send('Backend')
})

app.post('/signup',async (req,res)=>{
    // console.log(res)
    const{name,email,pass}=req.body
    try{
        const check=await Users.findOne({email:email})
        if(check){
            res.json('exists')
        }else{
            res.json('notexists')
            const data={
                name:name,
                email:email,
                pass:pass
            }
            await Users.insertMany([data])
        }
    }catch(e){
        console.log(e)
        res.json('notexists')
    }
})

app.post('/signin',async (req,res)=>{
    const{email,pass}=req.body
    try{
        const check=await Users.findOne({email:email})
        if(check){
            if(check.pass===pass){
                res.json('authorize')
            }else{
                res.json('wrongpass')
            }
        }else{
            res.json('notexists')
        }
    }catch(e){
        res.json('notexists')
    }
})

const port = process.env.PORT || 4000
server.listen(port, () => {
    console.log(`Server running on ${port}`)
})