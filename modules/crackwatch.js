const request = require('request')
const cheerio = require('cheerio')
const CONFIG = require('../config.json')

const CrackWatch = class {
  constructor () {
    this.check = callback => {
      request.get({url: 'http://predb.me/?cats=games-pc', headers: CONFIG.headers}, (err, response, body) => {
        err && console.error(err)
        response && console.info('predb.me statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)

        $('.content .post').each((i, e) => {
          let timeNow = Math.floor(Date.now() / 1000)

          let release = {}
          release.id = $(e).attr('id')
          release.time = parseInt($(e).find('.p-time').attr('data'))
          release.title = $(e).find('.p-title').text()
          release.href = $(e).find('.p-title').attr('href')
          release.age = Math.floor(timeNow - release.time)
          release.group = $(e).find('.t-g').text()

          if (release.age <= CONFIG.timeout) {
            callback(release)
          }
        })
      })
    }

    this.info = (id, callback) => {
      request.get({url: `http://predb.me/?post=${id}&jsload=1`, headers: CONFIG.headers}, (err, response, body) => {
        err && console.error(err)
        response && console.info('jsload statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        const $ = cheerio.load(body)
        let info = {}
        info.Rlsname = $('.pb-c:contains(Rlsname)').next().text()
        info.group = $('.pb-c:contains(Group)').next().text()
        info.size = $('.pb-c:contains(Size)').next().text()
        info.genres = $('.pb-c:contains(Genres)').next().text()
        info.tags = $('.pb-c:contains(Tags)').next().text()

        request.get(`https://api.xrel.to/v2/release/info.json?dirname=${info.Rlsname}`, (err, response, body) => {
          info.xrel = JSON.parse(body)
          info.xrel.error && console.error('xrel error:'.red, info.xrel.error_description, info.Rlsname.grey)
          callback(info)
        })
      })
    }
  }
}

module.exports = new CrackWatch()
