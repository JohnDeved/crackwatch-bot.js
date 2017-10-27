if (window.location.hash !== '') {
  var hash = window.location.hash.substr(1)
  $.get('https://api.xrel.to/v2/release/info.json?dirname=' + hash, function (data) {
    console.log(data)
    if (data.error) {
      $('.msg').html('nfo not available yet!')
    } else {
      window.location.href = data.link_href
    }
  })
} else {
  window.history.back()
}
