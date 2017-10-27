if (window.location.hash !== '') {
  var hash = window.location.hash.substr(1)
  $.get('https://api.xrel.to/v2/release/info.json?dirname=' + hash, function (data) {
    console.log(data)
    if (data.error) {
      console.log('nfo not available yet!')
    } else {
      $.get(data.link_href, function (data) {
        console.log(data)
      })
    }
  })
} else {
  window.history.back()
}
