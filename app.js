const snoowrap = require('snoowrap')
const text2png = require('text2png')
const imgurUploader = require('imgur-uploader')
const preDb = require('./modules/preDb')
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
global.checked = []

const r = new snoowrap(CONFIG.snoowrap['0'])
const redditPost = release => {
  r.getSubreddit('CrackWatch')
  .submitSelfpost({
    title: release.title,
    text:
   (`**Release Name**: ${release.info.Rlsname}\n\n` +
   `**Cracked by**: ${release.info.group}\n\n` +
   (release.info.size !== '···' ? `**Release Size**: ${release.info.size}\n\n` : '') +
   (() => { if (release.info.size === '···' && release.scrap13.size) { return `**Release Size**: ${release.scrap13.size}\n\n` } else { return '' } })() +
   (release.info.tags !== '···' ? `**Release Tags**: ${release.info.tags}\n\n` : '') +
   (release.info.genres !== '' ? `**Release Genres**: ${release.info.genres}\n\n` : '') +
   `**PreDB id**: [${release.id}](${release.href})\n\n` +
   (release.info13 ? `**Layer13 id**: [${release.info13.id}](${release.info13.href})\n\n` : '') +
   (release.imgur ? `**NFO file**: [imgur](${release.imgur.link})\n\n` : '') +
   (release.scrap13.storehref ? `**Buy**: [link](${release.scrap13.storehref})` : ''))
  })
  .then(submission => {
    console.info('Posted on Reddit'.green, submission.name.grey)
    r.getSubmission(submission.name)
    .getLinkFlairTemplates()
    .then(flairs => {
      let flair = flairs.find(e => e.flair_text === 'Release')
      if (flair !== []) {
        r.getSubmission(submission.name)
        .selectFlair({flair_template_id: flair.flair_template_id})
      }
    })
  })
}

const imgurPost = release => {
  if (release.scrap13.nfo !== '') {
    imgurUploader(text2png(release.scrap13.nfo + `\n\n\n\nnfo image rendered by crackwatch-bot.js\n-github.com/JohnDeved/crackwatch-bot.js`, CONFIG.text2png), {title: release.title}).then(data => {
      release.imgur = data
      console.info('Posted on Imgur'.green, release.imgur.link.grey)
      redditPost(release)
    })
  } else {
    console.log('no nfo file found; skipping imgur post'.grey, release.title.grey)
    redditPost(release)
  }
}

const releaseCheck = release => {
  // console.log(release)
  // todo: clean this up :o
  if (['FiX', 'UPDATE'].indexOf(release.info13.section) === -1) {
    if (!/(x264|x265|720p|1080p)/i.test(release.title)) {
      if (!/(Linux|MacOS)/i.test(release.title)) {
        if (CONFIG.groups.indexOf(release.info.group) !== -1) {
          imgurPost(release)
        } else {
          console.error('disallowed Release Group:'.red, release.info.group)

          // maybe scrap uncracked denuvo games from wikipedia or other sites?
          if (/(Assassin|Creed|Origins)/i.test(release.title)) {
            // if Origins post anyway ;)
            console.info('important release; bypassing group restriction'.green)
            imgurPost(release)
          }
        }
      } else {
        console.error('disallowed Platform:'.red, release.title)
      }
    } else {
      console.error('Somebody that isnt me fucked up (catmixup):'.red, release.title)
    }
  } else {
    console.error('Fix, Update or Patch Releases are Not allowed:'.red, release.title)
  }
}

const update = () => {
  console.info('----------------------------'.grey)
  console.info('checking for new Releases'.grey)
  console.info('(every'.grey, CONFIG.timeout, 'seconds)'.grey)
  console.info('----------------------------'.grey)
  preDb.checkScrap(release => {
    console.info('Release found:'.green, release.title.white, release.id.grey, release.href.grey)
    preDb.info(release.id, info => {
      release.info = info
      layer13.lookup(release.title, info13 => {
        release.info13 = info13
        layer13.scrap(release.info13.id, scrap13 => {
          release.scrap13 = scrap13
          releaseCheck(release)
        })
      })
    })
  })
}
setInterval(update, CONFIG.timeout * 1000)
update()
