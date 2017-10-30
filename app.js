const irc = require('irc')
const text2png = require('text2png')
const imgurUploader = require('imgur-uploader')
const Snoowrap = require('snoowrap')
const layer13 = require('./modules/layer13')
const CONFIG = require('./config.json')

require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
    stamp: 'grey',
    label: 'grey'
  }
})
require('colors')

const recheckNfo = (release, count) => {
  console.log('Rechecking for nfo', release.title)
  layer13.scrap(release.info13.id, scrap13 => {
    release.scrap13 = scrap13
    imgurPost(release, release => {
      if (release.imgur) {
        console.log('Updating Post', release.title)
        r.getSubmission(release.submission.name)
        .edit(release.text + (release.imgur ? `**NFO file**: [imgur](${release.imgur.link})` : ''))
      } else {
        if (count < 5) {
          console.log('No nfo found; retry in 30sec'.grey, release.title.grey)
          setTimeout(() => { recheckNfo(release, ++count) }, 30 * 1000)
        } else {
          console.log('No nfo found; timeout'.red, release.title.grey)
        }
      }
    })
  })
}

const r = new Snoowrap(CONFIG.snoowrap['0'])
const redditPost = release => {
  release.text = (`**Release Name**: ${release.title}\n\n` +
  `**Released by**: ${release.group}\n\n` +
  (release.scrap13.size ? `**Size**: ${release.scrap13.size}\n\n` : '') +
  (release.scrap13.storehref ? `**Buy**: [link](${release.scrap13.storehref})\n\n` : '') +
  (release.info13 ? `**Layer13 id**: [${release.info13.id}](${release.info13.href})\n\n` : '')) +
  (release.imgur ? `**NFO file**: [imgur](${release.imgur.link})` : '')

  r.getSubreddit(CONFIG.subreddit[CONFIG.mode])
  .submitSelfpost({
    title: release.title,
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
      setTimeout(() => { recheckNfo(release, 1) }, 30 * 1000)
    }
  })
}

const imgurPost = (release, callback) => {
  if (release.scrap13.nfo !== '') {
    imgurUploader(text2png(release.scrap13.nfo + `\n\n\n\nnfo image rendered by crackwatch-bot.js\nwww.github.com/JohnDeved/crackwatch-bot.js`, CONFIG.text2png), {title: release.title}).then(data => {
      release.imgur = data
      console.info('Posted on Imgur'.green, release.imgur.link.grey)
      callback(release)
    })
  } else {
    console.log('skipping imgur post'.grey, release.title.grey)
    callback(release)
  }
}

const finalize = release => {
  layer13.lookup(release.title, info13 => {
    release.info13 = info13
    layer13.scrap(release.info13.id, scrap13 => {
      release.scrap13 = scrap13
      imgurPost(release, redditPost)
    })
  })
}

const precheck = (from, to, message) => {
  if (from !== CONFIG.irc.sender) { return }
  if (to !== CONFIG.irc.channel) { return }
  message = message.replace(/[\x02\x1F\x0F\x16]|\x03(\d\d?(,\d\d?)?)?/g, '')
  let [, section, title, group] = message.match(/\[ PRE \] \[ ?(.+) \] - (.+-(.+))/)

  let release = {
    section: section,
    title: title,
    group: group
  }

  console.log('Pre:'.grey, section.grey, release.title.grey)

  if (CONFIG.groups.indexOf(release.group) !== -1) {
    console.log('Release found!'.green, release.group)
    if (CONFIG.sections.indexOf(release.section) !== -1) {
      console.log('Section:', release.section)
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
      if (CONFIG.mode === 'debug') {
        finalize(release)
      }
    }
  }
}
let client = new irc.Client(CONFIG.irc.server, CONFIG.irc.nickname, CONFIG.irc.options)
client.addListener('error', message => console.log('irc error: '.red, message))
client.addListener('registered', msg => console.log('Connected to', msg.server.green))
client.addListener('message', precheck)

console.log('Mode:', CONFIG.mode.green, 'Subreddit:', CONFIG.subreddit[CONFIG.mode], 'Reddit-User:', CONFIG.snoowrap['0'].username)
