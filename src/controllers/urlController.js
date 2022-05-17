const urlModel = require("../models/urlModel")
const shortid = require('shortid')




const createShortUrl = async function (req, res) {
    try {
        const baseUrl = 'http://localhost:3000';

        const requestBody = req.body

        if (Object.keys(requestBody).length == 0) {
            return res.status(400).send({ status: false, message: "Bad Request, No Input provided" })
        }

        const longUrl = req.body.longUrl

        if (!longUrl) {
            return res.status(400).send({ status: false, message: "Long Url is required" })
        }

        let validLongUrl = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%\+.~#?&//=]*)/.test(longUrl.trim()))
        if (!validLongUrl) {
            return res.status(400).send({ status: false, msg: "Please provide a valid longUrl" })
        }

        let duplicateLongUrl = await urlModel.findOne({ longUrl })
        if (duplicateLongUrl) {
            return res.status(400).send({ status: false, message: "This LongUrl already exists", data: duplicateLongUrl })
        }

        const urlCode = shortid.generate().toLowerCase()

        const shortUrl = baseUrl + '/' + urlCode

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
        return res.status(201).send({ status: true, data: urlDetails })

    } catch (error) {
        return res.status(500).send({ status: true, message: "error.message" })
    }
}


const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode

        let findUrl = await urlModel.findOne({ urlCode: urlCode })
        if (!findUrl)
            return res.status(404).send({ status: false, message: 'URL not found.' })

        res.status(200).send({ status: true, message: 'Redirecting to Original URL.', data: findUrl.longUrl })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}



module.exports = { createShortUrl, getUrl }