if (window.location.hash !== '') {
  $.get('ajax/test.html', function (data) {
    $('.result').html(data)
    alert('Load was performed.')
  })
} else {
  window.history.back()
}
