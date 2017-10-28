const request = require('request')
const CONFIG = require('../config.json')

const Layer13 = class {
  constructor () {
    this.lookup = (title, callback) => {
      request.get(`http://api.layer13.net/v1/?getpre=${title}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 getpre statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        let data
        try {
          data = JSON.parse(body)
        } catch (error) {
          return {error: 'json parse fail'}
        }
        data.error && console.error(data)
        callback(data)
      })
    }

    this.listfiles = (id, callback) => {
      request.get(`http://api.layer13.net/v1//?listfiles=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 listfiles statusCode:'.grey, response.statusCode, response.statusMessage.grey)

        let data
        try {
          data = JSON.parse(body)
        } catch (error) {
          return {error: 'json parse fail'}
        }
        data.error && console.error(data)
        callback(data)
      })
    }

    this.getfile = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfile=${id}&filename=${filename}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(body)
      })
    }

    this.getfilessize = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfilessize=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        if (err) { return console.error(err) }
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(body)
      })
    }
  }
}

module.exports = new Layer13()
