const snoowrap = require('snoowrap')
const preDb = require('./modules/crackwatch')
const CONFIG = require('./config.json')

require('console-stamp')(console, {
  pattern: 'dd/mm/yyyy HH:MM:ss.l',
  colors: {
    stamp: 'grey',
    label: 'grey'
  }
})
require('colors')

const r = new snoowrap(CONFIG.snoowrap)
const redditPost = release => {
  r.getSubreddit('CrackWatch')
  .submitSelfpost({
    title: release.title,
    text:
   `**Release Name**:${release.info.Rlsname}\n\n` +
   `**Cracked by**: ${release.info.group}\n\n` +
   `**Release Size**: ${release.info.size}\n\n` +
   `**Release Genres**: ${release.info.genres}\n\n` +
   `**Release Tags**: ${release.info.tags}\n\n` +
   `**PreDB id**: [${release.id}](${release.href})\n\n` +
   `**NFO file**: [link](https://johndeved.github.io/crackwatch-bot.js/#${release.info.Rlsname}) (will link to nfo image once it is available)`
  })
  .then(submission => {
    console.info('Posted on Reddit'.green, submission.name)
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

const update = () => {
  console.info('----------------------------'.grey)
  console.info('checking for new Releases'.grey)
  console.info('(every'.grey, CONFIG.timeout, 'seconds)'.grey)
  console.info('----------------------------'.grey)
  preDb.check(release => {
    console.info('Release found:'.green, release.title.white, release.id.grey, release.href.grey)
    preDb.info(release.id, info => {
      release.info = info
      if (!/(BDRip|BluRay|x264|x265|720p|1080p|HDTV|)/i.test(release.title)) {
        if (!/(Linux|MacOS)/i.test(release.title)) {
          if (CONFIG.groups.indexOf(release.info.group) !== -1) {
            redditPost(release)
          } else {
            console.error('disallowed Release Group:'.red, release.info.group)

            // maybe scrap uncracked denuvo games from wikipedia or other sites?
            if (/(Assassin|Creed|Origins)/i.test(release.title)) {
              // if Origins post anyway ;)
              console.info('important release; bypassing group restriction'.green)
              redditPost(release)
            }
          }
        } else {
          console.error('disallowed Platform:'.red, release.title)
        }
      } else {
        console.error('Catmixup:'.red, release.title)
      }
    })
  })
}
setInterval(update, CONFIG.timeout * 1000)
update()
