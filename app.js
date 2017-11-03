const irc = require('irc')
const text2png = require('text2png')
const imgurUploader = require('imgur-uploader')
const Snoowrap = require('snoowrap')
const program = require('commander')
const igdb = require('igdb-api-node').default
const layer13 = require('./modules/layer13')
const srrdb = require('./modules/srrdb')
global.CONFIG = require('./config/cfg.json')

require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
    stamp: 'grey',
    label: 'grey'
  }
})
require('colors')

const ircclient = new irc.Client(CONFIG.irc.server, CONFIG.irc.nickname, CONFIG.irc.options)
const igdbClient = igdb(CONFIG.igdb.apiKey)

program.version('0.1.0')
.option('-d --debug', 'debug mode')
.option('-t --test', 'test mode')
.parse(process.argv)

if (program.debug) { CONFIG.mode = 'debug' }

const redditText = release => {
  return `**Release Name**: ${release.title}\n\n` +
  `**Released by**: ${release.group}\n\n` +
  ((() => {
    if (release.scrap13) {
      return (release.scrap13.size ? `**Size**: ${release.scrap13.size.toLowerCase()}\n\n` : '')
    } else {
      return ''
    }
  })()) +
  (release.os ? `**OS**: ${release.os}\n\n` : '') + '&nbsp;\n\n' +
  ((() => {
    if (release.igdb) {
      return (release.igdb.url ? `**Game Name**: ${release.igdb.name}\n\n` : '') +
      (release.igdb.popularity ? `**Popularity**: ${release.igdb.popularity}\n\n` : '') +
      (release.igdb.videos ? `**Video**: [${release.igdb.videos[0].name}](https://www.youtube.com/watch?v=${release.igdb.videos[0].video_id})\n\n` : '') +
      ((() => {
        if (release.scrap13) {
          return (release.scrap13.storehref ? `**Buy**: ${release.scrap13.storehref}\n\n` : '')
        }
      })()) +
      (release.igdb.url ? `**IGDB**: ${release.igdb.url}\n\n` : '') + '&nbsp;\n\n'
    } else {
      if (release.scrap13) {
        return (release.scrap13.storehref ? `**Buy**: ${release.scrap13.storehref}\n\n` : '')
      } else {
        return ''
      }
    }
  })()) +
  (release.info13 ? `**Layer13**: ${release.info13.href}\n\n` : '') +
  (release.imgur ? `**NFO img**: [${release.title}.png](${release.imgur.link})` : `**NFO img**: [${release.title}.png](https://scnlog.eu/nfo?rls=${release.title})`) + '\n\n' +
  (release.info13 ? `**NFO file**: [${release.title}.nfo](https://www.srrdb.com/release/details/${release.title})\n\n` : '') + '\n\n&nbsp;\n\n' +
  `^^this ^^post ^^was ^^made ^^${release.benchmark}sec ^^after ^^pre`
}

const checkNfo = (release, count) => {
  console.log(`[${count}] (Re)checking for nfo`.grey, release.title.grey)
  layer13.scrap(release.info13.id, scrap13 => {
    release.scrap13 = scrap13
    srrdb.nfo(release.title, nfo => {
      release.nfo = nfo
      imgurPost(release, release => {
        if (release.imgur) {
          console.log('Updating Post'.green, release.title.grey)
          release.text = redditText(release)
          r.getSubmission(release.submission.name)
        .edit(release.text)
        } else {
          if (count < 5) {
            console.log('No nfo found; retry in 60sec'.red, release.title.grey)
            console.log('Updating Post'.green, release.title.grey)
            release.text = redditText(release)
            r.getSubmission(release.submission.name)
          .edit(release.text)
            setTimeout(() => checkNfo(release, ++count), 60 * 1000)
          } else {
            console.log('No nfo found; timeout'.red, release.title.grey)
          }
        }
      })
    })
  })
}

const r = new Snoowrap(CONFIG.snoowrap['0'])
const redditPost = release => {
  release.benchmark = (Date.now() - release.date) / 1000
  console.info(release.name.grey, 'done in'.grey, release.benchmark, 'sec'.grey)
  release.text = redditText(release)
  r.getSubreddit(CONFIG.subreddit[CONFIG.mode])
  .submitSelfpost({
    title: (release.os ? `[${release.os}] ` : '') + release.title,
    text: release.text
  })
  .then(submission => {
    release.submission = submission
    console.info('Posted on Reddit'.green, release.submission.name.grey)

    if (CONFIG.mode === 'live') {
      r.getSubmission(release.submission.name)
      .getLinkFlairTemplates()
      .then(flairs => {
        let flair = flairs.find(e => e.flair_text === 'Release')
        if (flair.flair_template_id) {
          r.getSubmission(release.submission.name)
          .selectFlair({flair_template_id: flair.flair_template_id})
        }
      })
    }

    if (!release.imgur) {
      layer13.lookup(release.title, info13 => {
        release.info13 = info13
        checkNfo(release, 1)
      })
    }
  })
}

const imgurPost = (release, callback) => {
  if (release.nfo) {
    imgurUploader(text2png(release.nfo + `\n\n\n\nnfo image rendered by\nJustSpeedy's aka JohnDev's crackwatch-bot`, CONFIG.text2png), {title: release.title}).then(data => {
      release.imgur = data
      console.info('Posted on Imgur'.green, release.imgur.link.grey)
      callback(release)
    })
  } else {
    if (release.scrap13) {
      if (release.scrap13.nfo !== '') {
        imgurUploader(text2png(release.scrap13.nfo + `\n\n\n\nnfo image rendered by\nJustSpeedy's aka JohnDev's crackwatch-bot`, CONFIG.text2png), {title: release.title}).then(data => {
          release.imgur = data
          console.info('Posted on Imgur'.green, release.imgur.link.grey)
          callback(release)
        })
      } else {
        callback(release)
      }
    } else {
      console.log('skipping Imgur post'.grey, release.title.grey)
      return callback(release)
    }
  }
}

const finalize = release => {
  if (CONFIG.sections.indexOf(release.section) !== -1) {
    igdbClient.games({
      search: release.name,
      fields: '*',
      limit: 1
    }).then(response => {
      if (response.body.length !== 0) {
        release.igdb = response.body[0]
        if (!release.igdb.popularity) { return console.log('game isnt popular enough! [NULL]'.red, release.igdb.url) }
        if (release.igdb.popularity < 1.5) { return console.log(`game isnt popular enough! [${release.igdb.popularity}]`.red, release.igdb.url) }
        console.log('igdb'.green, release.igdb.url.grey)
        imgurPost(release, redditPost)
      } else {
        console.error('nothing found on igdb'.red, release.name)
      }
    }).catch(error => {
      console.error(error)
      imgurPost(release, redditPost)
    })
  } else {
    console.error('wrong section? you must be debugging'.red, release.section)
    imgurPost(release, redditPost)
  }
}

const precheck = (from, to, message) => {
  message = message.replace(/[\x02\x1F\x0F\x16]|\x03(\d\d?(,\d\d?)?)?/g, '')
  if (/^\[NFO\]- /.test(message)) { return console.log(message.grey) }
  if (/^\[NUKE\]/.test(message)) { return console.log(message.red) }
  if (/^\[UNNUKE\]/.test(message)) { return console.log(message.yellow) }
  if (!/\[PRE\] \[?(.+)\] ((.+)-(.+))/.test(message)) { return /* console.error('msg syntax error:'.red, message) */ }
  let [, section, title, name, group] = message.match(/\[PRE\] \[?(.+)\] ((.+)-(.+))/)

  let release = {
    section: section,
    title: title,
    name: name,
    group: group.toUpperCase(),
    date: Date.now()
  }

  if (/\.Linux|\.MacOSX/.test(release.name)) {
    if (/\.MacOSX/.test(release.name)) {
      release.os = 'MacOSX'
    } else {
      release.os = 'Linux'
    }
    release.name = release.name.replace(/\.Linux|\.MacOSX/, '')
  }

  console.log('Pre:'.grey, section.grey, release.name.grey, release.group.grey)

  if (CONFIG.groups.indexOf(release.group) !== -1) {
    console.log('Release found!'.green, release.group)
    if (CONFIG.sections.indexOf(release.section) !== -1) {
      console.log('Section:'.green, release.section)
      if (!/UPDATE/i.test(release.title)) {
        finalize(release)
      } else {
        console.log('Updates are not Allowed!'.red)
      }
    } else {
      console.log('Disallowed Section:'.red, section)
    }
  } else {
    if (CONFIG.sections.indexOf(release.section) !== -1) {
      if (/assassin.*creed.*origins/i.test(release.title)) {
        console.log('Important Release found!'.green, release.group)
        if (!/UPDATE/i.test(release.title)) {
          finalize(release)
        } else {
          console.log('Updates are not Allowed!'.red)
        }
      }
    } else {
      if (CONFIG.done) { return }
      if (CONFIG.mode === 'debug' && program.test) {
        CONFIG.done = true
        finalize(release)
      }
    }
  }
}
ircclient.addListener('error', message => console.log('irc error: '.red, message))
ircclient.addListener('registered', msg => console.log('Connected to', msg.server.green))
ircclient.addListener('message', precheck)

console.log('Mode:', CONFIG.mode.green, 'Subreddit:', CONFIG.subreddit[CONFIG.mode], 'Reddit-User:', CONFIG.snoowrap['0'].username)
if (CONFIG.mode === 'debug' && !program.test) { precheck(CONFIG.irc.sender, CONFIG.irc.channel, CONFIG.test[Math.floor(Math.random() * CONFIG.test.length)]) }
