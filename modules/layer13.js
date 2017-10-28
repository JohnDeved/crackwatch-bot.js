const request = require('request')
const CONFIG = require('../config.json')

const Layer13 = class {
  constructor () {
    this.lookup = (title, callback) => {
      request.get(`http://api.layer13.net/v1/?getpre=${title}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        err && console.error(err)
        response && console.info('layer13 getpre statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        let data = JSON.parse(body)
        data.error && console.error(data)
        callback(data)
      })
    }

    this.listfiles = (id, callback) => {
      request.get(`http://api.layer13.net/v1//?listfiles=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        err && console.error(err)
        response && console.info('layer13 listfiles statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        let data = JSON.parse(body)
        data.error && console.error(data)
        callback(data)
      })
    }

    this.getfile = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfile=${id}&filename=${filename}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        err && console.error(err)
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(data)
      })
    }

    this.getfilessize = (id, filename, callback) => {
      request.get(`http://api.layer13.net/v1//?getfilessize=${id}&key=${CONFIG.layer13.apiKey}`, (err, response, body) => {
        err && console.error(err)
        response && console.info('layer13 getfile statusCode:'.grey, response.statusCode, response.statusMessage.grey)
        callback(data)
      })
    }
  }
}

module.exports = new Layer13()
