// setup .env file
import dotenv from 'dotenv'
dotenv.config()

/* create server with express */
import express from 'express'
const server = express()

/* setup cors */
import cors from 'cors'
server.use(cors())

import bodyParser from 'body-parser'
server.use(bodyParser.json())

/* Push public folder */
server.use(express.static('public'))

/* Setup api config */
import apiConfig from './apis'
server.use('/apis', apiConfig)


server.get("/", (req, res) => {
    res.send("Hello World")
})

server.listen(process.env.SERVER_PORT, () => {
    console.log(`Server listening on link ${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`)
})