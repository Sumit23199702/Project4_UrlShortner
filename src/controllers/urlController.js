const urlModel = require("../models/urlModel")
const shortid = require('shortid')
const redis = require('redis')

const { promisify } = require("util");


//Connect to redis
const redisClient = redis.createClient(
    19389,
    "redis-19389.c240.us-east-1-3.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("hUhJO4RZqQaYUlC4pHEsCiKwx5kcVwdS", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


// Validation Starts here...
const isValid = (value) => {
    if (typeof value === "undefined" || value === null) return false
    if (typeof value === "string" && value.trim().length === 0) false
    else {
        return true
    }
}


//======================================= < Shorten Url > ===========================================

const createShortUrl = async function (req, res) {
    try {

        const baseUrl = 'http://localhost:3000';
        if (!(/^https?:\/\/\w/).test(baseUrl)) {
            return res.status(400).send({ status: false, msg: "Please check your Base Url, Provide a valid One." })
        }

        const requestBody = req.body

        if (Object.keys(requestBody).length == 0) {
            return res.status(400).send({ status: false, message: "Bad Request, No Input provided" })
        }

        const longUrl = req.body.longUrl

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Long Url is required" })
        }

        let validLongUrl = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%\+.~#?&//=]*)/.test(longUrl.trim()))
        if (!validLongUrl) {
            return res.status(400).send({ status: false, msg: "Please provide a valid longUrl" })
        }

        const urlCode = shortid.generate().toLowerCase()

        const shortUrl = baseUrl + '/' + urlCode

        let cachedUrl = await GET_ASYNC(`${longUrl}`)
        if (cachedUrl) {
            let url = JSON.parse(cachedUrl)
            return res.status(200).send({ status: true, message: "data from redis", redisData: url })
        }

        let dbCallUrl = await urlModel.findOne({ longUrl })
        if (dbCallUrl) {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(dbCallUrl))
            return res.status(200).send({ status: true, message: "data from db", data: dbCallUrl })
        }

        let urlBody = {
            longUrl,
            shortUrl,
            urlCode
        }
        let savedData = await urlModel.create(urlBody)

        let urlDetails = {
            longUrl: savedData.longUrl,
            shortUrl: savedData.shortUrl,
            urlCode: savedData.urlCode
        }
        await SET_ASYNC(`${longUrl}`, JSON.stringify(urlDetails))
        return res.status(201).send({ status: true, data: urlDetails })

    } catch (error) {
        return res.status(500).send({ status: false, message: "error.message" })
    }
}


//=====================< Redirect to the original URL >====================================

const getUrl = async function (req, res)  {
    try {
        const urlCode = req.params.urlCode.trim();
        //
        let cahcedUrlCode = await GET_ASYNC(`${urlCode}`)

        if (cahcedUrlCode) {

            return res.status(200).redirect(JSON.parse(cahcedUrlCode))

        }

        else {
            const url = await urlModel.findOne({
                urlCode: urlCode
            }).select({ longUrl: 1, urlCode: 1, shortUrl: 1, _id: 0 });
            if (!url) {
                return res.status(404).send({ status: false, message: "No URL found" })
            }
            else {
                let seturl=url.longUrl
                await SET_ASYNC(`${seturl}`, JSON.stringify(url))
                return res.status(302).redirect(seturl)
            }
        }
    }

    catch (error) {
        return res.status(500).send({ status: false, Message: error.message });
    }
};



module.exports = { createShortUrl, getUrl }


