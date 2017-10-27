const request = require('request')
const cheerio = require('cheerio')
const snoowrap = require('snoowrap')
const CONFIG = require('config.js')

require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
    stamp: 'grey',
    label: 'grey'
  }
})
require('colors')

const r = new snoowrap(CONFIG.snoowrap)

const checkPreDb = callback => {
  request.get({
    url: 'http://predb.me/?cats=games-pc',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      'Upgrade-Insecure-Requests': '1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'http://predb.me/'
    }},
  (err, response, body) => {
    err && console.error(err)
    response && console.info('predb.me statusCode:'.grey, response.statusCode, response.statusMessage.grey)
    // console.log(body)

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

      // console.log(release.age, CONFIG.timeout / 1000)
      if (release.age <= CONFIG.timeout / 1000) {
        callback(release)
      }
    })
  })
}

const getPreDbinfo = (id, callback) => {
  // http://predb.me/?post=6543345&jsload=1
  request.get({
    url: `http://predb.me/?post=${id}&jsload=1`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      'Upgrade-Insecure-Requests': '1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Referer': 'http://predb.me/'
    }},
  (err, response, body) => {
    err && console.error(err)
    response && console.info('jsload statusCode:'.grey, response.statusCode, response.statusMessage.grey)
    // console.log(body)

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

      // console.log(info)
      callback(info)
    })
  })
}

const redditPost = release => {
  r.getSubreddit('CrackWatch')
  .submitSelfpost({
    title: release.title,
    text:
`**Release Name**:${release.info.Rlsname}\n
**Cracked by**: ${release.info.group}\n
**Release Size**: ${release.info.size}\n
**Release Genres**: ${release.info.genres}\n
**Release Tags**: ${release.info.tags}\n
**PreDB id**: ${release.id}`

  }).then(submission => {
    r.getSubmission(submission.name)
    .getLinkFlairTemplates().then(flairs => {
      let flair = flairs.find(e => e.flair_text === 'Release')
      if (flair !== []) {
        r.getSubmission(submission.name)
        .selectFlair({flair_template_id: flair.flair_template_id})
      }
    })
  })
}

const updatePreDb = () => {
  console.info('----------------------------'.grey)
  console.info('checking for new Releases'.grey)
  console.info('(every'.grey, CONFIG.timeout / 1000, 'seconds)'.grey)
  console.info('----------------------------'.grey)
  checkPreDb(release => {
    console.info('Release found:'.green, release.title.white, release.id.grey, release.href.grey)
    getPreDbinfo(release.id, info => {
      release.info = info
      if (CONFIG.groups.indexOf(release.info.group) !== -1) {
        if (!/(BDRip|BluRay|x264|x265|720p|1080p|HDTV)/.test(release.title)) {
          redditPost(release)
        } else {
          console.error('Catmixup:'.red, release.title)
        }
      } else {
        console.error('Not allowed Group:'.red, release.info.group)
      }
    })
  })
  timeout(CONFIG.timeout)
}
const timeout = time => setTimeout(updatePreDb, time)
updatePreDb()
